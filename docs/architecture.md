# Architecture & decisions

Why this codebase is the way it is. Written to be defended out loud: each decision
carries the alternative it beat and what it costs.

Read this *after* trying to answer the questions yourself — it is much easier to
recognise a good answer than to produce one, and an interview asks you to produce one.

---

## The shape

19 endpoints across four resources, layered:

```
Controllers/    HTTP only: bind, delegate, return. No rules live here.
Services/       Business rules, behind interfaces, one per resource.
Data/           DbContext, entity configurations, migrations.
Models/         Domain entities: private setters, real constructors.
DTO/            Request and response contracts, and the mapping between them.
Exceptions/     Domain exceptions mapped to ProblemDetails.
```

Requests flow one direction: controller → service → `DbContext`. There is no
repository layer. EF Core's `DbSet<T>` is already a repository over `IQueryable`;
wrapping it in another interface that returns `IEnumerable` would throw away query
composition — the paging and filtering in `GetAllAsync` build one SQL statement
precisely because the service holds an `IQueryable`.

**Cost:** the services are coupled to EF Core, so swapping the ORM means rewriting
them, and unit-testing a service in isolation means faking a `DbContext`. Both are
accepted: the tests go through HTTP against a real database instead.

---

## 1. The overlap rule is a database constraint

**Rule:** two non-cancelled reservations for the same facility may not overlap.

`ReservationService.EnsureSlotIsFreeAsync` queries for a conflict, then
`SaveChangesAsync` writes. Between those two statements another request can do the
same thing, and both pass. Classic time-of-check to time-of-use.

**Why a transaction does not fix it.** Under PostgreSQL's default Read Committed
isolation, the check sees rows committed before it ran. The competing transaction's
row is not committed yet, so it is invisible — then both commit. Nothing was violated
from either transaction's point of view. `SERIALIZABLE` would detect it and abort one,
at the price of retry logic on every write path.

**What is there instead** (`AddReservationOverlapExclusionConstraint`):

```sql
ALTER TABLE "Reservations" ADD CONSTRAINT "EX_Reservations_NoOverlap"
  EXCLUDE USING gist (
    "FacilityId" WITH =,
    tstzrange("StartTime", "EndTime", '[)') WITH &&
  ) WHERE ("Status" <> 'Cancelled');
```

An exclusion constraint generalises `UNIQUE`: instead of "no two rows equal on these
columns", it is "no two rows where these operators both return true" — here, same
facility *and* overlapping time range. It is enforced at write time by an index, so
two concurrent inserts cannot both win. `btree_gist` supplies the `=` operator class
GiST needs for the plain `FacilityId` column.

Details that matter:

- `'[)'` makes the range half-open, so a booking ending at 12:00 and one starting at
  12:00 do not collide. This matches the strict `<` / `>` comparison in the service.
- The `WHERE` clause makes it partial, so cancelled reservations release their slot.

**Why keep the service check too?** It is a fast path with a better message, and it
handles the common case without a round trip to a failed insert. The database is the
authority; the service is the courtesy. Deleting the service check makes no test fail —
the constraint carries it.

**What this replaced.** A unique index on `(FacilityId, StartTime, EndTime)`, which
enforced the wrong rule: it caught only byte-identical time pairs, never actual
overlaps, and ignored `Status`, so rebooking a cancelled slot hit the index and
surfaced as a 500.

---

## 2. Two identifiers per entity

`Reservation` has `Id` (a `Guid`, the primary key) and `ReservationId` (`RES-XXXXXXXX`).
`User` has `Id` and `KfupmId`. `Facility` has `Id` and `FacilityId`.

The surrogate key is stable and meaningless; the natural key is the real-world
identifier people use. Foreign keys point at the **natural** key, via
`HasPrincipalKey`:

```csharp
builder.HasOne(r => r.User).WithMany(u => u.Reservations)
    .HasForeignKey(r => r.UserId)
    .HasPrincipalKey(u => u.KfupmId);
```

**The trade.** `Reservations.UserId` holds `"202300001"` rather than an opaque Guid, so
the table is readable and a query by KFUPM id needs no join. The cost is that the FK
column is a `varchar(20)` rather than a 16-byte `uuid`, and — the real cost — the
principal key becomes immutable in practice. Changing a `KfupmId` that reservations
reference is not a rename; the dependents are left pointing at a value that no longer
exists, and PostgreSQL rejects it as a foreign key violation. That surfaced as a 500
until `UserService.UpdateAsync` was made to reject the change with a 409, and `KfupmId`
was removed from `User.Update` entirely so the domain model cannot express it.

**Deletes:** `Restrict` everywhere except participants of a reservation, which
`Cascade` — deleting a booking should take its attendee list with it, but deleting a
user who has bookings should fail loudly rather than silently erase history.

**Enums** are stored as strings (`HasConversion<string>`), so the database is readable
and reordering an enum member cannot silently reassign existing rows.

---

## 3. Responses are projected in SQL

Each DTO class exposes an expression:

```csharp
public static readonly Expression<Func<Reservation, ReservationResponse>> Projection =
    reservation => new ReservationResponse { /* … */ FacilityName = reservation.Facility.Name };

private static readonly Func<Reservation, ReservationResponse> Map = Projection.Compile();
public static ReservationResponse ToResponse(this Reservation r) => Map(r);
```

**Why an `Expression` and not a method.** `IQueryable.Select` takes an expression tree,
which EF inspects and translates to SQL. A method body is opaque to it — EF cannot see
inside `ToResponse()`, so it either fails to translate or silently pulls whole entities
into memory and runs the mapping client-side. Writing it as an expression and compiling
it once gives one mapping usable in both places.

`GET /api/reservations` now issues a single query selecting eleven columns across two
inner joins and materialises no entities. Previously it loaded each reservation plus its
facility and user through `Include`, then copied two names out of them.

---

## 4. Paging

Every list endpoint returns `PagedResult<T>` — `items`, `page`, `pageSize`,
`totalCount`, `totalPages`. Paging is always on (default 25, max 100), not opt-in,
because an endpoint that returns everything is fine right up until the table is large,
and by then the clients that assume they get everything are already written.

**Offset, not keyset.** `Skip`/`Take` is `LIMIT`/`OFFSET`. It gets slower the deeper you
page, because the database still walks the skipped rows — irrelevant at thousands of
rows, and it buys the ability to jump to page 5, which keyset cursors cannot do. At
millions of rows, or an infinite scroll, keyset would be the right call.

**The subtlety worth knowing.** Offset paging is only correct if the sort key is
*unique*. Order users by name alone and rows with equal names have no defined order, so
the database may return them differently between two queries — a row appears on both
pages, or on neither. Hence `.OrderBy(u => u.Name).ThenBy(u => u.Id)` everywhere. There
is a test that pages through twelve users deliberately sharing one name.

Filters compose rather than short-circuit. `userId` and `facilityId` used to be checked
in sequence, so asking for one user's bookings at one facility silently returned all of
that user's bookings everywhere.

---

## 5. Validation lives in two layers deliberately

- **Shape** — required, length, range, email format — is DataAnnotations on the request
  DTOs. `[ApiController]` turns a failure into a `400` with a `ValidationProblemDetails`
  body before any service runs.
- **Business rules** — end after start, facility restrictions, legal status transitions —
  live in the service, because they cannot be expressed as an attribute on one property.

Three services used to repeat the shape checks by hand. That code never ran for an HTTP
caller and was deleted; tests covering the annotation behaviour were written first and
pass unchanged, which is what makes the deletion safe rather than hopeful.

**Status transitions** are a state machine: `Pending → Confirmed → Cancelled`, staying
put is fine, cancellation is final. Reviving a cancelled reservation would double-book,
since cancelling released the slot.

---

## 6. Errors

Domain exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`) are
thrown by services and mapped centrally by `ApiExceptionHandler` (an `IExceptionHandler`)
to RFC 7807 `ProblemDetails`. Constraint violations from PostgreSQL — SQLSTATE `23P01`
exclusion, `23505` unique — map to `409`, so a race that reaches the database reports the
same conflict the pre-check would have.

**Exceptions rather than a result type.** Result types make failure explicit in the
signature and avoid exceptions as control flow; the cost is threading `Result<T>` through
every layer and unwrapping at each. Exceptions here keep the service methods returning
the thing they produce, with one place that knows how failures become status codes. It
is a defensible choice either way — know why you picked it.

The handler writes through `IProblemDetailsService` rather than serialising itself.
That is what puts a `traceId` on the response matching the log entry.

---

## 7. Tests

71 integration tests. No unit tests, deliberately: the interesting behaviour is in the
interaction between the service, EF Core and PostgreSQL, and a mocked `DbContext` would
assert that the code calls the methods it calls — not that the rules hold.

**Against a real PostgreSQL, not the in-memory provider.** The overlap rule is a
database constraint. The in-memory provider has no exclusion constraints, no
`tstzrange`, no isolation levels — it would report a passing suite for a broken rule.
Each run creates and drops its own database; `TEST_POSTGRES_CONNECTION` aims it
elsewhere, and CI uses a `postgres:18` service container.

**The suite was checked for vacuity by mutation** — breaking the code on purpose to
confirm the right tests fail:

| Mutation | Result |
| --- | --- |
| Remove `ValidateFields` / `EnsureUserIsEligible` | exactly 4 rule tests fail |
| Remove the service's overlap pre-check | nothing fails — the constraint carries it |
| Drop the exclusion constraint | only the test asserting it exists fails |

That last row is the honest one: the 20-concurrent-requests test passes with the
constraint gone, because the pre-check usually wins the timing. It is a smoke test, not
proof the race is closed. The deterministic guard is the test asserting the constraint
exists in `pg_constraint`.

---

## 8. Operations

- **Health checks split by consequence.** A failed liveness check restarts the
  container; a failed readiness check only stops traffic. So `/health/live` checks
  *nothing* — checking the database there would mean a database blip restarts every
  instance and fixes nothing. `/health/ready` checks the database and returns `503`.
- **Request logging sits outside the exception handler.** Inside it, an exception
  unwinds past the logging middleware before the handler writes the real status, and
  every error is logged as a `200`. Middleware order is behaviour, not arrangement.
- **Headers and bodies are excluded from logs** — user data now, credentials later.
- **CORS origins come from configuration**, and Production refuses to start without
  them: a startup failure at deploy time beats a frontend that silently cannot reach
  its API.

---

## What is missing, and what you would do next

- **No authentication.** The largest gap, and the sharpest edge is not that writes are
  open: `CreateReservationRequest.UserId` comes from the request body, so a caller can
  book as anyone. The fix is that the acting user comes from the token and that field
  disappears. Ownership rules (a student cancels their own booking, an admin any) are
  resource-based authorization, not a role check — `[Authorize(Roles = "Admin")]` cannot
  express "your own".
- **Nothing deployed.** The app is configurable and containerised; choosing a host and
  provisioning a database is what remains.
- **No frontend tests.**
- **Known rough edges:** `Reservation` exposes `Status` as a settable field on the update
  DTO rather than `confirm`/`cancel` endpoints — that lands with auth, since the point of
  separate endpoints is separate policies.

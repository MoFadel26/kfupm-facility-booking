# ASP.NET Core 10 Web API — Learning & Build Plan

Two tracks run together:

- **Learn** — course material, watched at whatever speed the topic deserves.
- **Ship** — the deliverable in `ResourceManager.Api` that proves the topic stuck.

A Learn item is not done until its Ship item is. Each phase ends with self-check
questions: if you can't answer one without looking it up, that's the gap.

Order is deliberate. Tests come early so everything after them is safe to change,
and the two contract-breaking phases (security, paging) land before the frontend
is re-wired.

---

## Phase 0 — Orientation — DONE

Already in the repo, no work needed:

- [x] Solution, `.gitignore`, .NET 10 project targeting `net10.0`
- [x] DI + service layer behind interfaces (`Services/I*Service.cs`)
- [x] Configuration + user secrets (`UserSecretsId`, `ConnectionStrings:DefaultConnection`)
- [x] EF Core + Npgsql, migrations, entity configurations, seeding
- [x] Global error handling via `IExceptionHandler` → `ProblemDetails`
- [x] OpenAPI document + Scalar UI, CORS for the Vite frontend

Outstanding:

- [x] Rewrite `README.md` — states the business question, the domain rules, the
      overlap guarantee, and that authorization is intended but not yet enforced.

**Self-check:** Why does `AddControllers()` need `AddJsonOptions` for the enum
converter but `AddOpenApi()` doesn't? What is the lifetime difference between
`AddScoped` and `AddSingleton` for `AppDbContext`, and what breaks if you get it
wrong?

---

## Phase 1 — Minimal APIs (course focus)

The existing API is controller-based. Do **not** convert it — build a new slice
as minimal APIs so you learn the model by contrast, in the same running app.

### Learn
- [ ] "Building Minimal APIs in ASP.NET Core 10"
- [ ] Code Lab: Extending a Minimal API with CRUD Operations and Validation
- [ ] Read up on `TypedResults` vs `Results`, `[AsParameters]`, endpoint filters,
      and route groups (`MapGroup`) — the pieces courses tend to skim

### Ship
- [ ] Add `Endpoints/AvailabilityEndpoints.cs`: a minimal-API route group serving
      facility availability (free slots for a facility on a date). New feature,
      no overlap with the existing controllers.
- [ ] Return `TypedResults` so the OpenAPI doc is generated from the signature
      rather than from `[ProducesResponseType]` attributes
- [ ] Write one endpoint filter for validation and note what it replaces from the
      MVC pipeline (`[ApiController]`'s automatic 400)
- [ ] Write down, in `docs/`, three concrete differences you hit — not from the
      course, from your own code

**Self-check:** What does `[ApiController]` give you for free that a minimal API
endpoint has to do explicitly? Where does model binding differ between the two?
When would you *not* choose minimal APIs?

---

## Phase 2 — Testing & CI

Highest-value gap in the repo: zero tests, no CI. Doing this second means every
later phase has a safety net.

### Learn
- [ ] "Testing ASP.NET Core 10 Web APIs"
- [ ] Code Lab: Testing ASP.NET Core 10 Web APIs
- [ ] Read on `WebApplicationFactory<T>`, and on Testcontainers for .NET — the
      course likely uses in-memory or SQLite, which will not reproduce the
      Postgres behaviour Phase 4 depends on

### Ship
- [x] `ResourceManager.Api.Tests` project (xUnit)
- [x] `WebApplicationFactory` fixture against a real Postgres, overriding
      `ConnectionStrings:DefaultConnection`. Not Testcontainers — no Docker daemon
      on the dev machine — but a database created and dropped per run, aimed by
      `TEST_POSTGRES_CONNECTION`. Swapping in Testcontainers later touches only
      `ApiFixture`, no tests.
- [x] Handled the startup path: seeding moved out of `AppDbContext.OnConfiguring`
      into `DbSeeder`, called from `Program.cs` only under Development, so tests
      and production both start empty. Tests run under a `Testing` environment and
      truncate between cases.
- [ ] Tests pinning behaviour that already exists:
      - overlapping reservation → 409
      - `EndTime <= StartTime` → 400
      - gender/role restriction on a facility → 409 (`EnsureUserIsEligible`)
      - unknown facility or user on create → 404
      - **update a reservation's time with no other reservations present** —
        this exercises `EnsureSlotIsFreeAsync`'s `r.Id != excludeReservationId`
        with a null parameter; confirm EF's null semantics do what you expect
      All of the above are covered, 17 tests. Verified non-vacuous by mutation:
      disabling `ValidateFields` and `EnsureUserIsEligible` fails exactly the four
      rule tests; disabling the overlap pre-check fails nothing, because the
      database constraint carries it.
- [x] GitHub Actions workflow: restore, build, test on push and PR, against a
      `postgres:18` service container

**Self-check:** Why can't you test the overlap rule against
`UseInMemoryDatabase`? What is the difference between a test that asserts a 409
and a test that asserts *no second row was written*? Which of your tests would
still pass if `EnsureSlotIsFreeAsync` were deleted entirely?

---

## Phase 3 — Security (breaks the frontend contract)

The current hole is not "write endpoints are open." It is that
`CreateReservationRequest.UserId` comes from the request body — any caller can
book a room as any user.

### Learn
- [ ] "Implementing Authentication and Authorization"
- [ ] "Essentials: Securing, Versioning, Documenting, Deploying" (security parts)
- [ ] Read on the distinction courses usually blur: authentication (who),
      authorization policies (what), and resource-based authorization (whose)

### Ship
- [ ] JWT bearer authentication; decide where users and credentials live —
      `User` currently has no password or external identity field
- [ ] Take the acting user from the token claims, never from the request body.
      Remove `UserId` from `CreateReservationRequest`.
- [ ] Resource-based authorization: a student may cancel only their own
      reservation; an admin may act on any. `UserRole` already exists.
- [ ] Replace `UpdateReservationRequest.Status` with transition endpoints —
      `POST /api/reservations/{id}/confirm` and `/cancel` — each with its own
      policy. As written, a client can self-confirm its own pending booking.
      Half done ahead of auth: *which* transitions are legal is now enforced
      (`EnsureTransitionIsAllowed` — forward only, cancellation final), and the
      UI offers only legal moves. Still open is *who* may make them, which is
      what the endpoints and policies add.
- [x] Audited `User.Update`. A rename returned 500 from a foreign key violation.
      `KfupmId` and `FacilityId` are now immutable — removed from the entities'
      `Update` methods, and an attempted change is a 409.
- [ ] Update the frontend for the new auth flow and the removed `UserId` field

**Self-check:** Why is `[Authorize(Roles = "Admin")]` insufficient for "cancel
your own reservation"? What stops a valid token for user A from being used to act
as user B in your handlers? Where would you put the check so it can't be
forgotten on the next endpoint?

---

## Phase 4 — Data correctness & concurrency

Not in the original plan at all, and the most substantial backend problem in this
project.

### Learn
- [ ] EF Core: transactions, `SaveChanges` boundaries, and what a scoped
      `DbContext` does and doesn't isolate
- [ ] Optimistic concurrency in EF Core: `IsConcurrencyToken`, `xmin` on
      Postgres, `DbUpdateConcurrencyException`
- [ ] Postgres range types and exclusion constraints (`tstzrange`, `btree_gist`)
- [ ] Transaction isolation levels — specifically why Read Committed does not
      prevent this class of bug

### Ship
- [x] Fixed the reachable 500 (cancel a reservation, rebook the identical slot).
      Same change as the two items below — the unique index was the cause.
- [x] Dropped the unique index on `(FacilityId, StartTime, EndTime)`. It caught
      only exact duplicates, never overlaps, and it wrongly blocked rebooking a
      cancelled slot.
- [x] Closed the double-booking race with an exclusion constraint over
      `tstzrange("StartTime", "EndTime", '[)')` partial on `Status <> 'Cancelled'`,
      added by raw SQL in `AddReservationOverlapExclusionConstraint`.
      `EnsureSlotIsFreeAsync` stays as a fast path with a better message; the
      constraint is now the authority.
- [x] Mapped `DbUpdateException` → `PostgresException` 23P01/23505 to 409 in
      `ApiExceptionHandler`
- [x] Concurrency check committed. Note what it is worth: with the constraint
      dropped it still passes, because the service pre-check usually wins the
      timing. `The_overlap_rule_is_enforced_by_a_database_constraint` is the test
      that actually fails when the constraint goes missing.
- [x] Consolidated validation. `ValidateFields` is gone from all three services;
      annotations carry shape, and the services keep only rules annotations cannot
      express (`EnsureTimeRangeIsValid`). Tests pin the annotation behaviour first,
      so the deletion was provably behaviour-preserving.

**Self-check:** Why doesn't wrapping the check and the insert in a single
transaction fix the race at Read Committed? What does the database know that the
application can't? Which of your Phase 2 tests would have caught this?

---

## Phase 5 — Contracts: paging, filtering, documentation

Second contract break. Do the frontend update in the same pass as Phase 3's.

### Learn
- [ ] "Essentials: Databases, Searching, Filtering, Paging"
- [ ] Read on keyset vs offset pagination, and on `IQueryable` composition —
      where the query stops being translated to SQL and starts running in memory
- [ ] Skim "Generating OpenAPI Contracts"

### Ship
- [ ] Paged, filtered, sorted list endpoints. `GetAllAsync` currently returns
      every row unbounded, and `GetAll` checks `userId` then `facilityId` in
      sequence, so passing both silently ignores the second.
- [ ] A shared `PagedResult<T>` response shape, and the frontend updated to it
- [x] Pushed projection into the query. Each DTO class exposes an
      `Expression<Func<TEntity, TResponse>> Projection` that EF translates into the
      SELECT list; `ToResponse` is its compiled form, so there is one mapping.
      `GET /api/reservations` now issues a single query selecting eleven columns
      across two joins, with no entities materialised.
- [ ] Build the filtering and paging once from memory, then diff against the
      course code and note what you missed
- [ ] Publish the OpenAPI document as a build artifact in CI

**Self-check:** At what row count does offset pagination become the wrong choice,
and why? Which of your `Where` clauses would silently fall back to client-side
evaluation? What does `AsNoTracking` change about a query that projects to a DTO?

---

## Phase 6 — Ship

- [ ] Configuration and secrets for the deployed environment — the connection
      string is currently user-secrets only
- [ ] Stop seeding in production: `AppDbContext.OnConfiguring` seeds
      unconditionally, and `Program.cs` migrates on every startup. Decide what
      the deploy story is for both.
- [ ] Health check endpoint
- [ ] Structured logging with a correlation id, and log unhandled exceptions —
      `ApiExceptionHandler` currently writes the response but logs nothing
- [ ] Deploy the API
- [ ] Point the frontend at the deployed URL; update the CORS origin, which is
      hardcoded to `http://localhost:5173`
- [ ] README: what decision the API supports, what a wrong result costs

**Self-check:** What in your app would break first under ten concurrent users?
What would you look at to find out? What is in your logs right now that would
help, and what isn't?

---

## Knowledge gaps worth closing (no phase, ongoing)

Topics the original plan never named, ordered by how likely they are to bite you:

- [ ] HTTP semantics: idempotency of PUT vs POST, why cancel-as-DELETE is wrong
      here, correct status codes for state transitions
- [ ] `CancellationToken` — you thread it everywhere already; know what actually
      happens when a client disconnects mid-`SaveChangesAsync`
- [ ] The `DbContext` change tracker: why `AsNoTracking` on a read followed by a
      write through a second query is a common source of stale-data bugs
- [ ] Async pitfalls: `async void`, sync-over-async, and why every one of your
      service methods returning `Task` matters
- [ ] Where middleware order in `Program.cs` matters — `UseExceptionHandler`
      before `UseCors` before `MapControllers` is not arbitrary
- [ ] Response caching and ETags — relevant once facility lists are read-heavy
- [ ] The difference between a DTO, a domain model, and a persistence model, and
      why your `Reservation` having `private set` and a real constructor is a
      deliberate choice worth being able to defend

---

## Deferred

Reconsider each only when something in the app actually demands it.

- [ ] API versioning — one consumer, which you own. Route churn for no benefit today.
- [ ] gRPC
- [ ] Microservice architecture
- [ ] Building resilient APIs (retries, circuit breakers)
- [ ] Minimal APIs deep dive
- [ ] Designing and evolving APIs
- [ ] Rate limiting / HybridCache
- [ ] Observability beyond basic structured logging
- [ ] Aspire
- [ ] AI-augmented courses
- [ ] End-to-end SPA course

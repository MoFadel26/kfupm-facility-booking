# ResourceManager

Campus facility reservation for KFUPM. Members of the university book shared
spaces — classrooms, labs, the pool, sports courts, the gym — for a time window,
and invite other members to attend.

## The question this answers

**Is this facility free at this time, and is this person allowed to book it?**

Both halves matter, and they fail in different ways:

- **A wrong "free" answer double-books a room.** Two groups arrive for the same
  space at the same hour and one of them has nowhere to go. The cost lands on
  people who did everything right, which is why the no-overlap rule is enforced
  by a database constraint rather than by an application check that a second
  concurrent request can slip past.
- **A wrong "allowed" answer books someone into a space they cannot use.** A
  facility may be restricted by gender, by role, or both. A booking that passes
  the time check but violates a restriction is discovered at the door.

## Domain rules

- A **reservation** belongs to one **facility** and one **user**, and runs from a
  start to an end time. It is `Pending`, `Confirmed`, or `Cancelled`.
- **Two non-cancelled reservations for the same facility may not overlap.**
  Touching is not overlapping: a reservation ending at 12:00 and one starting at
  12:00 both stand. A cancelled reservation releases its slot.
- A facility may restrict **gender** (`Male`, `Female`, `Any`) and **role**
  (`Student`, `Faculty`, `Staff`, `ClubPresident`, `Admin`, `Any`). The rule
  applies to the booking user and to every participant who joins.
- **Event participants** are users attending someone else's reservation. A user
  may join a given reservation once.
- Users are identified by **KFUPM ID**, facilities by a **facility ID** — both
  real-world identifiers supplied by the caller. Reservation IDs are generated
  by the server (`RES-XXXXXXXX`).

### Who may cancel whose reservation

Intended: a user cancels their own reservation; an `Admin` cancels any.

**Not yet enforced.** The API currently has no authentication, so any caller can
create, modify, or cancel any reservation, and can name any user as the owner of
a booking. This is the top item in [docs/backend-plan.md](docs/backend-plan.md)
and the reason this is not yet deployable.

## Stack

- **API** — ASP.NET Core 10, EF Core 10, PostgreSQL (Npgsql), OpenAPI + Scalar
- **Frontend** — React 19, TypeScript, Vite, Tailwind 4, shadcn/ui

## Running it

Requires .NET 10, PostgreSQL, and Node.

```bash
# 1. Point the API at your database
cd ResourceManager.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=resource_managment;Username=<user>;Password=<pw>;"

# 2. Run the API — migrations apply on startup, and an empty database is seeded
dotnet run
# https://localhost:<port>/scalar  for the interactive API docs

# 3. Run the frontend (expects the API's CORS origin, http://localhost:5173)
cd ../frontend
npm install
npm run dev
```

The overlap rule needs PostgreSQL's `btree_gist` extension. The migration creates
it, which requires a role permitted to `CREATE EXTENSION`.

## Tests

Integration tests boot the real application and run against PostgreSQL — the
overlap rule is a database constraint, so an in-memory provider would report a
passing suite for a broken rule. Each run creates and drops its own database.

```bash
dotnet test
# aim at a different server:
TEST_POSTGRES_CONNECTION="Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres;" dotnet test
```

## Layout

```
ResourceManager.Api/
  Controllers/     HTTP surface, one per resource
  Services/        business rules, behind interfaces
  Data/            DbContext, entity configurations, seed data
  Models/          domain entities with private setters and real constructors
  DTO/             request/response contracts and mapping
  Exceptions/      domain exceptions -> ProblemDetails
  Migrations/
ResourceManager.Api.Tests/  integration tests against a real database
frontend/          React client
docs/              architecture decisions, design notes, work plan
```

## API

`/api/facilities`, `/api/users`, `/api/reservations`, `/api/eventparticipants` —
CRUD, except event participants, which are join/leave only.

Every list endpoint is paged. `?page=` defaults to 1 and `?pageSize=` to 25,
capped at 100; anything outside that is a `400`.

```json
{ "items": [...], "page": 1, "pageSize": 25, "totalCount": 137, "totalPages": 6 }
```

Reservations filter by `?userId=` and `?facilityId=`, and participants by
`?userId=` and `?reservationId=`. Filters combine, and naming something that
does not exist is a `404` rather than an empty page.

Errors come back as `ProblemDetails`: `400` for a malformed request, `404` for an
unknown id, `409` for a rule violation (overlapping slot, facility restriction,
duplicate identifier, an illegal status transition, or an attempt to change a
natural key).

## Deployment configuration

A `Dockerfile` is in `ResourceManager.Api/`. The app reads everything it needs from
configuration, so nothing below is baked into the image.

| Setting | Environment variable | Notes |
| --- | --- | --- |
| Database | `ConnectionStrings__DefaultConnection` | Required. User secrets are local-development only and do not ship. |
| Allowed browser origins | `Cors__AllowedOrigins__0`, `__1`, … | Required in Production — the app refuses to start without it, rather than blocking every request from the real frontend. |
| Migrate on startup | `Database__MigrateOnStartup` | Defaults to true. |
| Environment | `ASPNETCORE_ENVIRONMENT` | `Production` disables the seed data and the Scalar docs UI, and switches logs to JSON. |

Health endpoints, for a container platform's probes:

- `GET /health/live` — is the process running. Checks no dependencies, so a database
  outage does not cause a restart loop.
- `GET /health/ready` — can it serve traffic. Checks the database, and returns `503`
  when it is unreachable so the instance stops receiving requests.

The database needs the `btree_gist` extension for the overlap rule. The migration
creates it, which requires a role permitted to `CREATE EXTENSION`.

**Migrations run on startup by default.** That is fine for a single instance. Running
more than one replica means two of them can migrate at once, and a failed migration
takes the app down instead of failing a deploy step you can retry — so set
`Database__MigrateOnStartup=false` and run `dotnet ef database update` from the
pipeline instead.

**Do not expose this publicly yet.** There is no authentication: anyone who reaches
the URL can create, cancel or delete any reservation, and can name any user as the
owner of a booking.

## Logs

One entry per request (method, path, query, status, duration) plus a line for each
rejection and its reason. Error responses carry a `traceId` matching the log entry,
so a reported error can be traced to the request that caused it. Console output is
JSON outside Development.

## Why it is built this way

[docs/architecture.md](docs/architecture.md) covers the decisions and their
trade-offs: why the overlap rule is a database constraint, why foreign keys point at
natural keys, why responses are projected in SQL, and why the tests need a real
PostgreSQL.

## Status

Working end to end, not production-ready. See
[docs/backend-plan.md](docs/backend-plan.md) for what remains and in what order —
the short version is authentication, an automated test suite, and pagination.

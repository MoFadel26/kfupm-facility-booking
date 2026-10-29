# ResourceManager

Facility booking for KFUPM. Users book shared spaces (classrooms, labs, the pool,
courts, the gym) for a time slot and invite others to join.

## Rules

- Two active reservations for the same facility cannot overlap. A booking ending
  at 12:00 and one starting at 12:00 are fine. Cancelled bookings free the slot.
- The overlap rule is a PostgreSQL constraint, so two requests at the same moment
  cannot both win.
- A facility can be limited by gender and by role. The limit applies to the booker
  and to every participant.
- A user can join a reservation once.

## Stack

- **API:** ASP.NET Core 10, EF Core 10, PostgreSQL
- **Frontend:** React 19, TypeScript, Vite, Tailwind 4, shadcn/ui

## Run locally

Needs .NET 10, PostgreSQL, and Node.

```bash
cd ResourceManager.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=resource_managment;Username=<user>;Password=<pw>;"
dotnet run          # applies migrations and seeds sample data; docs at /scalar

cd ../frontend
npm install
npm run dev         # http://localhost:5173
```

The database role must be allowed to `CREATE EXTENSION` (the migration adds `btree_gist`).

Get a token by registering through the API. In Development, KfupmId `200000000`
registers as an admin; any other id registers as a student:

```bash
curl -X POST http://localhost:5049/api/auth/register -H 'Content-Type: application/json' \
  -d '{"kfupmId":"200000000","name":"Dev Admin","email":"admin@kfupm.edu.sa","gender":"Male","password":"devpassword"}'
curl -X POST http://localhost:5049/api/auth/login -H 'Content-Type: application/json' \
  -d '{"kfupmId":"200000000","password":"devpassword"}'
```

Both return `{ token, expiresAt, user }`. Send the token as `Authorization: Bearer <token>`.
The sample user `202300001` has no password, so it cannot log in.

The issuer, audience and signing key are in `appsettings.Development.json`. That key is
for local development only and is committed on purpose; Production sets its own.

## Test

```bash
dotnet test
```

Tests run against a real PostgreSQL and create and drop their own database. To use
another server, set `TEST_POSTGRES_CONNECTION`.

## API

`/api/auth`, `/api/facilities`, `/api/users`, `/api/reservations`, `/api/eventparticipants`

- `POST /api/auth/register` with `{ kfupmId, name, email, gender, password }` creates a
  student and returns `201` with `{ token, expiresAt, user }`. The password is 8 to 128
  characters. A taken KfupmId or email is `409`. The KfupmId in
  `Bootstrap:AdminKfupmId` registers as an admin instead.
- `POST /api/auth/login` with `{ kfupmId, password }` returns `200` with the same shape.
  A wrong id or password is `401`. Users created through `POST /api/users` have no
  password and cannot log in.
- `GET /api/auth/me` returns the token's user.
- Tokens last 60 minutes. There is no refresh; log in again.
- Lists are paged: `?page=` (default 1), `?pageSize=` (default 25, max 100).
- Reservations filter by `?userId=` and `?facilityId=`. Participants filter by
  `?userId=` and `?reservationId=`.
- `POST`, `PUT` and `DELETE` on `/api/reservations` need `Authorization: Bearer <token>`.
  The token's `sub` claim is the acting user's KfupmId; a new reservation belongs to that
  user. Only the owner or a user whose role is `Admin` can change or delete a reservation.
- `POST`, `PUT` and `DELETE` on `/api/users` and `/api/facilities` are for admins only.
  The role is read from the database on each request, so a demotion applies at once.
- Every `GET` and the `/api/eventparticipants` writes are open.
- Errors are `ProblemDetails`: `400` bad request, `401` failed login, `404` not found,
  `409` rule broken, `403` the token's user does not exist or may not change that
  reservation. A missing or invalid token is `401` with no body. A user who is not an
  admin writing to users or facilities is `403` with no body.

## Deploy

`ResourceManager.Api/Dockerfile` builds the API image, with the repository root as the
build context. [docs/deploy.md](docs/deploy.md) covers running it on Azure Container Apps
and running the image locally. The frontend is not part of the image.

Configure the API with environment variables:

| Variable | Purpose |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | Database. Required. |
| `Cors__AllowedOrigins__0`, `__1`, … | Frontend origins. Required in Production. |
| `Authentication__Schemes__Bearer__ValidIssuer` | Issuer the API puts in the tokens it issues and expects in access tokens. Required in Production. |
| `Authentication__Schemes__Bearer__ValidAudiences__0` | Audience the API puts in the tokens it issues and expects in access tokens. Required in Production. |
| `Authentication__Schemes__Bearer__SigningKeys__0__Issuer` | Issuer of the signing key; same as `ValidIssuer`. |
| `Authentication__Schemes__Bearer__SigningKeys__0__Value` | Signing key, base64, 32 or more bytes. Signs and checks tokens. Secret. Required in Production. |
| `Bootstrap__AdminKfupmId` | Optional. The KfupmId that registers as an admin. |
| `ASPNETCORE_ENVIRONMENT` | `Production` turns off sample data and API docs, and logs JSON. |
| `Database__MigrateOnStartup` | Default `true`. Set `false` when running more than one instance. |
| `Database__SeedSampleData` | Default `false`. Seeds sample data outside Development. |
| `ApiDocs__Enabled` | Default `false`. Serves the Scalar docs outside Development. |

Health checks: `GET /health/live` (process is up) and `GET /health/ready` (database is reachable).

## Performance

`POST /api/reservations` under [k6](https://k6.io), 100 virtual users sending requests
back to back for 60 seconds ([perf/create-reservation.js](perf/create-reservation.js)).
Every request books a free slot, so each one runs the eligibility checks, the overlap
query and the insert.

| Run | p95 | Median | Requests/s | Failed |
| --- | --- | --- | --- | --- |
| 1 | 268.6 ms | 69.6 ms | 1,085 | 6 of 65,251 |
| 2 | 272.8 ms | 60.2 ms | 1,166 | 5 of 70,116 |
| 3 | 291.1 ms | 66.2 ms | 1,019 | 4 of 61,355 |

Measured on 2026-10-29 on one Apple M1 Pro (10 cores, 16 GB): the API as a Release build
with `ASPNETCORE_ENVIRONMENT=Production`, PostgreSQL 18 in a Docker container, and k6 on
the same machine. A warm-up run came first. The database kept the rows from earlier runs,
about 150,000 reservations at the start of run 1. These are numbers for this machine, not
for a deployment.

The failures are `409`s from the unique index on `ReservationId`. It is `RES-` plus 8 hex
digits, 32 random bits, so two bookings start drawing the same id once the table holds
a few hundred thousand rows.

To repeat it, start the API on port 5080 with a signing key, then:

```bash
k6 run -e BASE_URL=http://localhost:5080 -e TOKEN=<token whose sub is 209900001> perf/create-reservation.js
```

## More

- [docs/architecture.md](docs/architecture.md): design decisions and trade-offs
- [docs/backend-plan.md](docs/backend-plan.md): remaining work

# Verification Summary

Date: 2026-07-02. Final end-to-end status after Phases 1–4. Plan files with per-phase detail:
`service-plan.md`, `dto-plan.md`, `controller-plan.md`, `frontend-plan.md`.

## Entity coverage

| Entity | Service | DTOs | Controller | Frontend page | Verified |
|---|---|---|---|---|---|
| User | `IUserService`/`UserService` | `UserRequest`, `UserResponse` | `UsersController` → `/api/users` | `/users` | ✅ API smoke (curl) + browser click-through |
| Facility | `IFacilityService`/`FacilityService` | `FacilityRequest`, `FacilityResponse` | `FacilitiesController` → `/api/facilities` | `/facilities` | ✅ same |
| Reservation | `IReservationService`/`ReservationService` | `CreateReservationRequest`, `UpdateReservationRequest`, `ReservationResponse` | `ReservationsController` → `/api/reservations` | `/reservations` | ✅ same |
| EventParticipant | `IEventParticipantService`/`EventParticipantService` | `CreateEventParticipantRequest`, `EventParticipantResponse` | `EventParticipantsController` → `/api/eventparticipants` | `/participants` | ✅ same |

Evidence: 44/44 curl smoke checks against every endpoint (happy + failure paths, recorded in
`controller-plan.md`), and 22/22 Playwright checks driving the real UI in Chromium (recorded in
`frontend-plan.md`). Business rules exercised end-to-end: unique KFUPM id/email/facility id,
slot-overlap rejection, facility gender/role eligibility, participant capacity/duplicates,
FK-guarded deletes.

## How to run locally

Prereqs: .NET 10 SDK, Node 22+, PostgreSQL running on `localhost:5432` with the
`DefaultConnection` connection string in user-secrets (already set on this machine; other
machines: `cd ResourceManager.Api && dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=resource_managment;Username=...;Password=...;"`).

```bash
# Terminal 1 — backend (http://localhost:5049; applies EF migrations + seeds on startup)
cd ResourceManager.Api
dotnet run --launch-profile http

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install         # first time only
npm run dev
```

- API reference UI (Scalar): http://localhost:5049/scalar — OpenAPI spec at
  http://localhost:5049/openapi/v1.json
- Frontend env: `frontend/.env` sets `VITE_API_BASE_URL=http://localhost:5049`
  (`.env.example` provided; `.env` is gitignored).
- CORS on the backend allows `http://localhost:5173` (Development pipeline).

## Assumptions and deviations from "textbook"

1. **No repository layer** — mandated by the task; services use `AppDbContext` directly.
2. **No auth** — the project had none, so endpoints are open (documented, not invented).
3. **Exceptions over result pattern** — `NotFoundException`/`ConflictException`/
   `BadRequestException` mapped to ProblemDetails by a global `IExceptionHandler`; chosen as the
   most conventional ASP.NET Core shape since the project had no prior convention.
4. **Reservation owner/facility are immutable after creation**; changing them means delete +
   re-create. Status changes (confirm/cancel) go through PUT.
5. **`ReservationId` is server-generated** (`RES-XXXXXXXX`); KFUPM ids and facility ids are
   caller-supplied real-world identifiers.
6. **Overlap rule:** non-cancelled reservations on the same facility cannot intersect in time.
   ~~The DB's unique `(FacilityId, StartTime, EndTime)` index only catches exact duplicates, so
   the service enforces true interval overlap. Small TOCTOU window between check and save is
   accepted for this scale.~~ **Superseded:** the unique index is gone (it also broke rebooking
   a cancelled slot) and the rule is now a Postgres exclusion constraint,
   `EX_Reservations_NoOverlap`. The TOCTOU window is closed.
7. **Facility eligibility (gender/role)** is enforced for the reserving user and each
   participant at join time; `Any` always passes.
8. **Audit columns (`CreatedAt`/`UpdatedAt`) are not exposed** in response DTOs, per the
   task's DTO guidance.
9. **Frontend state is plain hooks + fetch** (no TanStack Query/axios/react-hook-form) to keep
   the dependency surface minimal; client-side validation mirrors backend DTO attributes and
   backend ProblemDetails are surfaced verbatim in toasts.
10. **Scalar, not Swashbuckle Swagger UI** — the project already used `AddOpenApi()` + Scalar;
    it fulfills the same role (interactive API docs from the OpenAPI spec).

## Known gaps / TODOs for a human

- **No automated test projects** (xUnit/Vitest) — verification was scripted but ad hoc
  (curl smoke script + Playwright script, both in the session scratchpad, results recorded in
  the plan files). Worth promoting into committed test suites.
- **No pagination** — list endpoints return everything; fine at this scale, needed for real data.
- **No auth/authorization** — anyone can call anything; the obvious next feature.
- ~~**Overlap check race**~~ — fixed; see assumption 6.
- **Reservation-status transitions are unconstrained** (e.g. Cancelled → Confirmed is allowed);
  add a transition rule if the domain needs it.
- `EnsureUserIsEligible` compares `AllowedGender`/`AllowedRole` to `Gender`/`UserRole` by enum
  name string — works because the name sets align, but a shared mapping would be more robust if
  enums diverge.
- The seed reservation's time window is relative to first-run time; it may appear as past/
  upcoming depending on when the DB was seeded.

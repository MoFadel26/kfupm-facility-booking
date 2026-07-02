# Phase 3 Plan — Controllers / Endpoints

Date: 2026-07-02.

## Decisions

1. **Attribute-routed API controllers** (`[ApiController]`, `ControllerBase`) — the most
   conventional shape; automatic 400 on DTO validation failures.
2. **Program.cs additions:** `AddControllers()` with `JsonStringEnumConverter` (enums travel as
   strings, matching their DB representation), `MapControllers()`.
3. **Error mapping:** a global `IExceptionHandler` (`Exceptions/ApiExceptionHandler.cs`)
   translates the Phase 1 exceptions into RFC 7807 `ProblemDetails`:
   `NotFoundException` → 404, `ConflictException` → 409, `BadRequestException` → 400; anything
   else falls through to the default 500 handler. Registered with
   `AddExceptionHandler` + `AddProblemDetails` + `UseExceptionHandler`.
4. **Relationship reads as query filters** — `GET /api/reservations?userId=&facilityId=` and
   `GET /api/eventparticipants?userId=&reservationId=` instead of nested routes. One list
   endpoint per resource keeps the client simple; the service's by-user/by-facility methods back
   these filters.
5. **Auth: none.** The project has no authentication/authorization setup, so all endpoints are
   left open (documented deliberately — no auth scheme invented).
6. **OpenAPI:** already configured via `AddOpenApi()`/`MapOpenApi()` with **Scalar UI** at
   `/scalar` (this project's Swagger-UI equivalent; spec at `/openapi/v1.json`). Controllers are
   annotated with `[ProducesResponseType]` so schemas and status codes render accurately.
7. **HTTPS redirect is dropped in Development** (`UseHttpsRedirection` only outside Development)
   so the plain-HTTP `http://localhost:5049` profile and the frontend dev server don't fight
   redirects. CORS for the Vite origin (`http://localhost:5173`) is added here so Phase 4 works
   against it.

## Controllers

All in `ResourceManager.Api/Controllers/`, namespace `ResourceManager.Api.Controllers`.

### UsersController — `/api/users`

| Verb | Route | Request | Response | Success | Failures |
|---|---|---|---|---|---|
| GET | `/api/users` | — | `List<UserResponse>` | 200 | — |
| GET | `/api/users/{id}` | — | `UserResponse` | 200 | 404 |
| POST | `/api/users` | `UserRequest` | `UserResponse` | 201 (+Location) | 400 invalid, 409 duplicate KfupmId/Email |
| PUT | `/api/users/{id}` | `UserRequest` | `UserResponse` | 200 | 400, 404, 409 |
| DELETE | `/api/users/{id}` | — | — | 204 | 404, 409 (has reservations/participations) |

### FacilitiesController — `/api/facilities`

Same shape with `FacilityRequest`/`FacilityResponse`; POST 409 on duplicate FacilityId; DELETE
409 when reservations exist.

### ReservationsController — `/api/reservations`

| Verb | Route | Request | Response | Success | Failures |
|---|---|---|---|---|---|
| GET | `/api/reservations?userId=&facilityId=` | optional query filters | `List<ReservationResponse>` | 200 | 404 unknown userId/facilityId |
| GET | `/api/reservations/{id}` | — | `ReservationResponse` | 200 | 404 |
| POST | `/api/reservations` | `CreateReservationRequest` | `ReservationResponse` | 201 | 400 invalid times/count, 404 unknown facility/user, 409 overlap or ineligible user |
| PUT | `/api/reservations/{id}` | `UpdateReservationRequest` | `ReservationResponse` | 200 | 400, 404, 409 overlap |
| DELETE | `/api/reservations/{id}` | — | — | 204 | 404 |

### EventParticipantsController — `/api/eventparticipants`

| Verb | Route | Request | Response | Success | Failures |
|---|---|---|---|---|---|
| GET | `/api/eventparticipants?userId=&reservationId=` | optional filters | `List<EventParticipantResponse>` | 200 | 404 unknown filter id |
| GET | `/api/eventparticipants/{id}` | — | `EventParticipantResponse` | 200 | 404 |
| POST | `/api/eventparticipants` | `CreateEventParticipantRequest` | `EventParticipantResponse` | 201 | 404 unknown user/reservation, 409 duplicate/full/cancelled/ineligible |
| DELETE | `/api/eventparticipants/{id}` | — | — | 204 | 404 |

No PUT — a participation is a pure join row; both fields are its identity (remove + re-add).

## Verification

Ran 2026-07-02 against `dotnet run` (http profile, `http://localhost:5049`) with a curl-based
smoke script. **44/44 checks passed**, covering every endpoint's happy path and at least one
failure path:

- **Users:** list 200; get-by-id 200; missing id 404; create 201; duplicate email 409; invalid
  email 400 (DTO validation); update 200; update missing 404; delete 204; delete with
  reservations 409.
- **Facilities:** list 200; missing 404; create 201; duplicate FacilityId 409; empty name 400;
  update 200; delete 204; delete with reservations 409.
- **Reservations:** list 200; user/facility query filters 200; filter by unknown user 404;
  create 201; overlapping slot 409; EndTime ≤ StartTime 400; unknown facility 404; ineligible
  user (female user, male-only facility) 409; get-by-id 200; update (confirm) 200; update
  missing 404; delete 204; re-delete 404.
- **EventParticipants:** list 200; missing 404; create 201; duplicate pair 409; reservation full
  409; unknown user 404; filter by reservation 200; delete 204.
- **OpenAPI/Scalar:** `/openapi/v1.json` 200 with all endpoints and DTO schemas;
  `/scalar/v1` UI 200.

All test data created by the script was cleaned up (deleted) at the end; only the original seed
row remains.

# Phase 1 Plan — Service Layer

Date: 2026-07-02. Written before implementation, per the phased workflow. Services talk to
`AppDbContext` directly (no repository layer).

## Project inventory (as found)

- **Stack:** .NET 10 Web API, EF Core 10 + Npgsql (PostgreSQL), OpenAPI (`AddOpenApi`) + Scalar UI,
  connection string in user-secrets, migrations applied at startup (`Database.MigrateAsync()`).
- **Entities** (all in `ResourceManager.Api/Models/`, all inherit `EntityBase` — `Guid Id`,
  `CreatedAt`, `UpdatedAt` auto-stamped in `AppDbContext.SaveChanges`):
  - `User` — `KfupmId` (string, unique, ≤20), `Name` (≤100), `Email` (unique, ≤150),
    `Role` (`UserRole` enum), `Gender` (`Gender` enum). Navs: `Reservations`, `EventParticipants`.
  - `Facility` — `FacilityId` (string business id, unique, ≤20), `Name` (≤50),
    `Type` (`FacilityType`), `AllowedGender` (`AllowedGender`), `AllowedRole` (`AllowedRole`).
    Nav: `Reservations`.
  - `Reservation` — `ReservationId` (string business id, unique, ≤30), `StartTime`/`EndTime`
    (`DateTimeOffset`), `Reason` (≤500), `Status` (`ReservationStatus`),
    `TargetParticipantCount` (int), FKs `FacilityId` → Facility (Restrict),
    `UserId` → User (Restrict). Nav: `EventParticipants`. Unique index
    `(FacilityId, StartTime, EndTime)`.
  - `EventParticipant` — FKs `UserId` → User (Restrict), `ReservationId` → Reservation (Cascade).
    Unique index `(UserId, ReservationId)`.
- **Existing DTOs:** none (`DTO/` folder is empty). **Controllers:** none. **Auth:** none.
- **Conventions observed:** encapsulated entities (private setters + constructors), flat
  `Services/` folder (a deleted placeholder `IReservationService` lived at
  `Services/IReservationService.cs`), file-scoped namespaces, `IEntityTypeConfiguration` per
  entity.

## Decisions (with reasoning)

1. **Error handling — custom exceptions**, since no convention exists yet:
   `Exceptions/NotFoundException.cs`, `Exceptions/ConflictException.cs`,
   `Exceptions/BadRequestException.cs` (named `BadRequestException` to avoid clashing with
   `System.ComponentModel.DataAnnotations.ValidationException`). Services throw; Phase 3 maps
   them to 404/409/400 ProblemDetails via a global `IExceptionHandler`. Exceptions over a result
   pattern because it is the most conventional ASP.NET Core approach and keeps controllers thin.
2. **Entity mutability:** entities have private setters, so each entity gets a public
   `Update(...)` method carrying the mutable fields. This preserves the existing encapsulated
   style instead of opening setters.
3. **Business id generation:** `User.KfupmId` and `Facility.FacilityId` are real-world
   identifiers supplied by the caller (validated for uniqueness). `Reservation.ReservationId` is
   an internal reference number, generated server-side as `RES-<8 hex chars>` (seed style
   `RES-1001` is only seed data); callers never supply it.
4. **Phase sequencing:** per the workflow, Phase 1 services take/return entities; Phase 2
   switches signatures to DTOs.
5. **Delete semantics:** hard deletes. User/Facility deletes are blocked by the DB
   (`Restrict`) when reservations exist — the service pre-checks and throws `ConflictException`
   with a clear message instead of surfacing a DbUpdateException.

## Services

All in `ResourceManager.Api/Services/` (flat, matching the deleted placeholder's location),
namespace `ResourceManager.Api.Services`, injected with `AppDbContext`, fully async with
`CancellationToken` parameters.

### UserService — `Services/IUserService.cs`, `Services/UserService.cs`

| Method | Signature |
|---|---|
| Get all | `Task<List<User>> GetAllAsync(CancellationToken ct)` |
| Get by id | `Task<User> GetByIdAsync(Guid id, CancellationToken ct)` — throws `NotFoundException` |
| Create | `Task<User> CreateAsync(string kfupmId, string name, string email, UserRole role, Gender gender, CancellationToken ct)` |
| Update | `Task<User> UpdateAsync(Guid id, string kfupmId, string name, string email, UserRole role, Gender gender, CancellationToken ct)` |
| Delete | `Task DeleteAsync(Guid id, CancellationToken ct)` |

Rules: `KfupmId` and `Email` unique (409 on duplicate, checked on create and update);
non-empty `KfupmId`/`Name`/`Email` (400); delete blocked with 409 if the user has reservations
or participations (FK Restrict).

### FacilityService — `Services/IFacilityService.cs`, `Services/FacilityService.cs`

| Method | Signature |
|---|---|
| Get all | `Task<List<Facility>> GetAllAsync(CancellationToken ct)` |
| Get by id | `Task<Facility> GetByIdAsync(Guid id, CancellationToken ct)` |
| Create | `Task<Facility> CreateAsync(string facilityId, string name, FacilityType type, AllowedGender allowedGender, AllowedRole allowedRole, CancellationToken ct)` |
| Update | `Task<Facility> UpdateAsync(Guid id, string facilityId, string name, FacilityType type, AllowedGender allowedGender, AllowedRole allowedRole, CancellationToken ct)` |
| Delete | `Task DeleteAsync(Guid id, CancellationToken ct)` |

Rules: `FacilityId` unique (409); non-empty `FacilityId`/`Name` (400); delete blocked with 409
if reservations exist (FK Restrict).

### ReservationService — `Services/IReservationService.cs`, `Services/ReservationService.cs`

| Method | Signature |
|---|---|
| Get all | `Task<List<Reservation>> GetAllAsync(CancellationToken ct)` |
| Get by id | `Task<Reservation> GetByIdAsync(Guid id, CancellationToken ct)` |
| By user | `Task<List<Reservation>> GetByUserIdAsync(Guid userId, CancellationToken ct)` |
| By facility | `Task<List<Reservation>> GetByFacilityIdAsync(Guid facilityId, CancellationToken ct)` |
| Create | `Task<Reservation> CreateAsync(DateTimeOffset startTime, DateTimeOffset endTime, string reason, int targetParticipantCount, Guid facilityId, Guid userId, CancellationToken ct)` — status starts `Pending` |
| Update | `Task<Reservation> UpdateAsync(Guid id, DateTimeOffset startTime, DateTimeOffset endTime, string reason, int targetParticipantCount, ReservationStatus status, CancellationToken ct)` — facility/user are not re-assignable after creation (conventional; avoids re-running eligibility for a different owner mid-flight) |
| Delete | `Task DeleteAsync(Guid id, CancellationToken ct)` — cascades to participants |

Rules (create + update):
- `EndTime > StartTime` (400); `TargetParticipantCount >= 1` (400); non-empty `Reason` (400).
- Facility and user must exist (404 with the missing entity named).
- **Overlap check:** no other non-Cancelled reservation on the same facility with
  `StartTime < other.EndTime && EndTime > other.StartTime` (409). The DB unique index only
  catches exact duplicates; the service enforces true overlap.
- **Facility eligibility:** the reserving user must satisfy `Facility.AllowedGender` and
  `Facility.AllowedRole` (`Any` always passes) — 409 otherwise.
- Update excludes the reservation itself from the overlap check; cancelled reservations don't
  block slots.

### EventParticipantService — `Services/IEventParticipantService.cs`, `Services/EventParticipantService.cs`

| Method | Signature |
|---|---|
| Get all | `Task<List<EventParticipant>> GetAllAsync(CancellationToken ct)` |
| Get by id | `Task<EventParticipant> GetByIdAsync(Guid id, CancellationToken ct)` |
| By reservation | `Task<List<EventParticipant>> GetByReservationIdAsync(Guid reservationId, CancellationToken ct)` |
| By user | `Task<List<EventParticipant>> GetByUserIdAsync(Guid userId, CancellationToken ct)` |
| Create | `Task<EventParticipant> CreateAsync(Guid userId, Guid reservationId, CancellationToken ct)` |
| Delete | `Task DeleteAsync(Guid id, CancellationToken ct)` |

No Update method: the row is a pure join (user, reservation) and both halves are its identity —
"changing" one is remove + add.

Rules: user and reservation must exist (404); duplicate `(UserId, ReservationId)` pair → 409;
participant count must stay below `TargetParticipantCount` (409 when full); participant must
satisfy the facility's `AllowedGender`/`AllowedRole` (409); joining a `Cancelled` reservation →
409.

## Cross-entity logic summary

- Reservation.Create/Update → existence checks on Facility/User, overlap check, eligibility check.
- EventParticipant.Create → existence checks on User/Reservation (with Facility loaded for
  eligibility), capacity check, duplicate check.
- User.Delete / Facility.Delete → pre-check dependent rows, throw `ConflictException` (mirrors DB
  `Restrict`).
- EF's `Cascade` on Reservation→EventParticipants handles participant cleanup on reservation
  delete.

## DI registration

In `Program.cs`, after the `AddDbContext` block:

```csharp
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IFacilityService, FacilityService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<IEventParticipantService, EventParticipantService>();
```

(Scoped — same lifetime as `AppDbContext`.)

## New files

- `Exceptions/NotFoundException.cs`, `Exceptions/ConflictException.cs`,
  `Exceptions/BadRequestException.cs`
- `Services/IUserService.cs` + `UserService.cs`
- `Services/IFacilityService.cs` + `FacilityService.cs`
- `Services/IReservationService.cs` + `ReservationService.cs`
- `Services/IEventParticipantService.cs` + `EventParticipantService.cs`
- `Update(...)` methods added to `User`, `Facility`, `Reservation` models.

Exit criteria: `dotnet build` clean.

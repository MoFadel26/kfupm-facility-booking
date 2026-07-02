# Phase 2 Plan — DTOs

Date: 2026-07-02. No DTOs existed before this phase (the `DTO/` folder was empty), so everything
below is new. Namespace `ResourceManager.Api.DTO` (matches the existing folder name in the
csproj).

## Decisions

1. **Manual mapping** — the project has no AutoMapper dependency, so each entity gets a
   `ToResponse()` extension method in its DTO file. No new packages.
2. **One file per entity** — `DTO/UserDtos.cs`, `DTO/FacilityDtos.cs`, `DTO/ReservationDtos.cs`,
   `DTO/EventParticipantDtos.cs`; each holds the request DTO(s), the response DTO, and the
   mapping extension. Keeps related contracts together in a small project.
3. **Create vs Update requests** — per the workflow rule, separate types only where semantics
   differ:
   - `User`, `Facility`: create and update take the same fields (the route carries the id) →
     a single `UserRequest` / `FacilityRequest`.
   - `Reservation`: differs — create takes `FacilityId` + `UserId` (owner/facility fixed after
     creation, `Status` starts `Pending`); update takes `Status` but not `FacilityId`/`UserId` →
     `CreateReservationRequest` + `UpdateReservationRequest`.
   - `EventParticipant`: create-only join row → `CreateEventParticipantRequest`.
4. **Audit columns excluded** from responses (`CreatedAt`/`UpdatedAt` are internal bookkeeping),
   per the workflow guidance. `Id` (Guid PK) is included — it is the API handle.
5. **Enums are exposed as enum types** and will serialize as strings once
   `JsonStringEnumConverter` is configured with controllers in Phase 3, matching how they are
   stored in the DB (`HasConversion<string>()`).
6. **Denormalized display fields** on `ReservationResponse` (`FacilityName`, `UserName`, plus the
   business ids) and `EventParticipantResponse` (`UserName`, `UserKfupmId`,
   `ReservationRef`) — the services already `Include()` these navs, and it saves the frontend an
   N+1 of lookup calls. Navigation *objects* are not embedded, avoiding cycles.

## DTOs per entity

### User — `DTO/UserDtos.cs`

- `UserRequest` (create + update): `KfupmId` `[Required, MaxLength(20)]`,
  `Name` `[Required, MaxLength(100)]`, `Email` `[Required, EmailAddress, MaxLength(150)]`,
  `Role` (`UserRole`), `Gender` (`Gender`). Max lengths mirror the EF configuration.
- `UserResponse`: `Id`, `KfupmId`, `Name`, `Email`, `Role`, `Gender`.
- No sensitive fields exist (no password hash — there is no auth).

### Facility — `DTO/FacilityDtos.cs`

- `FacilityRequest` (create + update): `FacilityId` `[Required, MaxLength(20)]`,
  `Name` `[Required, MaxLength(50)]`, `Type` (`FacilityType`), `AllowedGender`, `AllowedRole`.
- `FacilityResponse`: `Id`, `FacilityId`, `Name`, `Type`, `AllowedGender`, `AllowedRole`.

### Reservation — `DTO/ReservationDtos.cs`

- `CreateReservationRequest`: `StartTime`, `EndTime`, `Reason` `[Required, MaxLength(500)]`,
  `TargetParticipantCount` `[Range(1, int.MaxValue)]`, `FacilityId` (Guid), `UserId` (Guid).
  No `ReservationId` (server-generated) and no `Status` (starts `Pending`).
- `UpdateReservationRequest`: `StartTime`, `EndTime`, `Reason`, `TargetParticipantCount`,
  `Status` (`ReservationStatus`). No `FacilityId`/`UserId` (not re-assignable, per Phase 1).
- `ReservationResponse`: `Id`, `ReservationId`, `StartTime`, `EndTime`, `Reason`, `Status`,
  `TargetParticipantCount`, `FacilityId`, `FacilityRef` (business id), `FacilityName`,
  `UserId`, `UserName`.

### EventParticipant — `DTO/EventParticipantDtos.cs`

- `CreateEventParticipantRequest`: `UserId` (Guid), `ReservationId` (Guid).
- `EventParticipantResponse`: `Id`, `UserId`, `UserName`, `UserKfupmId`, `ReservationId` (Guid),
  `ReservationRef` (business id string), `ReservationReason`.

## Service signature changes (Phase 1 refactor)

All service interfaces/implementations switch from entity parameters/returns to DTOs:

- `IUserService`: `GetAll/GetById → UserResponse`, `Create/Update(…, UserRequest)`.
- `IFacilityService`: same pattern with `FacilityRequest`/`FacilityResponse`.
- `IReservationService`: `CreateAsync(CreateReservationRequest)`,
  `UpdateAsync(Guid, UpdateReservationRequest)`, all reads → `ReservationResponse`.
- `IEventParticipantService`: `CreateAsync(CreateEventParticipantRequest)`, reads →
  `EventParticipantResponse`.

Business validation that duplicates DTO attributes (`Required`, `Range`) stays in the services —
attributes only run at the HTTP binding layer, and the services should stay safe if called from
elsewhere (tests, seeding, future jobs).

Exit criteria: `dotnet build` clean.

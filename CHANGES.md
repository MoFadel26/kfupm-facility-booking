# Changes Log

This document summarizes the review of the model and configuration files and
the follow-up fixes that were applied. Each fix is a separate commit unless
several minor edits belonged together (e.g. typos).

## Baseline

- Commit: `198a41a chore: initial project scaffold`
- Snapshot of the project on disk at the time of review.
- Note: some issues flagged during the review (a misspelled table name in
  `EventParticipantConfiguration`, the `EventPraticipants` navigation on
  `User`, and the `HasMaxLength(20)` on the `EventParticipant.ReservationId`
  foreign key) were already corrected on disk by the IDE before the baseline
  commit was created, so they do not appear as separate follow-up commits.

## 1. Typo fix — `TargetPraticipantCount` → `TargetParticipantCount`

- Commit: `332d59c fix: rename TargetPraticipantCount to TargetParticipantCount`
- Files:
  - `ResourceManager.Api/Models/Reservation.cs`
  - `ResourceManager.Api/Data/AppDbContext.cs`
- What: the `Reservation` property was misspelled. Renamed the property and
  the seed reference in `AppDbContext.SeedData`.
- Why: correctness / readability. The typo would have leaked into API
  contracts and database column names.

## 2. Bug — connection string was in the wrong config section

- Commit: `e201f4d fix: move DefaultConnection under ConnectionStrings section`
- File: `ResourceManager.Api/appsettings.json`
- What: the connection string lived at the root of the JSON. Moved it under a
  `ConnectionStrings` object.
- Why: `Program.cs` calls
  `builder.Configuration.GetConnectionString("DefaultConnection")`, which
  reads specifically from the `ConnectionStrings` section. With the value at
  the root the call returned `null`, so `UseNpgsql(null)` would have failed
  at startup.

## 3. Refactor — real constructors on entities + simpler seed data

- Commit: `63c4a1b refactor: add constructors to entities and simplify seed data`
- Files:
  - `ResourceManager.Api/Models/User.cs`
  - `ResourceManager.Api/Models/Facility.cs`
  - `ResourceManager.Api/Models/Reservation.cs`
  - `ResourceManager.Api/Models/EventParticipant.cs`
  - `ResourceManager.Api/Data/AppDbContext.cs`
- What:
  - Added a public constructor to each entity that takes the required fields.
  - Kept a `private` parameterless constructor so EF Core can still
    materialize instances from the database.
  - Rewrote `AppDbContext.SeedData` to construct entities directly and pass
    them to `context.AddRange(...)`, replacing the previous
    `EntityEntry.Property(x => x.Foo).CurrentValue = ...` pattern.
- Why: the entities exposed only `private set` accessors and no constructor,
  which forced the seed code to poke every property through EF reflection.
  That is fragile (silent failures on rename) and hides intent. Constructors
  make required fields explicit and let the seed read as data.

## 4. Bug — database schema was never created at startup

- Commit: `e57042d feat: ensure database schema is created at startup`
- File: `ResourceManager.Api/Program.cs`
- What: added a scoped `AppDbContext` resolve after `builder.Build()` and
  called `await db.Database.EnsureCreatedAsync()` before configuring the
  HTTP pipeline.
- Why: the `UseSeeding` and `UseAsyncSeeding` hooks registered in
  `AppDbContext.OnConfiguring` only run once the schema exists. With no
  migration and no `EnsureCreated` call, the app would boot against an
  empty (or missing) database and the seed would never run.

## 5. Refactor — foreign keys switched from string business ids to Guid PKs

- Commit: `44964fa refactor: use Guid PKs as foreign keys instead of string business ids`
- Files:
  - `ResourceManager.Api/Models/Reservation.cs`
  - `ResourceManager.Api/Models/EventParticipant.cs`
  - `ResourceManager.Api/Data/Configurations/ReservationConfiguration.cs`
  - `ResourceManager.Api/Data/Configurations/EventParticipantConfiguration.cs`
  - `ResourceManager.Api/Data/AppDbContext.cs`
- What:
  - `Reservation.FacilityId` is now `Guid` and points at `Facility.Id`.
  - `Reservation.KfupmId` is renamed to `UserId`, `Guid`, and points at
    `User.Id`.
  - `EventParticipant.KfupmId` is renamed to `UserId`, `Guid`, and points
    at `User.Id`. `EventParticipant.ReservationId` is now `Guid` and
    points at `Reservation.Id`.
  - Constructors for `Reservation` and `EventParticipant` take the Guid
    FKs instead of the previous string values.
  - EF configurations drop the `HasMaxLength` calls for the FK columns
    and wire `HasForeignKey` against the new Guid properties. The unique
    composite index on `EventParticipant` is now
    `(UserId, ReservationId)`.
  - `AppDbContext.SeedData` passes `facility.Id`, `user.Id`, and
    `reservation.Id` to the child entity constructors.
- Why: FKs previously targeted the business identifier columns
  (`Facility.FacilityId`, `User.KfupmId`, `Reservation.ReservationId`),
  which are unique but not primary keys. Joins were string comparisons
  and any business-id rename would have cascaded through every FK
  column. Business identifiers are retained as unique columns for
  external/human use.

## 6. Feature — `AllowedRole` now covers every `UserRole`

- Commit: `a699a33 feat: add Student and Admin to AllowedRole enum`
- File: `ResourceManager.Api/Models/Enums/AllowedRole.cs`
- What: added `Student` and `Admin` to `AllowedRole`.
- Why: `UserRole` has five values; `AllowedRole` was missing `Student`
  and `Admin`, so a `Facility` could not be gated to either group.
  Existing `HasMaxLength(15)` on the string conversion already covers
  the longest name.

## 7. Chore — bump `Microsoft.OpenApi` past NU1903

- Commit: `3a6c873 chore: pin Microsoft.OpenApi to 2.9.0 to clear NU1903`
- File: `ResourceManager.Api/ResourceManager.Api.csproj`
- What: added an explicit `PackageReference` for
  `Microsoft.OpenApi 2.9.0` to override the transitive `2.0.0` pulled
  by `Microsoft.AspNetCore.OpenApi 10.0.9`.
- Why: `Microsoft.OpenApi 2.0.0` is affected by GHSA-v5pm-xwqc-g5wc.
  Versions `2.0.1` and `2.1.0` are still flagged by `NU1903`; `2.9.0`
  is the smallest tested version in the 2.x line that clears the
  warning. `dotnet build` is now warning-free.

## Items intentionally not changed

- **Empty `ReservationService` / `IReservationService`.** The service
  exists as a placeholder; no logic to review yet.
- **`EntityBase` has public setters on `Id`, `CreatedAt`, `UpdatedAt`.**
  Inconsistent with the `private set` style used by the derived
  entities. Also, `UpdatedAt` only refreshes when `Update()` is called
  manually. Both worth revisiting when the domain grows.

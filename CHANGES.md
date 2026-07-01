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

## Items intentionally not changed

These were noted during the review but left as-is because they are design
decisions rather than clear bugs. They can be revisited later:

- **String business keys used as foreign keys.** `Reservation.FacilityId` and
  `Reservation.KfupmId` (and the equivalents on `EventParticipant`) reference
  the business identifiers (`FacilityId`, `KfupmId`) instead of the `Guid Id`
  primary key inherited from `EntityBase`. This works because those columns
  have unique indexes, but it is unconventional. Switching to `Guid` FKs
  would be a larger schema change and was left for a follow-up decision.
- **`AllowedRole` does not include `Student` or `Admin`.** `UserRole` defines
  five roles but `AllowedRole` defines only four (no `Student`, no `Admin`).
  This may be intentional (students are never gated by role, admins bypass
  gating), but it should be confirmed before locking in.
- **Empty `ReservationService` / `IReservationService`.** The service exists
  as a placeholder; no logic to review yet.
- **`Microsoft.OpenApi 2.0.0` vulnerability warning.** `dotnet build` emits
  `NU1903` for `Microsoft.OpenApi 2.0.0` (pulled transitively). Worth
  bumping to a patched version, but that is outside the scope of this pass.

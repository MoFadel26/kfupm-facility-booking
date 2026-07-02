# Phase 4 Plan — Frontend

Date: 2026-07-02. Stack fixed by the task: React + Vite + TypeScript, Tailwind CSS, shadcn/ui
(Radix primitives). Lives in `/frontend` at the repo root.

## Design direction

"Institutional ledger": warm paper-toned background, deep oxide-green primary, IBM Plex type
family (Serif for page headings, Sans for UI, Mono for business ids/timestamps), quiet dense
tables with muted status badges. Professional admin tone with a distinct identity — no default
shadcn grey-on-white.

## Decisions

1. **No AutoMapper-equivalents on the client:** hand-written TypeScript interfaces in
   `src/types/api.ts` mirroring the backend DTOs exactly (enums as string unions, matching
   `JsonStringEnumConverter`).
2. **Typed fetch wrapper** (`src/api/client.ts`) rather than axios — zero extra dependency; it
   parses RFC 7807 `ProblemDetails` errors (including `ValidationProblemDetails.errors`) into a
   typed `ApiError` so pages can toast the backend's message verbatim.
3. **State: plain React hooks** (`useState`/`useEffect` + a small `useLoad` helper). No TanStack
   Query/Redux — four list pages don't justify the dependency.
4. **Forms: controlled inputs + manual validation** mirroring the DTO attributes (required,
   max length, email shape, count ≥ 1, end > start). No react-hook-form/zod — keeps the
   dependency surface small; the backend re-validates everything anyway and its 400/409 details
   are surfaced in the form/toast.
5. **Routing: react-router-dom** (the boring standard).
6. **Toasts: sonner** via the shadcn `sonner` component (shadcn's current recommendation,
   replacing the deprecated toast component).
7. **Delete = shadcn `alert-dialog` confirmation** everywhere.
8. **Dates:** `datetime-local` inputs, converted to ISO with the local offset on submit;
   displayed with `Intl.DateTimeFormat`.

## Folder structure

```
frontend/
  .env               VITE_API_BASE_URL=http://localhost:5049 (gitignored)
  .env.example
  src/
    api/             client.ts + users.ts, facilities.ts, reservations.ts, participants.ts
    types/api.ts     DTO mirrors + enum unions + option lists
    components/
      ui/            shadcn components (generated)
      layout/        AppShell (sidebar nav + header)
      shared/        ConfirmDelete, EmptyState, LoadingRows, FieldError, StatusBadge
    pages/           DashboardPage, UsersPage, FacilitiesPage, ReservationsPage,
                     ParticipantsPage
    lib/             utils.ts (shadcn cn), datetime.ts
```

## Pages ↔ endpoints

| Route | Page | Endpoints consumed |
|---|---|---|
| `/` | Dashboard: entity counts + upcoming reservations | GET users, facilities, reservations, eventparticipants |
| `/users` | Users table + create/edit dialog + delete | GET/POST `/api/users`, GET/PUT/DELETE `/api/users/{id}` |
| `/facilities` | Facilities table + create/edit dialog + delete | GET/POST `/api/facilities`, GET/PUT/DELETE `/api/facilities/{id}` |
| `/reservations` | Reservations table (facility/user filter) + create/edit + delete | GET `/api/reservations[?userId|facilityId]`, POST, GET/PUT/DELETE `/{id}` |
| `/participants` | Participants table (reservation filter) + add + remove | GET `/api/eventparticipants[?userId|reservationId]`, POST, DELETE `/{id}` |

Every backend endpoint from Phase 3 has a client function; `GET /{id}` variants exist in the
client for completeness even where list data already suffices.

## shadcn/ui components per page

- Shell/nav: `button`, custom sidebar (plain Tailwind).
- All entity pages: `table`, `dialog`, `alert-dialog`, `button`, `input`, `label`, `select`,
  `badge`, `sonner` (toaster), `card` (dashboard stats), `textarea` (reservation reason).

## Verification plan

Backend + frontend running together; for every entity: list loads, create works, edit works
(participants: create/delete only — no update endpoint by design), delete works, invalid input
shows an error. Programmatic verification via the typed API client run under Node against the
live backend, plus `tsc`/`vite build` for type-level correctness of every page, plus a served
dev-server check. Results recorded below.

## Verification

Ran 2026-07-02 with backend (`http://localhost:5049`) and frontend (`http://localhost:5173`)
running together.

1. **Type-level:** `npm run build` (tsc -b + vite build) — clean, no errors.
2. **CORS:** preflight `OPTIONS /api/users` with `Origin: http://localhost:5173` → 204 with
   `Access-Control-Allow-Origin: http://localhost:5173`; actual requests carry the header too.
3. **Real-browser click-through** (Playwright/Chromium driving the actual UI): **22/22 passed** —
   - Dashboard renders with stat cards and upcoming-reservations table.
   - **Users:** seed row listed; empty-form submit shows client-side field errors; create adds a
     row; duplicate email surfaces the backend 409 as a toast; edit renames the row; delete
     while owning a reservation surfaces the FK-guard 409 toast; delete afterwards removes the
     row.
   - **Facilities:** seed row listed; create, edit, delete all reflected in the table.
   - **Reservations:** seed row listed; create via facility/user selects + datetime-local inputs
     works; status edit to Confirmed reflected with badge; overlapping-slot create surfaces the
     409 toast; delete works.
   - **Participants:** page renders; add via selects works; duplicate add surfaces 409 toast;
     remove works.
4. One issue found and fixed during verification: `ConfirmDelete` left the confirmation dialog
   open after a failed (409) delete, blocking further interaction — the dialog now closes after
   the attempt either way, leaving the toast visible.

All E2E test data was removed through the UI itself (the delete flows are part of the test);
the seed row remains.

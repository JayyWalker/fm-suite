# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FM26 Staff Rating Tool: a roster manager for Football Manager staff members. Users enter (or OCR-import
from a screenshot) a staff member's FM attributes; the backend scores them per role and the frontend
displays star ratings and a "best fit" category.

- `backend/` — Fastify + better-sqlite3 API (port 3002 by default), plus the OCR pipeline.
- `frontend/` — Vite + React UI (dev server proxies `/staff` to the backend).
- `docs/KNOWN_ISSUES.md` — running log of known bugs/gaps; check before touching OCR or scoring.
- `docs/superpowers/` — specs and plans for past and in-progress features, written via the superpowers
  skill workflow (`specs/` = design docs, `plans/` = implementation plans).

## Commands

This is a pnpm workspace (`pnpm-workspace.yaml` lists `backend` and `frontend`); use pnpm, not npm. Run
from the repo root unless noted.

```
pnpm install         # installs both packages' dependencies
pnpm run dev         # runs backend + frontend dev servers in parallel
pnpm test            # backend tests, then frontend tests
```

Per-package (run with `--filter ./backend` / `--filter ./frontend`, or `cd` into the directory — package
names are `staff-rating-backend`/`staff-rating-frontend`, not `backend`/`frontend`, so filtering by bare
name won't match):

```
pnpm --filter ./backend run dev     # tsx watch src/index.ts
pnpm --filter ./frontend run dev    # vite
pnpm run test                       # vitest run (both packages, run from within either directory)
pnpm run typecheck                  # tsc --noEmit (both packages)
pnpm --filter ./frontend run build  # vite build
```

Single test file or test name (vitest):

```
cd backend && pnpm exec vitest run src/roles/coach.test.ts
cd frontend && pnpm exec vitest run -t "some test name"
```

The backend's default DB path is `./data/staff.sqlite` (override with `DB_PATH` env var); tests use
`:memory:`. The frontend's default API base is same-origin (override with `VITE_API_BASE_URL`).

## Architecture

### Role definitions are duplicated by design, in two parallel registries

Every staff role (coach, scout, physio, hoyd, dof, dataAnalyst, sportsScientist, headOfSportsScience,
headPhysio, setPieceCoach, performanceAnalyst, headPerformanceAnalyst, recruitmentAnalyst,
technicalDirector, loanManager) has a file in **both**:

- `backend/src/roles/<role>.ts` — scoring logic: attribute shape, category list, `rate()` function, JSON
  schema for validation. Aggregated into `ROLES` in `backend/src/roles/index.ts`.
- `frontend/src/roles/<role>.ts` — UI shape only: form field groups, which fields count as "mental",
  extra display-only attribute groups, default attribute values. Aggregated into `ROLES` in
  `frontend/src/roles/index.ts`.

Both sides export role-prefixed names (e.g. `rateCoach`/`coachAttributesSchema` on the backend,
`coachFormGroups`/`coachDefaultAttributes` on the frontend) so they can be imported into their
respective registries without aliasing. **Adding or changing a role means touching both directories**,
plus `backend/src/ocr/attributeLabels.ts` (maps attribute keys to the exact label FM26 renders on
screen, used by OCR import) if the role supports screenshot import. The `StaffRole` union and
`STAFF_ROLES` array are independently declared in both `roles/index.ts` files and must be kept in sync
by hand — nothing enforces this at compile time.

Scoring itself happens only on the backend (`backend/src/scoring.ts`): every role's `rate()` computes a
0.7/0.3 weighted blend of a role-specific primary attribute and a mental-attribute average, then maps
that onto a 1-5 star scale. These weights are the project's own approximation of FM26's internal
formula (not derived from or verified against disclosed game mechanics) and are expected to be retuned
against observed results — see the comment at the top of `scoring.ts` before changing them.

### Request flow

`backend/src/server.ts` wires Fastify routes directly to `StaffRepository` (SQLite CRUD in
`backend/src/staffRepository.ts`, attributes stored as a JSON blob column) and to `ROLES[role].rate()`
for scoring. `backend/src/staffSchemas.ts` holds both Fastify route schemas and `validateAttributes`,
a hand-rolled validator (not using the role's JSON schema through ajv) that enforces the attributes
object has exactly the role's required keys, nothing more or less.

The frontend (`frontend/src/App.tsx`) is a single-page CRUD UI with no router: a roster list
(`RosterView`), an add/edit form (`StaffForm`), and screenshot upload (`ScreenshotUpload`). All server
calls go through `frontend/src/api/staffApi.ts`.

### OCR import pipeline (screenshot → attributes)

`POST /staff/parse-screenshot` runs: `preprocessImage` (sharp) → `runOcr` (tesseract.js, bundled
`eng.traineddata`) → `extractLinePairs` (fuzzy-matches OCR text against known attribute labels and
ability words like "Good"/"Very Good") → either `parseAttributes` (numeric attributes) or
`parseNationKnowledge` (scout's nation/tier list) depending on `role`/`panel`.

This pipeline has several known failure modes documented in `docs/KNOWN_ISSUES.md` — notably that
`parseAttributes` resolves each label on its *first* matching OCR line rather than best-match, which
can misassign values when two labels are a close edit-distance apart (e.g. Technical Director's
"Judging Staff Ability" vs. "Judging Player Ability"). Check that doc before changing matching logic
in `backend/src/ocr/`, and add an entry there (with a short pointer comment in the code) rather than
fixing-and-forgetting if you find a related gap you don't fix immediately.

### Database migration

`backend/src/db.ts` has a one-time migration (`migrateIfNeeded`) from an old fixed-columns `staff`
table (coach-only attributes as individual columns) to the current shape (`role` + JSON `attributes`
blob). It runs automatically on `createDb()` against any pre-existing old-shape database.

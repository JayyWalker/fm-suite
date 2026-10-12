# FM26 Coach Rating Tool — Design

## Purpose

A local tool for rating and comparing Football Manager 26 coaching staff. FM26
shows staff attributes as qualitative labels (e.g. "Outstanding") rather than
numbers, and doesn't expose how those attributes translate into the star
ratings shown for each training area. This tool lets the user manually enter
a coach's attributes and get back an estimated per-training-area star
breakdown, so they can:

- Compare their existing coaching staff against each other
- Screen a prospective signing/candidate before hiring
- Save coaches/candidates to a roster for later reference

Scope for this design: **coaches only** (not scouts, physios, or other
backroom roles). Input is **manual entry only** — screenshot/OCR input is an
explicitly deferred phase 2, not built now.

## Non-goals (v1)

- No modeling of the "spread thin" penalty (a coach's effective rating
  dropping when assigned to multiple training areas in-game). Ratings are
  raw per-category suitability computed from attributes alone.
- No screenshot/OCR input.
- No multi-save/club boundaries — one flat, taggable roster.
- No exact reproduction of FM26's or fmscout.com's internal formula. Neither
  is publicly disclosed, and reverse-engineering fmscout's calculator would
  require automating requests against their server, which this project
  avoids. The scoring in this tool is an explicitly-labeled approximation
  based on documented FM mechanics (see below), tunable later.

## Architecture

Monorepo with two packages:

- `frontend/` — React + TypeScript SPA, built with Vite
- `backend/` — Node.js + TypeScript, Fastify API server, SQLite storage
  (via `better-sqlite3`)

A future `ocr/` directory will hold a Python helper (pytesseract + OpenCV)
for phase-2 screenshot parsing. It is not created in this phase; the backend
will shell out to or call it once that phase is designed.

`npm run dev` at the repo root runs both frontend and backend concurrently
for local use. No deployment target — this is a local-only tool run on the
user's own machine.

## Data model

Single SQLite table, `staff`:

| Column               | Type    | Notes                                   |
|-----------------------|---------|------------------------------------------|
| `id`                 | INTEGER | Primary key                              |
| `name`               | TEXT    |                                           |
| `tags`               | TEXT    | JSON-encoded string array, e.g. `["Shortlist"]` |
| `authority`          | INTEGER | 1–8                                       |
| `determination`      | INTEGER | 1–8                                       |
| `motivating`         | INTEGER | 1–8                                       |
| `attacking`          | INTEGER | 1–8                                       |
| `defending`          | INTEGER | 1–8                                       |
| `fitness`            | INTEGER | 1–8                                       |
| `goalkeeping`        | INTEGER | 1–8                                       |
| `possession`         | INTEGER | 1–8                                       |
| `set_pieces`         | INTEGER | 1–8                                       |
| `tactical`           | INTEGER | 1–8                                       |
| `technical`          | INTEGER | 1–8                                       |
| `tactical_knowledge`  | INTEGER | 1–8                                       |
| `created_at`         | TEXT    | ISO timestamp                            |
| `updated_at`         | TEXT    | ISO timestamp                            |

The 1–8 integers map to FM's qualitative labels: 1 Unsuited, 2 Reasonable,
3 Competent, 4 Average, 5 Good, 6 Very Good, 7 Outstanding, 8 Elite.

**Star ratings and best-fit category are computed on read, never stored.**
This means tuning the scoring formula later requires no migration or data
recompute — every existing row is re-scored automatically with the new
weights.

## Scoring approximation

Seven training-area categories: Attacking, Defending, Fitness, Goalkeeping,
Possession, Set Pieces, Tactical.

For each category, a **primary attribute** maps 1:1 to the same-named
column, except Tactical, whose primary is the average of `tactical`,
`technical`, and `tactical_knowledge`.

```
categoryScore (1–8) = 0.7 × primaryAttribute + 0.3 × holyTrinityAvg
holyTrinityAvg = average(determination, authority, motivating)
```

`categoryScore` is then linearly mapped from the 1–8 scale to a 1–5 star
rating. A coach's "best fit" is whichever category scores highest; ties are
broken by category order as listed above (Attacking first, Tactical last).

All weights and the star-mapping thresholds live in one small, isolated
module (`backend/src/scoring.ts`), with a comment stating plainly that this
is this project's own approximation of FM26 mechanics — not FM's or
fmscout's actual formula — and is expected to be retuned later against
observed in-game results.

## API (Fastify, TypeScript)

- `GET /staff` — list all, each with computed category star breakdown + best-fit
- `GET /staff/:id` — single record, same computed fields
- `POST /staff` — create (name, tags, 12 attributes)
- `PATCH /staff/:id` — edit
- `DELETE /staff/:id`

All routes validate request bodies with Fastify JSON-schema validation;
malformed payloads get a 400.

## Frontend

React + TypeScript SPA. Main view is a **split layout**:

- **Left pane**: sortable table of all staff (Name, Tags, Best-fit category +
  stars). Sortable by any category's star rating. Tag filter chips.
- **Right pane**: detail panel for the selected staff member — full 7-category
  star breakdown plus the holy-trinity attributes.

**Hover/pin interaction** (validated via interactive prototype):

- Hovering a row with nothing pinned live-previews that row in the right
  pane (replaces its contents, labeled "Preview").
- Clicking a row **pins** it — right pane locks to that staff member
  (labeled "Pinned"), row gets a highlighted left-edge marker.
- While a row is pinned, hovering a *different* row does **not** disturb the
  pinned right pane. Instead, a small floating hoverbox appears near the
  cursor showing just the holy-trinity attributes (Determination, Authority,
  Motivating) and the best-fit category + stars — a quick comparison glance
  without losing the pinned detail.
- Clicking the pinned row again unpins it, returning to hover-preview mode.

A separate **Add/Edit form**: name, tags input, and 12 attribute dropdowns
using FM's 8-level qualitative scale (Unsuited…Elite) — no free text, so
invalid attribute values are impossible from the UI.

## Error handling

- Attribute dropdowns constrain input to the 8 valid labels client-side.
- Fastify JSON-schema validation rejects malformed API payloads (400).
- SQLite database file is created automatically on first run if missing.

## Testing

- **Scoring module**: pure function, unit-tested with known attribute
  combinations → expected star ratings (Vitest).
- **API routes**: integration tests via Fastify's `.inject()` (Vitest).
- **Frontend**: component tests for the attribute form (dropdown
  constraints) and the roster table (sorting, hover/pin behavior), using
  Vitest + React Testing Library. No end-to-end tests in v1.

## Deferred (explicitly out of scope, revisit later as their own task)

- Screenshot/OCR input via a Python helper (pytesseract + OpenCV),
  invoked by the Fastify backend.
- Assignment-load modeling (the "spread thin" multi-area penalty).
- Additional staff roles beyond coaches (scouts, physios, Head of Youth
  Development, Director of Football, data analysts).
- Save/club-scoped roster boundaries.

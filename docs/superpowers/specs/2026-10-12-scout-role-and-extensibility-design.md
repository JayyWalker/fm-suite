# Scout Role and Staff-Role Extensibility — Design

## Purpose

The tool currently supports exactly one kind of staff member — coaches —
with their attribute shape, scoring formula, and UI hardcoded throughout
the backend and frontend. This design adds **Scout** as a second staff
role, and generalizes the architecture so that a third, fourth, etc. role
(Physio, Director of Football, Head of Youth Development — all previously
deferred) can be added later by writing one new role module, not by
touching the shared plumbing again.

Scope for this design: add the **Scout** role end-to-end, and the
role-registry architecture needed to support it. No other new roles are
built now; the registry's job is to make building them later cheap.

## Research grounding

FM26 scout quality is driven by two attributes treated as *separately*
relevant — Judging Player Ability (JPA) and Judging Player Potential
(JPP) — plus Determination and Adaptability as secondary mental
attributes, and a per-region "Scouting Knowledge" mechanic covering 19
FM26 scouting regions (Western Europe, Central Europe, UK and Ireland,
Southern Europe, South Eastern Europe, North Eastern Europe, Northern
Europe, Eastern Europe, South America North, South America South, North
America, Western Africa, Central Africa, Southern Africa, North Africa,
Middle East, East Asia, South East Asia, Oceania).

Sources: [FM Dossier — Reading a Scout
Report](https://fmdossier.dev/guides/reading-a-scout-report),
[FootballGPT — FM Scouting
Guide](https://footballgpt.co/fm/fm-scouting), web search results for
FM26 scouting regions.

## Non-goals

- No other new roles (Physio, DoF, Head of Youth Development) built in
  this pass — only the registry plus Scout.
- No dynamic/sparse regional-knowledge entry (add-a-region-at-a-time UI).
  All 19 regions are fixed dropdown fields, same pattern as every other
  attribute, even though most scouts will realistically only have
  non-default values in a handful of them.
- No changing a staff member's role after creation. `role` is set once
  at creation and is immutable; `PATCH` can change `name`/`tags`/
  `attributes` but never `role`.
- No cross-role scoring comparison (e.g. ranking a Scout against a Coach
  on a single combined scale). Categories are role-scoped; the only
  cross-role UI surface is the roster table's Type column/filter and the
  "sort by category" control, which simply shows whatever categories are
  present across the visible staff.

## Architecture: a role registry

Both backend and frontend gain a `roles/` module per staff role:
`roles/coach.ts`, `roles/scout.ts`. Each backend role module exports:

- its attributes interface (`CoachAttributes`, `ScoutAttributes`)
- its categories, in tie-break order (`CATEGORIES`)
- a `rate(attrs): StaffRatings` function
- a JSON schema for its attributes shape, used for request validation

A small registry object (`ROLES: Record<StaffRole, RoleDefinition>` in
`backend/src/roles/index.ts`) lets `server.ts` look up the right rate
function and schema by `role` instead of hardcoding coach's shape. The
weighted-formula *shape* (primary attribute × 0.7 + mental average × 0.3,
linearly mapped 1–8 → 1–5 stars) is identical across roles and stays in
one shared utility (`backend/src/scoring.ts` keeps `weightedStars()` and
the disclaimer comment); each role module supplies its own primary/
mental attribute wiring into that shared function.

The frontend gets an equivalent `roles/` directory exporting, per role:
`formGroups` (for `StaffForm`), `mentalFields` (the generalized "holy
trinity" — attributes highlighted as chips in `DetailPanel`/
`HoverTooltip`), and `extraDisplayGroups` (role-specific display-only
sections with no scoring role — Scout's Regional Knowledge is the first
example of this; Coach has none).

## Data model

The `staff` table drops its 12 rigid coach-only columns in favor of:

```sql
CREATE TABLE staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  attributes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

`attributes` is a JSON object whose shape depends on `role`. This costs
nothing functionally — the app already loads whole rows and scores them
in JS, never querying by individual attribute in SQL — and means adding
role #3 later needs no schema migration at all, only a new JSON shape.

**Migration.** `createDb()` checks, on every startup, whether the `staff`
table exists in the old rigid-column shape (presence of an `authority`
column via `PRAGMA table_info(staff)`). If so, it migrates in a single
transaction: create a new table in the shape above, copy every existing
row into it with `role = 'coach'` and `attributes` built from the 12 old
columns, drop the old table, rename the new one into place. A fresh
database, or one already in the new shape, is a no-op either way — the
existing `CREATE TABLE IF NOT EXISTS` continues to handle "doesn't exist
yet" on its own.

### TypeScript shape

`StaffMember`/`StaffInput`/`StaffRecord` become a **discriminated union**
on `role`, not a loosely-typed `Record<string, number>`:

```ts
type StaffRole = "coach" | "scout";

interface CoachAttributes { authority: number; determination: number; /* ...unchanged, same 12 fields */ }
interface ScoutAttributes {
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  westernEurope: number;
  centralEurope: number;
  ukAndIreland: number;
  southernEurope: number;
  southEasternEurope: number;
  northEasternEurope: number;
  northernEurope: number;
  easternEurope: number;
  southAmericaNorth: number;
  southAmericaSouth: number;
  northAmerica: number;
  westernAfrica: number;
  centralAfrica: number;
  southernAfrica: number;
  northAfrica: number;
  middleEast: number;
  eastAsia: number;
  southEastAsia: number;
  oceania: number;
}

type StaffMember =
  | { id: number; role: "coach"; name: string; tags: string[]; attributes: CoachAttributes; categories: Record<string, number>; bestFit: string; createdAt: string; updatedAt: string }
  | { id: number; role: "scout"; name: string; tags: string[]; attributes: ScoutAttributes; categories: Record<string, number>; bestFit: string; createdAt: string; updatedAt: string };
```

(`StaffInput`/`StaffRecord` mirror this shape minus the computed/
timestamp fields where appropriate.) This keeps TypeScript narrowing
`attributes`'s type from `role` wherever a `StaffMember` is handled,
rather than giving up type safety for extensibility.

## Scout role specifics

- **Attributes**: JPA, JPP, Determination, Adaptability, and all 19
  regions above — all on the existing 1–8 qualitative scale.
- **Categories**: `"Current Ability Judging"` and `"Potential Judging"`,
  in that tie-break order. Score = `weightedStars(primary, mentalAvg)`
  where `primary` is JPA or JPP respectively and `mentalAvg =
  average(determination, adaptability)` — the same formula shape as
  coaches, just different fields feeding in. `bestFit` is whichever
  category scores higher, ties broken toward `"Current Ability
  Judging"`.
- **Regional knowledge** is displayed (its own "Regional Knowledge"
  section in `DetailPanel`, chips via the existing `rawAttributeToStars`
  conversion) but **not** scored into categories — it answers "where is
  this scout useful," not "how good is this scout," so it stays out of
  the weighted formula entirely, the same way raw coaching attributes
  (Attacking, Defending, …) are entered but never individually displayed
  once categories are computed from them.

## API

Routes are unchanged (`GET/POST/PATCH/DELETE /staff`, `/staff/:id`).
Request/response bodies gain `role`:

- `POST /staff` body: `{ name, role, tags?, attributes }`, where
  `attributes`'s required shape depends on `role`. `name`/`role`/`tags`
  validate declaratively via Fastify's JSON schema as before; `role`
  must be one of the registered role keys. `attributes` is validated by
  looking up that role's own JSON schema from the registry and running
  it inside the route handler (rather than forcing Fastify's schema
  system into a deeply nested conditional-on-sibling-field shape) —
  still a 400 on failure, just resolved one level later than today's
  single-schema check.
- `PATCH /staff/:id` never accepts `role`; attempting to change it is
  ignored (the existing record's role is always kept). `attributes`, if
  provided, is validated against the *existing* record's role.
- `GET` responses include `role` alongside the existing fields; the
  `categories` object's keys depend on the record's role.

## Frontend

- **Roster table**: a new sortable **Type** column (Coach/Scout, same
  click-to-sort pattern as Name/Best fit) plus toggleable Type filter
  chips above the table (same component pattern as the existing tag
  filter chips, just filtering by `role` instead of `tags`). The
  existing "sort by category" dropdown now lists the union of category
  names actually present across the currently-visible staff, so sorting
  by "Fitness" with only Scouts visible simply shows no distinction —
  acceptable rough edge, not worth a smarter dynamic list for this pass.
- **Detail panel / hover tooltip**: render the role's `mentalFields` as
  chips (generalizing today's hardcoded holy-trinity section), the
  role's `categories` (already generic — `Record<string, number>`
  doesn't care what the keys are), and, if the role defines
  `extraDisplayGroups`, those as additional chip sections (Scout's
  Regional Knowledge).
- **Add/edit form**: "Add staff" opens a small role picker (Coach /
  Scout) as step one of the modal dialog; picking a role shows that
  role's `formGroups`. Editing an existing staff member skips the picker
  (role is fixed) and goes straight to that role's form, pre-filled.

## Error handling

- Same baseline as today: attribute values outside 1–8 rejected with
  400, missing/malformed `tags` default to `[]`, 404 on an unknown id.
- New: an unrecognized `role` value is rejected with 400. An
  `attributes` object that doesn't match its role's required shape
  (missing fields, extra fields) is rejected with 400, same strictness
  as today's coach-only validation.
- The startup migration is all-or-nothing in one transaction; if it
  fails partway, the original table is left untouched (nothing is
  dropped until the new table is fully populated).

## Testing

- **Migration**: seed the old rigid-column shape directly into a
  `:memory:` db, boot `createDb` against it, assert every row survived
  with `role='coach'` and the correct `attributes` JSON.
- **Scout scoring**: mirrors the existing coach scoring tests — known
  attribute combinations → expected stars per category, plus the same
  tie-break-by-category-order test shape.
- **Role registry / API**: `POST /staff` with `role: "scout"` and a
  valid scout attributes object succeeds; an invalid shape (missing
  JPA, or a coach-shaped `attributes` with `role: "scout"`) gets 400;
  `PATCH` cannot change `role`.
- **Component genericness**: every existing coach-fixture component test
  gets a scout-fixture sibling (or parameterized variant) proving
  `StaffTable`/`DetailPanel`/`HoverTooltip` render correctly from the
  role definition rather than from hardcoded coach assumptions — a
  roster mixing one coach and one scout exercises the Type column/filter
  and the cross-role category-sort dropdown together.

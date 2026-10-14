# Screenshot/OCR Staff Attribute Input — Design

## Context

Manual entry of staff attributes was the explicit non-goal exclusion from the
original Phase 0 design (`2026-10-12-coach-rating-tool-design.md`), which
deferred OCR entirely. This spec covers that deferred work: letting a user
upload a screenshot of FM26's in-game staff attributes screen and have this
app read the values instead of typing every field by hand.

The design here is grounded in eleven real FM26 screenshots the user
supplied across Medical, Coaching, and Scouting tabs, covering Sports
Scientist, Coach, Head of Youth Development, Director of Football, Technical
Director, Physio, Fitness Coach, Performance Analyst, and Scout. Two
assumptions from the original brainstorming were corrected by those
screenshots and are captured below as settled facts, not options.

## Settled facts from the screenshots

1. **FM26 displays attribute ability as words, not 1-20 numbers.** Every
   attribute — Medical, Coaching, Scouting, Mental, Knowledge — renders as
   one of exactly 8 words: `Unsuited`, `Reasonable`, `Competent`, `Average`,
   `Good`, `Very Good`, `Outstanding`, `Elite`. This is a byte-for-byte match
   to the `ATTRIBUTE_LEVELS` scale already in
   `frontend/src/types.ts:16-23`. There is no numeric banding to do — OCR
   parsing for every standard attribute is a closed 8-word vocabulary match,
   not a number read.
2. **FM26's "Scouting Knowledge" panel uses a different, unrelated 7-word
   scale**, shown per nation (e.g. "Germany: Complete", "Austria:
   Exceptional"), not per broad region: `None`, `Minimal`, `Good`,
   `Very Good`, `Extensive`, `Exceptional`, `Complete`. This scale is
   distinct from the 8-word ability scale (different length, different
   semantics — knowledge depth, not ability) and must not be conflated with
   it.
3. **Scout's existing 19 region fields don't correspond to anything FM26
   actually shows.** `backend/src/roles/scout.ts:9-33` and
   `frontend/src/roles/scout.ts:3-25` model regional knowledge as 19 fixed
   broad-region keys (`westernEurope`, `ukAndIreland`, etc.) on the 8-word
   ability scale. FM26 has no such concept — it shows per-nation knowledge
   only. Today a user manually eyeballs several nations and picks an
   approximate region-level ability value. Per explicit user decision, this
   is being replaced, not preserved: **Scout moves to a sparse, dynamic list
   of `{nation, tier}` entries** using FM26's own 7-word knowledge scale,
   matching what the game actually shows. No data migration is needed — no
   existing Scout records need to be preserved through this change.
4. Confirmed by reading `rateScout()` in `backend/src/roles/scout.ts:48-68`:
   region fields are **not used in scoring at all** — only `jpa`, `jpp`,
   `determination`, and `adaptability` feed `combinedScore`. Replacing
   regions with nation knowledge is a pure data/display change with zero
   scoring-logic risk.
5. Confirmed by `grep` across `frontend/src/roles/` and `backend/src/roles/`:
   no role other than Scout references `ScoutAttributes` or region fields.
   This change is fully scoped to the Scout role.

## Goals

- Let a user upload one or more screenshots of FM26's staff attribute
  screens and have this app pre-fill the attribute form, for any role.
- Convert Scout's regional-knowledge modeling from 19 fixed broad regions to
  a sparse per-nation list, matching how FM26 actually represents it.
- Leave every existing save/validation path (`POST`/`PATCH /staff`)
  completely unchanged — OCR only ever populates the in-progress form draft
  the user is already reviewing before they save.

## Non-goals

- No attempt to OCR anything other than the staff attributes screen (no
  player screens, no other FM views).
- No client-side/browser OCR — this is explicitly server-side, per prior
  decision.
- No attempt to infer or auto-select which role a screenshot belongs to —
  the user has already chosen a role in the form before uploading.
- No generic "dynamic list" abstraction added to the shared `RoleUIDefinition`
  registry (`frontend/src/roles/index.ts:133-141`) for other roles'
  potential future use. Scout is the only role needing a non-fixed-shape
  attribute set; this is special-cased for Scout rather than generalized,
  consistent with this project's standing preference against speculative
  abstraction.

## Architecture

### Backend: `backend/src/ocr/`

- **`preprocessImage.ts`** — uses `sharp` to greyscale, stretch contrast,
  and upscale (2x) the uploaded image before OCR, improving recognition of
  FM's UI font.
- **`runOcr.ts`** — wraps `tesseract.js` (Node build), returning recognized
  text lines with per-line confidence scores.
- **`attributeLabels.ts`** — a per-role map of attribute key → display
  label (e.g. `{ physiotherapy: "Physiotherapy", determination:
  "Determination" }`), the minimal label data OCR needs to match against.
  This is a deliberate, small duplication of what `frontend/src/roles/*.ts`
  already has in `formGroups`, scoped to just the label strings (not full
  `AttributeGroup`/UI structure). Per the user's explicit prior decision on
  the general-cleanup task, true backend/frontend shared source is deferred
  to this repo's eventual monorepo migration — this follows the same
  reasoning rather than reopening it.
- **`nationKnowledgeVocabulary.ts`** — the 7-word knowledge scale
  (`None`→`Complete`, values 1-7), kept as its own constant, never merged
  with the 8-word ability scale.
- **`nations.ts`** — the canonical nation list for matching OCR'd nation
  names: ISO 3166-1 countries, with the United Kingdom replaced by its four
  home nations (England, Scotland, Wales, Northern Ireland) per ISO
  3166-2:GB subdivision codes, matching how FM26 itself separates them (as
  seen in the screenshots). This list is shared with the frontend's
  nation dropdown (see below) — duplicated the same way labels are, not
  imported cross-package.
- **`parseAttributes.ts`** — for standard (non-Scout-nation) attributes:
  splits each OCR'd line into a label part and a value part, fuzzy-matches
  the label against the role's `attributeLabels` (edit-distance tolerant of
  OCR noise, e.g. "Deternination"), matches the value against the 8-word
  ability vocabulary, and returns the corresponding 1-8 number directly.
  Returns `{ matched: Record<string, number>, unmatched: string[],
  lowConfidence: string[] }`.
- **`parseNationKnowledge.ts`** — Scout-only: fuzzy-matches each line's left
  part against `nations.ts`, the right part against the 7-word vocabulary,
  returning `{ nationEntries: { nation: string; tier: number }[], unmatched:
  string[], lowConfidence: string[] }`.

### Backend: new endpoint

`POST /staff/parse-screenshot` — accepts a multipart image upload plus
`role` (validated against `STAFF_ROLES`, same as existing endpoints) and,
for Scout only, a `panel` field (`"attributes"` or `"nationKnowledge"`)
selecting which parser to run. Returns the matched/unmatched/lowConfidence
shape from the relevant parser. This endpoint never creates or modifies a
staff record — it's a pure parsing utility. The existing `POST`/`PATCH
/staff` flow is completely unchanged.

### Backend: Scout role module changes

`backend/src/roles/scout.ts`:
- `ScoutAttributes` drops the 19 region fields, gains:
  ```ts
  nationKnowledge: { nation: string; tier: number }[];
  ```
- `scoutAttributesSchema` changes from `buildAttributesSchema([...])`
  (which assumes every key is a uniform 1-8 integer) to a schema with
  `required: ["jpa", "jpp", "determination", "adaptability",
  "nationKnowledge"]`, where `nationKnowledge` is validated as an array of
  `{ nation: string, tier: integer 1-7 }` objects, separately from
  `buildAttributesSchema`'s per-key integer logic.
- `rateScout()` is unchanged — it never touched region fields and doesn't
  need to touch `nationKnowledge` either.

### Frontend: Scout role module changes

`frontend/src/roles/scout.ts`:
- `ScoutAttributes` mirrors the backend shape:
  `nationKnowledge: { nation: string; tier: number }[]`.
- `regionFields`, the "Regional Knowledge" `formGroups` entry, and
  `extraDisplayGroups`' region group are removed.
- A new `NATION_KNOWLEDGE_LEVELS` constant (analogous to `ATTRIBUTE_LEVELS`
  in `types.ts`, but the 7-word scale) lives alongside the nation list.

### Frontend: new nation-knowledge editor (Scout-specific UI)

Since `nationKnowledge` isn't a fixed set of `{key, label}` fields, it can't
run through the existing generic `AttributeGroup` renderer the way every
other role's attributes do. `StaffForm` gets a Scout-only section: a list of
`{nation, tier}` rows, each with a nation dropdown+autocomplete (sourced
from the shared nation list) and a tier dropdown (the 7-word scale), plus
add/remove row controls. This is a special case in `StaffForm`, not a new
capability added to `RoleUIDefinition` — no other role needs it.

### Frontend: upload UI

In `StaffForm`, once a role is selected, an "Upload screenshot" control
appears:
- For every role: one upload populates the standard attribute fields.
- For Scout specifically: a second, separate upload area for nation
  knowledge screenshots, uploadable multiple times (merge-by-append) to
  cover scrolling past the first visible nations.

After any upload, matched values merge into the draft form state, and any
`unmatched`/`lowConfidence` entries render as a visible warning list near
the relevant fields (e.g. "Couldn't confidently read: Judging Player
Ability — please check manually"). The user can freely edit any field by
hand, same as today, before saving. Saving goes through the unchanged
`POST`/`PATCH /staff` flow.

## Data flow

1. User selects a role, uploads a screenshot of the matching FM tab.
2. Backend preprocesses the image (`sharp`) and runs `tesseract.js`,
   producing text lines with confidence scores.
3. **Standard attributes:** each line is split into label/value parts,
   fuzzy-matched against the role's labels and the 8-word vocabulary.
   Confident matches become `matched[key] = 1-8`; everything else goes to
   `unmatched` or `lowConfidence`.
4. **Nation knowledge (Scout only):** each line is split into nation/tier
   parts, fuzzy-matched against the nation list and the 7-word vocabulary,
   producing `{nation, tier}` entries.
5. Response returns `{matched, unmatched, lowConfidence}` or
   `{nationEntries, unmatched, lowConfidence}`.
6. Frontend merges into the draft: standard attributes overwrite by key
   (supports re-uploading a corrected screenshot); nation entries append,
   with a repeated nation being overwritten by the later read (supports
   multiple nation-knowledge screenshots covering a scrolled list).
   `unmatched`/`lowConfidence` render as warnings. Nothing persists until
   the user reviews and saves via the existing flow.

## Error handling

- Corrupt/unreadable image upload → `400` with a clear message; form state
  untouched.
- A line's label matches confidently but its value isn't in the relevant
  closed vocabulary → treated as unmatched, never guessed.
- Screenshot doesn't match the selected role/tab (e.g. a Scouting
  screenshot uploaded while Coach is selected) → naturally surfaces as
  "everything unmatched," an honest signal without needing explicit
  mismatch detection.
- A nation name OCR's to something not found in the canonical list within
  fuzzy-match tolerance → goes to `unmatched` with the raw OCR'd text
  shown, so the user can pick the correct nation from the dropdown rather
  than the read being silently dropped.
- Duplicate nation across multiple knowledge screenshots → last-read-wins,
  consistent with standard-attribute re-upload behavior.

## Testing

- **Backend unit tests:** `parseAttributes` and `parseNationKnowledge`
  against synthetic OCR-line fixtures (not real images) — exact matches,
  fuzzy/noisy label and nation matches, unknown words, and the
  all-unmatched "wrong tab uploaded" case. Vocabulary/label-map tests
  confirming every role's required attribute keys has a label, and that
  the 8-word and 7-word scales map to the correct numeric tiers at every
  boundary.
- **Backend endpoint test:** `POST /staff/parse-screenshot` with the OCR
  call mocked — verifies role/panel validation and response shape/merging,
  not real OCR accuracy (real-image OCR is slow and non-deterministic;
  `preprocessImage`/`runOcr` are verified manually against the actual
  screenshots during implementation, not via the automated suite).
- **Backend schema/scoring tests:** `scoutAttributesSchema` accepts a valid
  `nationKnowledge` array and rejects malformed entries (missing `nation`,
  out-of-range `tier`); `rateScout()` tests confirm scoring is unaffected
  by the region→nationKnowledge change (already true today, since region
  fields were never read by scoring).
- **Frontend tests:** `StaffForm` merge-on-upload behavior for both
  standard attributes (overwrite-by-key) and nation knowledge
  (append/last-wins); the unmatched/lowConfidence warning display; the new
  nation-knowledge add/remove row editor (add a row, pick nation + tier,
  remove a row), using mocked API calls in the existing `staffApi` mock
  pattern.

## New dependencies

- Backend: `tesseract.js`, `sharp`, and a multipart upload handler
  (`@fastify/multipart`) — none of which exist in `backend/package.json`
  today (currently only `better-sqlite3` and `fastify`).
- Frontend: a nation-name data source for the dropdown (ISO 3166-1 list)
  if no existing dependency already provides one.

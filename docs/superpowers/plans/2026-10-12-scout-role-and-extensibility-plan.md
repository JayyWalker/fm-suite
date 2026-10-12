# Scout Role and Staff-Role Extensibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Scout as a second staff role alongside Coach, via a role-registry architecture that lets future roles (Physio, Director of Football, Head of Youth Development) be added by writing one new role module rather than touching shared plumbing again.

**Architecture:** Backend and frontend each gain a `roles/` directory with one module per role (attributes shape, categories, scoring, and — frontend only — form/display grouping), looked up through a small registry instead of hardcoded coach assumptions. The `staff` table drops its 12 rigid coach columns for a `role` column plus a JSON `attributes` blob, migrated automatically from the old shape on startup.

**Tech Stack:** Same as the existing app — TypeScript throughout, Fastify + better-sqlite3 backend, React + Vite + CSS Modules frontend, Vitest + React Testing Library for tests.

**Spec:** [docs/superpowers/specs/2026-10-12-scout-role-and-extensibility-design.md](../specs/2026-10-12-scout-role-and-extensibility-design.md)

## Global Constraints

- All Node.js code (backend and frontend) is TypeScript.
- `role` is immutable after creation; `PATCH /staff/:id` never changes an existing record's role, even if one is sent.
- All 19 FM26 scouting regions are fixed dropdown fields on the Scout form — no dynamic/sparse region-entry UI.
- Regional knowledge attributes are displayed (as chips) but never scored into a Scout's categories.
- The weighted-formula shape (primary attribute × 0.7 + mental average × 0.3, linearly mapped 1–8 → 1–5 stars) lives in one shared backend utility (`backend/src/scoring.ts`) and is reused by every role's `rate()` function — never duplicated per role.
- No roles beyond Coach and Scout are built in this plan.
- No cross-role scoring comparison; categories are role-scoped. The only cross-role UI surfaces are the roster table's Type column/filter and the category-sort dropdown (which lists whatever categories are present across visible staff).
- The startup migration is all-or-nothing in one transaction; if it fails partway, the original table is left untouched.

## Review Focus

- Migration must preserve every existing coach row's data exactly (name, tags, all 12 attributes, timestamps) when upgrading an old-shape database — not just "it doesn't crash."
- `POST /staff` with `role: "scout"` but a coach-shaped `attributes` object (or vice versa) must be rejected with 400, not silently accepted with missing fields.
- `PATCH /staff/:id` that sends a different `role` than the existing record must be ignored (existing role kept), not cause a type-mismatched attribute merge or a crash.
- Sorting the roster table by a category name that only some visible staff have (e.g. "Fitness" while a Scout row is visible) must not crash — a staff member with no value for that category sorts as if it were lowest, not `NaN`/throw.
- A roster mixing a coach and a scout must render every shared affordance (hover preview, pin, tag filter, delete confirm) correctly for both kinds of rows, not just for whichever role was implemented first.

---

## Task 1: Shared scoring utility + role type scaffolding

**Files:**
- Modify: `backend/src/scoring.ts`
- Modify: `backend/src/scoring.test.ts`
- Create: `backend/src/roles/index.ts`
- Test: `backend/src/roles/index.test.ts`

**Interfaces:**
- Produces: `combinedScore(primary: number, mentalAverage: number): number` and `scoreToStars(score: number): number` from `scoring.ts`; `StaffRole` (`"coach" | "scout"`), `STAFF_ROLES: StaffRole[]`, `StaffRatings` (`{ categories: Record<string, number>; bestFit: string }`), `RoleDefinition` interface (`{ key: StaffRole; categories: string[]; rate(attributes: Record<string, number>): StaffRatings; attributesSchema: object }`) from `roles/index.ts`.

- [ ] **Step 1: Write the failing tests for the trimmed scoring utility**

`scoring.ts` currently exports `rateStaff`/`StaffAttributes`/`Category`/
`CATEGORIES`, still used by today's `staffRepository.ts` and `server.ts`.
Those two files aren't migrated to the role registry until Task 5, so
this task must **add** `combinedScore`/`scoreToStars` as new exports
alongside the existing ones, not replace the file — deleting the old
exports now would break the backend's compile for several tasks. The old
exports and their tests are deleted later, in Task 5, in the same commit
that removes their last consumer.

Add to the end of `backend/src/scoring.test.ts` (keep the existing
content above it untouched):

```ts
import { combinedScore, scoreToStars } from "./scoring";

describe("combinedScore", () => {
  test("weights the primary attribute more heavily than the mental average", () => {
    expect(combinedScore(8, 1)).toBeCloseTo(5.9);
    expect(combinedScore(1, 8)).toBeCloseTo(3.1);
  });

  test("an equal primary and mental average returns that same value", () => {
    expect(combinedScore(5, 5)).toBeCloseTo(5);
  });
});

describe("scoreToStars", () => {
  test("maps the lowest possible score to 1 star", () => {
    expect(scoreToStars(1)).toBe(1);
  });

  test("maps the highest possible score to 5 stars", () => {
    expect(scoreToStars(8)).toBe(5);
  });

  test("rounds and clamps mid-range scores", () => {
    expect(scoreToStars(5.9)).toBe(4);
    expect(scoreToStars(3.1)).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/scoring.test.ts`
Expected: FAIL — `combinedScore`/`scoreToStars` are not exported yet (the new `describe` blocks fail; the pre-existing `rateStaff` tests above them still pass).

- [ ] **Step 3: Export the existing scoreToStars helper and add combinedScore**

`scoring.ts` already has a **private** (non-exported) helper named
`scoreToStars` with exactly the implementation this task needs — do not
declare a second function with that name, which would be a duplicate-
declaration compile error. Instead make two small edits to
`backend/src/scoring.ts`, leaving everything else (`Category`,
`CATEGORIES`, `StaffAttributes`, `StaffRatings`, `rateStaff`, and its
other helpers) untouched:

1. Add `export` to the existing declaration:

```ts
// change this line:
function scoreToStars(score: number): number {
// to:
export function scoreToStars(score: number): number {
```

2. Add a new `combinedScore` function anywhere else at module scope (its
   signature doesn't exist yet under any name — `rawCategoryScore` takes
   a `(category, attrs)` pair, not raw `(primary, mentalAverage)`
   numbers, so there's no clash here):

```ts
// This weighting between a role's primary attribute and its mental
// modifier average is this project's own approximation of FM26
// mechanics — see the disclaimer above scoreToStars for the full
// context. Every role's rate() function (see backend/src/roles/) calls
// this directly rather than redefining its own weights.
const SHARED_PRIMARY_WEIGHT = 0.7;
const SHARED_MENTAL_WEIGHT = 0.3;

export function combinedScore(primary: number, mentalAverage: number): number {
  return SHARED_PRIMARY_WEIGHT * primary + SHARED_MENTAL_WEIGHT * mentalAverage;
}
```

(Named `SHARED_*`, distinct from the file's existing `PRIMARY_WEIGHT`/
`HOLY_TRINITY_WEIGHT` constants on the old `rateStaff` path, so the two
coexist without colliding — the old constants, `rateStaff`, and its
other now-superseded helpers are deleted in Task 5, the task that
removes their last caller.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/scoring.test.ts`
Expected: PASS (10 tests — 5 pre-existing `rateStaff` tests plus the 5 new ones).

- [ ] **Step 5: Write the failing test for the role-type scaffolding**

Create `backend/src/roles/index.test.ts`:

```ts
import { expect, test } from "vitest";
import { STAFF_ROLES } from "./index";

test("exactly coach and scout are registered as staff roles", () => {
  expect(STAFF_ROLES).toEqual(["coach", "scout"]);
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd backend && npx vitest run src/roles/index.test.ts`
Expected: FAIL — `Cannot find module './index'` (the `roles` directory doesn't exist yet).

- [ ] **Step 7: Create the role type scaffolding**

Create `backend/src/roles/index.ts`:

```ts
export type StaffRole = "coach" | "scout";

export const STAFF_ROLES: StaffRole[] = ["coach", "scout"];

export interface StaffRatings {
  categories: Record<string, number>;
  bestFit: string;
}

export interface RoleDefinition {
  key: StaffRole;
  categories: string[];
  rate(attributes: Record<string, number>): StaffRatings;
  attributesSchema: object;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd backend && npx vitest run src/roles/index.test.ts`
Expected: PASS (1 test).

- [ ] **Step 9: Commit**

```bash
git add backend/src/scoring.ts backend/src/scoring.test.ts backend/src/roles/index.ts backend/src/roles/index.test.ts
git commit -m "Trim scoring.ts to a shared weighting utility, add role scaffolding

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Coach role module

**Files:**
- Create: `backend/src/roles/coach.ts`
- Test: `backend/src/roles/coach.test.ts`

**Interfaces:**
- Consumes: `combinedScore`, `scoreToStars` from `../scoring` (Task 1).
- Produces: `CoachCategory` (union of the 7 training-area names), `COACH_CATEGORIES: CoachCategory[]` (tie-break order: Attacking, Defending, Fitness, Goalkeeping, Possession, Set Pieces, Tactical), `CoachAttributes` interface (the same 12 camelCase fields as before: `authority, determination, motivating, attacking, defending, fitness, goalkeeping, possession, setPieces, tactical, technical, tacticalKnowledge`), `rateCoach(attrs: CoachAttributes): StaffRatings`, `coachAttributesSchema: object` (JSON schema, identical shape to today's `staffAttributesSchema`).

- [ ] **Step 1: Write the failing coach role tests**

Create `backend/src/roles/coach.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { rateCoach, type CoachAttributes } from "./coach";

function attrs(overrides: Partial<CoachAttributes> = {}): CoachAttributes {
  return {
    authority: 1,
    determination: 1,
    motivating: 1,
    attacking: 1,
    defending: 1,
    fitness: 1,
    goalkeeping: 1,
    possession: 1,
    setPieces: 1,
    tactical: 1,
    technical: 1,
    tacticalKnowledge: 1,
    ...overrides,
  };
}

describe("rateCoach", () => {
  test("a coach who is Elite everywhere scores 5 stars in every category", () => {
    const allElite = attrs({
      authority: 8,
      determination: 8,
      motivating: 8,
      attacking: 8,
      defending: 8,
      fitness: 8,
      goalkeeping: 8,
      possession: 8,
      setPieces: 8,
      tactical: 8,
      technical: 8,
      tacticalKnowledge: 8,
    });

    const result = rateCoach(allElite);

    expect(result.categories.Attacking).toBe(5);
    expect(result.categories.Tactical).toBe(5);
  });

  test("a coach who is Unsuited everywhere scores 1 star in every category", () => {
    const result = rateCoach(attrs());

    expect(result.categories.Attacking).toBe(1);
    expect(result.categories.Tactical).toBe(1);
  });

  test("the matching attribute drives a category's score more than the mental average", () => {
    const eliteAttacker = attrs({ attacking: 8 });

    const result = rateCoach(eliteAttacker);

    expect(result.categories.Attacking).toBe(4);
    expect(result.categories.Defending).toBe(1);
    expect(result.bestFit).toBe("Attacking");
  });

  test("Tactical combines tactical, technical, and tactical knowledge", () => {
    const tacticalCoach = attrs({ tactical: 8, technical: 8, tacticalKnowledge: 8 });

    const result = rateCoach(tacticalCoach);

    expect(result.categories.Tactical).toBe(4);
  });

  test("ties for best fit are broken by category order, Attacking first", () => {
    const tied = attrs({ attacking: 6, defending: 6 });

    const result = rateCoach(tied);

    expect(result.bestFit).toBe("Attacking");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/roles/coach.test.ts`
Expected: FAIL — `Cannot find module './coach'`.

- [ ] **Step 3: Implement the coach role module**

Create `backend/src/roles/coach.ts`:

```ts
import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type CoachCategory =
  | "Attacking"
  | "Defending"
  | "Fitness"
  | "Goalkeeping"
  | "Possession"
  | "Set Pieces"
  | "Tactical";

export const COACH_CATEGORIES: CoachCategory[] = [
  "Attacking",
  "Defending",
  "Fitness",
  "Goalkeeping",
  "Possession",
  "Set Pieces",
  "Tactical",
];

export interface CoachAttributes {
  authority: number;
  determination: number;
  motivating: number;
  attacking: number;
  defending: number;
  fitness: number;
  goalkeeping: number;
  possession: number;
  setPieces: number;
  tactical: number;
  technical: number;
  tacticalKnowledge: number;
}

function mentalAverage(attrs: CoachAttributes): number {
  return (attrs.determination + attrs.authority + attrs.motivating) / 3;
}

function primaryAttributeFor(category: CoachCategory, attrs: CoachAttributes): number {
  switch (category) {
    case "Attacking":
      return attrs.attacking;
    case "Defending":
      return attrs.defending;
    case "Fitness":
      return attrs.fitness;
    case "Goalkeeping":
      return attrs.goalkeeping;
    case "Possession":
      return attrs.possession;
    case "Set Pieces":
      return attrs.setPieces;
    case "Tactical":
      return (attrs.tactical + attrs.technical + attrs.tacticalKnowledge) / 3;
  }
}

export function rateCoach(attrs: CoachAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<CoachCategory, number>> = {};
  for (const category of COACH_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: CoachCategory = COACH_CATEGORIES[0];
  for (const category of COACH_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of COACH_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const coachAttributesSchema = {
  type: "object",
  required: [
    "authority",
    "determination",
    "motivating",
    "attacking",
    "defending",
    "fitness",
    "goalkeeping",
    "possession",
    "setPieces",
    "tactical",
    "technical",
    "tacticalKnowledge",
  ],
  properties: {
    authority: attributeSchema,
    determination: attributeSchema,
    motivating: attributeSchema,
    attacking: attributeSchema,
    defending: attributeSchema,
    fitness: attributeSchema,
    goalkeeping: attributeSchema,
    possession: attributeSchema,
    setPieces: attributeSchema,
    tactical: attributeSchema,
    technical: attributeSchema,
    tacticalKnowledge: attributeSchema,
  },
  additionalProperties: false,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/roles/coach.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/roles/coach.ts backend/src/roles/coach.test.ts
git commit -m "Add coach role module (attributes, categories, scoring, schema)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Scout role module

**Files:**
- Create: `backend/src/roles/scout.ts`
- Test: `backend/src/roles/scout.test.ts`

**Interfaces:**
- Consumes: `combinedScore`, `scoreToStars` from `../scoring` (Task 1); `StaffRatings` from `./index` (Task 1).
- Produces: `ScoutCategory` (`"Current Ability Judging" | "Potential Judging"`), `SCOUT_CATEGORIES: ScoutCategory[]` (tie-break order: Current Ability Judging first), `ScoutAttributes` interface (`jpa, jpp, determination, adaptability`, plus the 19 region fields below), `rateScout(attrs: ScoutAttributes): StaffRatings`, `scoutAttributesSchema: object`.

The 19 region fields (all `number`, all required in the schema): `westernEurope, centralEurope, ukAndIreland, southernEurope, southEasternEurope, northEasternEurope, northernEurope, easternEurope, southAmericaNorth, southAmericaSouth, northAmerica, westernAfrica, centralAfrica, southernAfrica, northAfrica, middleEast, eastAsia, southEastAsia, oceania`.

- [ ] **Step 1: Write the failing scout role tests**

Create `backend/src/roles/scout.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { rateScout, type ScoutAttributes } from "./scout";

function attrs(overrides: Partial<ScoutAttributes> = {}): ScoutAttributes {
  return {
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
    ...overrides,
  };
}

describe("rateScout", () => {
  test("a scout who is Elite in every scored attribute scores 5 stars in both categories", () => {
    const result = rateScout(attrs({ jpa: 8, jpp: 8, determination: 8, adaptability: 8 }));

    expect(result.categories["Current Ability Judging"]).toBe(5);
    expect(result.categories["Potential Judging"]).toBe(5);
  });

  test("a scout who is Unsuited in every scored attribute scores 1 star in both categories", () => {
    const result = rateScout(attrs());

    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
  });

  test("JPA drives Current Ability Judging more than the mental average, independently of JPP", () => {
    const result = rateScout(attrs({ jpa: 8 }));

    expect(result.categories["Current Ability Judging"]).toBe(4);
    expect(result.categories["Potential Judging"]).toBe(1);
    expect(result.bestFit).toBe("Current Ability Judging");
  });

  test("JPP drives Potential Judging independently of JPA", () => {
    const result = rateScout(attrs({ jpp: 8 }));

    expect(result.categories["Potential Judging"]).toBe(4);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.bestFit).toBe("Potential Judging");
  });

  test("ties for best fit are broken toward Current Ability Judging", () => {
    const result = rateScout(attrs({ jpa: 6, jpp: 6 }));

    expect(result.bestFit).toBe("Current Ability Judging");
  });

  test("regional knowledge does not affect either category's score", () => {
    const highRegion = rateScout(attrs({ westernEurope: 8, oceania: 8 }));
    const lowRegion = rateScout(attrs());

    expect(highRegion.categories["Current Ability Judging"]).toBe(lowRegion.categories["Current Ability Judging"]);
    expect(highRegion.categories["Potential Judging"]).toBe(lowRegion.categories["Potential Judging"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/roles/scout.test.ts`
Expected: FAIL — `Cannot find module './scout'`.

- [ ] **Step 3: Implement the scout role module**

Create `backend/src/roles/scout.ts`:

```ts
import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type ScoutCategory = "Current Ability Judging" | "Potential Judging";

export const SCOUT_CATEGORIES: ScoutCategory[] = ["Current Ability Judging", "Potential Judging"];

export interface ScoutAttributes {
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

function mentalAverage(attrs: ScoutAttributes): number {
  return (attrs.determination + attrs.adaptability) / 2;
}

function primaryAttributeFor(category: ScoutCategory, attrs: ScoutAttributes): number {
  switch (category) {
    case "Current Ability Judging":
      return attrs.jpa;
    case "Potential Judging":
      return attrs.jpp;
  }
}

export function rateScout(attrs: ScoutAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<ScoutCategory, number>> = {};
  for (const category of SCOUT_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: ScoutCategory = SCOUT_CATEGORIES[0];
  for (const category of SCOUT_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of SCOUT_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const scoutAttributesSchema = {
  type: "object",
  required: [
    "jpa",
    "jpp",
    "determination",
    "adaptability",
    "westernEurope",
    "centralEurope",
    "ukAndIreland",
    "southernEurope",
    "southEasternEurope",
    "northEasternEurope",
    "northernEurope",
    "easternEurope",
    "southAmericaNorth",
    "southAmericaSouth",
    "northAmerica",
    "westernAfrica",
    "centralAfrica",
    "southernAfrica",
    "northAfrica",
    "middleEast",
    "eastAsia",
    "southEastAsia",
    "oceania",
  ],
  properties: {
    jpa: attributeSchema,
    jpp: attributeSchema,
    determination: attributeSchema,
    adaptability: attributeSchema,
    westernEurope: attributeSchema,
    centralEurope: attributeSchema,
    ukAndIreland: attributeSchema,
    southernEurope: attributeSchema,
    southEasternEurope: attributeSchema,
    northEasternEurope: attributeSchema,
    northernEurope: attributeSchema,
    easternEurope: attributeSchema,
    southAmericaNorth: attributeSchema,
    southAmericaSouth: attributeSchema,
    northAmerica: attributeSchema,
    westernAfrica: attributeSchema,
    centralAfrica: attributeSchema,
    southernAfrica: attributeSchema,
    northAfrica: attributeSchema,
    middleEast: attributeSchema,
    eastAsia: attributeSchema,
    southEastAsia: attributeSchema,
    oceania: attributeSchema,
  },
  additionalProperties: false,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/roles/scout.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/roles/scout.ts backend/src/roles/scout.test.ts
git commit -m "Add scout role module (attributes, categories, scoring, schema)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Role registry

**Files:**
- Modify: `backend/src/roles/index.ts`
- Modify: `backend/src/roles/index.test.ts`

**Interfaces:**
- Consumes: `COACH_CATEGORIES`, `rateCoach`, `coachAttributesSchema` from `./coach` (Task 2); `SCOUT_CATEGORIES`, `rateScout`, `scoutAttributesSchema` from `./scout` (Task 3).
- Produces: `ROLES: Record<StaffRole, RoleDefinition>`, used by `server.ts` (Task 5) to look up a role's rate function and schema by key.

- [ ] **Step 1: Write the failing registry tests**

Replace the contents of `backend/src/roles/index.test.ts`:

```ts
import { expect, test } from "vitest";
import { ROLES, STAFF_ROLES } from "./index";

test("exactly coach and scout are registered as staff roles", () => {
  expect(STAFF_ROLES).toEqual(["coach", "scout"]);
});

test("the coach role definition rates coach attributes", () => {
  const attrs = {
    authority: 8,
    determination: 8,
    motivating: 8,
    attacking: 8,
    defending: 1,
    fitness: 1,
    goalkeeping: 1,
    possession: 1,
    setPieces: 1,
    tactical: 1,
    technical: 1,
    tacticalKnowledge: 1,
  };

  const result = ROLES.coach.rate(attrs);

  // mental average (determination/authority/motivating) = 8, primary (attacking) = 8
  // combinedScore(8, 8) = 8 -> scoreToStars(8) = 5
  expect(result.categories.Attacking).toBe(5);
  expect(ROLES.coach.categories).toContain("Attacking");
});

test("the scout role definition rates scout attributes", () => {
  const attrs = {
    jpa: 8,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
  };

  const result = ROLES.scout.rate(attrs);

  expect(result.categories["Current Ability Judging"]).toBe(4);
  expect(ROLES.scout.categories).toContain("Potential Judging");
});

test("each role exposes its own attributes JSON schema", () => {
  expect(ROLES.coach.attributesSchema).toHaveProperty("required");
  expect(ROLES.scout.attributesSchema).toHaveProperty("required");
  expect(ROLES.coach.attributesSchema).not.toBe(ROLES.scout.attributesSchema);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/roles/index.test.ts`
Expected: FAIL — `ROLES` is not exported yet.

- [ ] **Step 3: Add the registry to roles/index.ts**

Replace the contents of `backend/src/roles/index.ts`:

```ts
import { COACH_CATEGORIES, rateCoach, coachAttributesSchema, type CoachAttributes } from "./coach";
import { SCOUT_CATEGORIES, rateScout, scoutAttributesSchema, type ScoutAttributes } from "./scout";

export type StaffRole = "coach" | "scout";

export const STAFF_ROLES: StaffRole[] = ["coach", "scout"];

export interface StaffRatings {
  categories: Record<string, number>;
  bestFit: string;
}

export interface RoleDefinition {
  key: StaffRole;
  categories: string[];
  rate(attributes: Record<string, number>): StaffRatings;
  attributesSchema: object;
}

export const ROLES: Record<StaffRole, RoleDefinition> = {
  coach: {
    key: "coach",
    categories: COACH_CATEGORIES,
    rate: (attributes) => rateCoach(attributes as unknown as CoachAttributes),
    attributesSchema: coachAttributesSchema,
  },
  scout: {
    key: "scout",
    categories: SCOUT_CATEGORIES,
    rate: (attributes) => rateScout(attributes as unknown as ScoutAttributes),
    attributesSchema: scoutAttributesSchema,
  },
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/roles/index.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full backend test suite so far**

Run: `cd backend && npx vitest run`
Expected: PASS — every test file green, including the still-untouched `staffRepository.test.ts` and `server.test.ts` (Tasks 1-4 were additive; nothing existing was removed or changed yet).

- [ ] **Step 6: Commit**

```bash
git add backend/src/roles/index.ts backend/src/roles/index.test.ts
git commit -m "Wire coach and scout role modules into a lookup registry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Database migration, repository, schemas, and server generalization

This task is deliberately large and ends with a single commit: `db.ts`,
`staffRepository.ts`, `staffSchemas.ts`, and `server.ts` are coupled
tightly enough around "what shape is a staff record" that splitting them
across task boundaries would leave the backend non-compiling or failing
its suite partway through, with no way to land a smaller, honestly-green
checkpoint in between. This is also where `scoring.ts`'s old `rateStaff`/
`StaffAttributes`/`Category`/`CATEGORIES`/`StaffRatings` exports are
deleted, in the same commit that removes their last caller.

**Files:**
- Modify: `backend/src/db.ts`
- Modify: `backend/src/db.test.ts`
- Modify: `backend/src/staffRepository.ts`
- Modify: `backend/src/staffRepository.test.ts`
- Modify: `backend/src/staffSchemas.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/src/server.test.ts`
- Modify: `backend/src/scoring.ts` (delete the now-dead coach-only exports)
- Modify: `backend/src/scoring.test.ts` (delete their now-dead tests)

**Interfaces:**
- Consumes: `ROLES`, `StaffRole` from `./roles/index` (Task 4).
- Produces: `migrateIfNeeded(db: Database.Database): void` and `createDb(path: string): Database.Database` (unchanged signature) from `db.ts`; `StaffRecord`/`StaffInput` (`{ id, name, role: StaffRole, tags: string[], attributes: Record<string, number>, createdAt, updatedAt }`, input variant without the computed/timestamp fields) and `StaffRepository` (`create`, `getById`, `list`, `update(id, patch: Partial<Pick<StaffInput, "name" | "tags" | "attributes">>)` — `role` is deliberately not patchable, `delete`) from `staffRepository.ts`; `validateAttributes(schema: object, value: unknown): boolean` from `staffSchemas.ts`; `buildServer(db: Database.Database): FastifyInstance` (unchanged signature) from `server.ts`.

- [ ] **Step 1: Write the failing migration tests**

Add to the top of `backend/src/db.test.ts` (keep the existing `mkdir` test
below it untouched) — add `Database` to the existing import list from
`"better-sqlite3"` and `migrateIfNeeded` to the existing import from
`"./db"`:

```ts
import Database from "better-sqlite3";
import { migrateIfNeeded } from "./db";

test("migrateIfNeeded converts the old rigid-column shape into role + attributes JSON", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      authority INTEGER NOT NULL,
      determination INTEGER NOT NULL,
      motivating INTEGER NOT NULL,
      attacking INTEGER NOT NULL,
      defending INTEGER NOT NULL,
      fitness INTEGER NOT NULL,
      goalkeeping INTEGER NOT NULL,
      possession INTEGER NOT NULL,
      set_pieces INTEGER NOT NULL,
      tactical INTEGER NOT NULL,
      technical INTEGER NOT NULL,
      tactical_knowledge INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.prepare(
    `INSERT INTO staff (
      name, tags, authority, determination, motivating, attacking, defending,
      fitness, goalkeeping, possession, set_pieces, tactical, technical,
      tactical_knowledge, created_at, updated_at
    ) VALUES (
      'Carlo Rossi', '["Shortlist"]', 5, 6, 5, 2, 2, 8, 1, 2, 2, 3, 3, 3,
      '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
    )`
  ).run();

  migrateIfNeeded(db);

  const rows = db.prepare("SELECT * FROM staff").all() as Array<Record<string, unknown>>;
  expect(rows).toHaveLength(1);
  expect(rows[0].role).toBe("coach");
  expect(rows[0].name).toBe("Carlo Rossi");
  expect(rows[0].tags).toBe('["Shortlist"]');
  expect(JSON.parse(rows[0].attributes as string)).toEqual({
    authority: 5,
    determination: 6,
    motivating: 5,
    attacking: 2,
    defending: 2,
    fitness: 8,
    goalkeeping: 1,
    possession: 2,
    setPieces: 2,
    tactical: 3,
    technical: 3,
    tacticalKnowledge: 3,
  });
  expect(rows[0].created_at).toBe("2026-01-01T00:00:00.000Z");
  expect(rows[0].updated_at).toBe("2026-01-01T00:00:00.000Z");

  db.close();
});

test("migrateIfNeeded does nothing on a connection with no staff table yet", () => {
  const db = new Database(":memory:");
  expect(() => migrateIfNeeded(db)).not.toThrow();
  db.close();
});

test("migrateIfNeeded does nothing once the table is already in the new shape", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      attributes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.prepare(
    `INSERT INTO staff (name, role, tags, attributes, created_at, updated_at)
     VALUES ('Jurgen Voss', 'coach', '[]', '{}', 'x', 'x')`
  ).run();

  migrateIfNeeded(db);

  expect(db.prepare("SELECT * FROM staff").all()).toHaveLength(1);
  db.close();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/db.test.ts`
Expected: FAIL — `migrateIfNeeded` is not exported from `./db`.

- [ ] **Step 3: Implement the migration and wire it into createDb**

Replace the contents of `backend/src/db.ts`:

```ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

interface OldStaffRow {
  id: number;
  name: string;
  tags: string;
  authority: number;
  determination: number;
  motivating: number;
  attacking: number;
  defending: number;
  fitness: number;
  goalkeeping: number;
  possession: number;
  set_pieces: number;
  tactical: number;
  technical: number;
  tactical_knowledge: number;
  created_at: string;
  updated_at: string;
}

export function migrateIfNeeded(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'staff'`)
    .get();
  if (!tableExists) return;

  const columns = db.prepare(`PRAGMA table_info(staff)`).all() as { name: string }[];
  const isOldShape = columns.some((column) => column.name === "authority");
  if (!isOldShape) return;

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE staff_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        attributes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    const oldRows = db.prepare(`SELECT * FROM staff`).all() as OldStaffRow[];
    const insert = db.prepare(`
      INSERT INTO staff_new (id, name, role, tags, attributes, created_at, updated_at)
      VALUES (@id, @name, 'coach', @tags, @attributes, @createdAt, @updatedAt)
    `);
    for (const row of oldRows) {
      insert.run({
        id: row.id,
        name: row.name,
        tags: row.tags,
        attributes: JSON.stringify({
          authority: row.authority,
          determination: row.determination,
          motivating: row.motivating,
          attacking: row.attacking,
          defending: row.defending,
          fitness: row.fitness,
          goalkeeping: row.goalkeeping,
          possession: row.possession,
          setPieces: row.set_pieces,
          tactical: row.tactical,
          technical: row.technical,
          tacticalKnowledge: row.tactical_knowledge,
        }),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    db.exec(`DROP TABLE staff`);
    db.exec(`ALTER TABLE staff_new RENAME TO staff`);
  });

  migrate();
}

export function createDb(path: string): Database.Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  migrateIfNeeded(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      attributes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  return db;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/db.test.ts`
Expected: PASS (4 tests). `staffRepository.test.ts` and `server.test.ts`
will now be failing against the new table shape — that's expected mid-
task; continue straight on to the next step rather than stopping here.

- [ ] **Step 5: Write the failing repository tests**

Replace the contents of `backend/src/staffRepository.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import type Database from "better-sqlite3";
import { createDb } from "./db";
import { StaffRepository, type StaffInput } from "./staffRepository";

function coachAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    authority: 3,
    determination: 4,
    motivating: 5,
    attacking: 6,
    defending: 2,
    fitness: 3,
    goalkeeping: 1,
    possession: 4,
    setPieces: 3,
    tactical: 6,
    technical: 5,
    tacticalKnowledge: 6,
    ...overrides,
  };
}

let db: Database.Database;
let repo: StaffRepository;

beforeEach(() => {
  db = createDb(":memory:");
  repo = new StaffRepository(db);
});

describe("StaffRepository", () => {
  test("create stores a staff member and returns it with an id and timestamps", () => {
    const input: StaffInput = { name: "Carlo Rossi", role: "coach", tags: ["Shortlist"], attributes: coachAttributes() };

    const created = repo.create(input);

    expect(created.id).toBeGreaterThan(0);
    expect(created.role).toBe("coach");
    expect(created.name).toBe("Carlo Rossi");
    expect(created.tags).toEqual(["Shortlist"]);
    expect(created.attributes).toEqual(coachAttributes());
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });

  test("create stores a scout-shaped record just as well as a coach-shaped one", () => {
    const scoutAttributes = { jpa: 7, jpp: 6, determination: 5, adaptability: 4, westernEurope: 8 };

    const created = repo.create({ name: "Ana Dimitriou", role: "scout", tags: [], attributes: scoutAttributes });

    expect(created.role).toBe("scout");
    expect(created.attributes).toEqual(scoutAttributes);
  });

  test("getById returns the matching record and undefined for a missing id", () => {
    const created = repo.create({ name: "Jurgen Voss", role: "coach", tags: [], attributes: coachAttributes() });

    expect(repo.getById(created.id)?.name).toBe("Jurgen Voss");
    expect(repo.getById(999999)).toBeUndefined();
  });

  test("list returns all created records regardless of role", () => {
    repo.create({ name: "Coach A", role: "coach", tags: [], attributes: coachAttributes() });
    repo.create({ name: "Scout B", role: "scout", tags: [], attributes: { jpa: 1, jpp: 1 } });

    expect(repo.list().map((s) => s.name)).toEqual(["Coach A", "Scout B"]);
  });

  test("update merges a partial patch into the existing record without changing its role", () => {
    const created = repo.create({ name: "Coach C", role: "coach", tags: [], attributes: coachAttributes() });

    const updated = repo.update(created.id, { name: "Coach C Updated" });

    expect(updated?.name).toBe("Coach C Updated");
    expect(updated?.role).toBe("coach");
    expect(updated?.attributes).toEqual(coachAttributes());
  });

  test("update returns undefined for a missing id", () => {
    expect(repo.update(999999, { name: "Nope" })).toBeUndefined();
  });

  test("delete removes the record and reports success", () => {
    const created = repo.create({ name: "Coach D", role: "coach", tags: [], attributes: coachAttributes() });

    expect(repo.delete(created.id)).toBe(true);
    expect(repo.getById(created.id)).toBeUndefined();
    expect(repo.delete(created.id)).toBe(false);
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/staffRepository.test.ts`
Expected: FAIL — `StaffInput`'s `role` field doesn't exist yet on the
old repository, and its SQL still references the 12 dropped columns.

- [ ] **Step 7: Implement the generalized repository**

Replace the contents of `backend/src/staffRepository.ts`:

```ts
import type { Database } from "better-sqlite3";
import type { StaffRole } from "./roles/index";

export interface StaffRecord {
  id: number;
  name: string;
  role: StaffRole;
  tags: string[];
  attributes: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInput {
  name: string;
  role: StaffRole;
  tags: string[];
  attributes: Record<string, number>;
}

interface StaffRow {
  id: number;
  name: string;
  role: string;
  tags: string;
  attributes: string;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: StaffRow): StaffRecord {
  return {
    id: row.id,
    name: row.name,
    role: row.role as StaffRole,
    tags: JSON.parse(row.tags),
    attributes: JSON.parse(row.attributes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class StaffRepository {
  constructor(private db: Database) {}

  create(input: StaffInput): StaffRecord {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO staff (name, role, tags, attributes, created_at, updated_at)
         VALUES (@name, @role, @tags, @attributes, @createdAt, @updatedAt)`
      )
      .run({
        name: input.name,
        role: input.role,
        tags: JSON.stringify(input.tags),
        attributes: JSON.stringify(input.attributes),
        createdAt: now,
        updatedAt: now,
      });

    return this.getById(result.lastInsertRowid as number)!;
  }

  getById(id: number): StaffRecord | undefined {
    const row = this.db.prepare("SELECT * FROM staff WHERE id = ?").get(id) as StaffRow | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  list(): StaffRecord[] {
    const rows = this.db.prepare("SELECT * FROM staff ORDER BY id").all() as StaffRow[];
    return rows.map(rowToRecord);
  }

  update(id: number, patch: Partial<Pick<StaffInput, "name" | "tags" | "attributes">>): StaffRecord | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const merged = {
      name: patch.name ?? existing.name,
      tags: patch.tags ?? existing.tags,
      attributes: { ...existing.attributes, ...patch.attributes },
    };
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE staff SET name = @name, tags = @tags, attributes = @attributes, updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id,
        name: merged.name,
        tags: JSON.stringify(merged.tags),
        attributes: JSON.stringify(merged.attributes),
        updatedAt: now,
      });

    return this.getById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare("DELETE FROM staff WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
```

`update`'s patch type deliberately excludes `role` — the repository's
own signature enforces "role is immutable" for every in-process caller.
(The HTTP-level enforcement, for a raw JSON body that bypasses these
TypeScript types entirely, is handled by `staffSchemas.ts`/`server.ts`
below.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/staffRepository.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 9: Write the failing schema and server tests**

Replace the contents of `backend/src/staffSchemas.ts`:

```ts
export const createStaffSchema = {
  body: {
    type: "object",
    required: ["name", "role", "attributes"],
    properties: {
      name: { type: "string", minLength: 1 },
      role: { type: "string", enum: ["coach", "scout"] },
      tags: { type: "array", items: { type: "string" }, default: [] },
      attributes: { type: "object" },
    },
    additionalProperties: false,
  },
};

export const updateStaffSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1 },
      tags: { type: "array", items: { type: "string" } },
      attributes: { type: "object" },
    },
    additionalProperties: false,
  },
};

export const idParamSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
};

interface AttributesSchema {
  required: string[];
}

export function validateAttributes(schema: object, value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const { required } = schema as AttributesSchema;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== required.length) return false;
  return required.every((key) => {
    const v = obj[key];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 8;
  });
}
```

`createStaffSchema`/`updateStaffSchema` only check that `attributes` is
*some* object — every attribute in this app is an integer 1-8 with no
per-role variation on that rule, so `validateAttributes` reads just the
`required` key list off a role's `attributesSchema` (produced in Tasks
2-3) and checks it directly, rather than pulling in a general-purpose
JSON-schema library for a rule this simple. `updateStaffSchema`
deliberately has no `role` property, combined with `additionalProperties:
false` — this means a `PATCH` body containing `role` at all is rejected
with 400 by Fastify's own schema validation before the handler ever
runs. (The spec describes a role-in-PATCH as "ignored"; rejecting it
outright is the stronger, more consistent choice — this codebase already
treats any unexpected field as a hard validation error everywhere else,
and a loud 400 beats a silently-dropped field, the same lesson the
earlier `coerceTypes` fix was about. Flagging this as a deliberate
deviation from the spec's literal wording, not an oversight.)

Replace the contents of `backend/src/server.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { createDb } from "./db";
import { buildServer } from "./server";

function coachAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    authority: 3,
    determination: 4,
    motivating: 5,
    attacking: 6,
    defending: 2,
    fitness: 3,
    goalkeeping: 1,
    possession: 4,
    setPieces: 3,
    tactical: 6,
    technical: 5,
    tacticalKnowledge: 6,
    ...overrides,
  };
}

function scoutAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    jpa: 5,
    jpp: 4,
    determination: 4,
    adaptability: 3,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
    ...overrides,
  };
}

let app: FastifyInstance;

beforeEach(() => {
  app = buildServer(createDb(":memory:"));
});

describe("POST /staff", () => {
  test("creates a coach and returns it with computed ratings", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Carlo Rossi", role: "coach", tags: ["Shortlist"], attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("coach");
    expect(body.tags).toEqual(["Shortlist"]);
    expect(body.categories.Attacking).toBeGreaterThanOrEqual(1);
    expect(body.bestFit).toBeDefined();
  });

  test("creates a scout and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Ana Dimitriou", role: "scout", attributes: scoutAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("scout");
    expect(body.categories["Current Ability Judging"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Potential Judging"]).toBeGreaterThanOrEqual(1);
  });

  test("defaults tags to an empty array when omitted", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "No Tags", role: "coach", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().tags).toEqual([]);
  });

  test("rejects an unrecognized role with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Role", role: "physio", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a coach-shaped attributes object when role is scout", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Mismatched", role: "scout", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects an attribute value above 8 with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Attrs", role: "coach", attributes: coachAttributes({ attacking: 9 }) },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a boolean attribute value with a 400 instead of coercing it to 1", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Attrs", role: "coach", attributes: coachAttributes({ attacking: true as unknown as number }) },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a non-array tags value with a 400 instead of coercing it", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Tags", role: "coach", tags: "Shortlist" as unknown as string[], attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a missing name with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { role: "coach", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /staff", () => {
  test("lists all created staff regardless of role", async () => {
    await app.inject({ method: "POST", url: "/staff", payload: { name: "A", role: "coach", attributes: coachAttributes() } });
    await app.inject({ method: "POST", url: "/staff", payload: { name: "B", role: "scout", attributes: scoutAttributes() } });

    const res = await app.inject({ method: "GET", url: "/staff" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });
});

describe("GET /staff/:id", () => {
  test("returns 404 for a non-existent id", async () => {
    const res = await app.inject({ method: "GET", url: "/staff/999999" });
    expect(res.statusCode).toBe(404);
  });
});

describe("PATCH /staff/:id", () => {
  test("updates an existing staff member", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Before", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { name: "After" } });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("After");
  });

  test("rejects a role in the PATCH body with a 400 instead of changing it", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Fixed Role", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { role: "scout" } });

    expect(res.statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: `/staff/${id}` })).json().role).toBe("coach");
  });

  test("validates a patched attributes object against the existing record's own role", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Coach", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { attributes: scoutAttributes() } });

    expect(res.statusCode).toBe(400);
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await app.inject({ method: "PATCH", url: "/staff/999999", payload: { name: "Nope" } });
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /staff/:id", () => {
  test("deletes an existing staff member", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "ToDelete", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "DELETE", url: `/staff/${id}` });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: "GET", url: `/staff/${id}` });
    expect(getRes.statusCode).toBe(404);
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await app.inject({ method: "DELETE", url: "/staff/999999" });
    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 10: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/server.test.ts`
Expected: FAIL — `server.ts` still imports `rateStaff` and expects the
old attribute shape.

- [ ] **Step 11: Implement the generalized server**

Replace the contents of `backend/src/server.ts`:

```ts
import Fastify, { type FastifyInstance } from "fastify";
import type { Database } from "better-sqlite3";
import { StaffRepository, type StaffRecord } from "./staffRepository";
import { ROLES, type StaffRole } from "./roles/index";
import { createStaffSchema, updateStaffSchema, idParamSchema, validateAttributes } from "./staffSchemas";

function toResponse(record: StaffRecord) {
  const ratings = ROLES[record.role].rate(record.attributes);
  return {
    id: record.id,
    name: record.name,
    role: record.role,
    tags: record.tags,
    attributes: record.attributes,
    categories: ratings.categories,
    bestFit: ratings.bestFit,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function buildServer(db: Database): FastifyInstance {
  const app = Fastify({ ajv: { customOptions: { coerceTypes: false } } });
  const repo = new StaffRepository(db);

  app.get("/staff", async () => {
    return repo.list().map(toResponse);
  });

  app.get("/staff/:id", { schema: idParamSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const record = repo.getById(Number(id));
    if (!record) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    return toResponse(record);
  });

  app.post("/staff", { schema: createStaffSchema }, async (request, reply) => {
    const body = request.body as { name: string; role: string; tags?: string[]; attributes: Record<string, number> };
    const roleDefinition = ROLES[body.role as StaffRole];
    if (!roleDefinition) {
      return reply.code(400).send({ error: `Unknown role: ${body.role}` });
    }
    if (!validateAttributes(roleDefinition.attributesSchema, body.attributes)) {
      return reply.code(400).send({ error: `attributes do not match the ${body.role} role's required shape` });
    }
    const created = repo.create({
      name: body.name,
      role: body.role as StaffRole,
      tags: body.tags ?? [],
      attributes: body.attributes,
    });
    reply.code(201);
    return toResponse(created);
  });

  app.patch("/staff/:id", { schema: updateStaffSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = repo.getById(Number(id));
    if (!existing) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    const body = request.body as Partial<{ name: string; tags: string[]; attributes: Record<string, number> }>;
    if (body.attributes && !validateAttributes(ROLES[existing.role].attributesSchema, body.attributes)) {
      return reply.code(400).send({ error: `attributes do not match the ${existing.role} role's required shape` });
    }
    const updated = repo.update(Number(id), body);
    return toResponse(updated!);
  });

  app.delete("/staff/:id", { schema: idParamSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = repo.delete(Number(id));
    if (!deleted) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    return reply.code(204).send();
  });

  return app;
}
```

- [ ] **Step 12: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/server.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 13: Delete the now-dead old scoring exports**

Nothing imports `rateStaff`, `StaffAttributes`, `Category`, `CATEGORIES`,
or the old (local) `StaffRatings` from `scoring.ts` anymore — `server.ts`
was their last caller. Remove them, their helper functions
(`holyTrinityAverage`, `primaryAttributeFor`, `rawCategoryScore`), and
the now-unused `PRIMARY_WEIGHT`/`HOLY_TRINITY_WEIGHT` constants from
`backend/src/scoring.ts`, leaving only `combinedScore` and
`scoreToStars` (and the `SHARED_*` constants) from Task 1. Then remove
their corresponding test cases from `backend/src/scoring.test.ts`,
leaving only the `combinedScore`/`scoreToStars` tests added in Task 1.

- [ ] **Step 14: Run the full backend test suite and typecheck**

Run: `cd backend && npx vitest run && npm run typecheck`
Expected: PASS — every test file green (scoring, coach, scout, registry,
db, repository, server), typecheck clean.

- [ ] **Step 15: Commit**

```bash
git add backend/src/db.ts backend/src/db.test.ts backend/src/staffRepository.ts backend/src/staffRepository.test.ts backend/src/staffSchemas.ts backend/src/server.ts backend/src/server.test.ts backend/src/scoring.ts backend/src/scoring.test.ts
git commit -m "Generalize database, repository, schemas, and API for staff roles

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Frontend role modules

**Files:**
- Create: `frontend/src/roles/coach.ts`
- Create: `frontend/src/roles/scout.ts`
- Create: `frontend/src/roles/index.ts`
- Test: `frontend/src/roles/coach.test.ts`
- Test: `frontend/src/roles/scout.test.ts`
- Test: `frontend/src/roles/index.test.ts`

**Interfaces:**
- Produces: `StaffRole`, `STAFF_ROLES: StaffRole[]`, `AttributeGroup` (`{ title: string; fields: { key: string; label: string }[] }`), `RoleUIDefinition` (`{ key: StaffRole; label: string; categories: string[]; formGroups: AttributeGroup[]; mentalFields: string[]; extraDisplayGroups: AttributeGroup[]; defaultAttributes: Record<string, number> }`), `ROLES: Record<StaffRole, RoleUIDefinition>` from `roles/index.ts`; `CoachAttributes` from `roles/coach.ts`; `ScoutAttributes` from `roles/scout.ts`. Consumed by Task 7, which builds `types.ts`'s `StaffMember`/`StaffInput` discriminated unions from `CoachAttributes`/`ScoutAttributes` and migrates every component to read `ROLES[...]` instead of the old hardcoded coach constants.

This task has no component changes yet, and does not touch `types.ts` —
it's pure new data-layer infrastructure the
remaining frontend tasks build on, verified by unit tests on the role
modules and registry themselves.

`roles/index.ts`'s types are built first, before `coach.ts`/`scout.ts`
— they both need `AttributeGroup` from it. Building the registry's
types before its members (rather than relying on `import type` being
erased at test-run time regardless of file order) keeps every step
honest if someone runs `tsc` earlier than this task's own final step
suggests.

- [ ] **Step 1: Write the failing role-type-scaffolding test**

Create `frontend/src/roles/index.test.ts`:

```ts
import { expect, test } from "vitest";
import { STAFF_ROLES } from "./index";

test("exactly coach and scout are registered as staff roles", () => {
  expect(STAFF_ROLES).toEqual(["coach", "scout"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/roles/index.test.ts`
Expected: FAIL — `Cannot find module './index'` (the `roles` directory
doesn't exist yet).

- [ ] **Step 3: Create the role type scaffolding**

Create `frontend/src/roles/index.ts`:

```ts
export type StaffRole = "coach" | "scout";

export const STAFF_ROLES: StaffRole[] = ["coach", "scout"];

export interface AttributeGroup {
  title: string;
  fields: { key: string; label: string }[];
}

export interface RoleUIDefinition {
  key: StaffRole;
  label: string;
  categories: string[];
  formGroups: AttributeGroup[];
  mentalFields: string[];
  extraDisplayGroups: AttributeGroup[];
  defaultAttributes: Record<string, number>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/roles/index.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing coach role module test**

Create `frontend/src/roles/coach.test.ts`:

```ts
import { expect, test } from "vitest";
import { COACH_CATEGORIES, defaultAttributes, formGroups, mentalFields } from "./coach";

test("exposes the 7 coach categories in tie-break order", () => {
  expect(COACH_CATEGORIES).toEqual([
    "Attacking",
    "Defending",
    "Fitness",
    "Goalkeeping",
    "Possession",
    "Set Pieces",
    "Tactical",
  ]);
});

test("mental fields are the holy trinity", () => {
  expect(mentalFields).toEqual(["determination", "authority", "motivating"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = formGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(defaultAttributes).sort());
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(defaultAttributes).every((value) => value === 4)).toBe(true);
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/roles/coach.test.ts`
Expected: FAIL — `Cannot find module './coach'`.

- [ ] **Step 7: Implement the coach role module**

Create `frontend/src/roles/coach.ts`:

```ts
import type { AttributeGroup } from "./index";

export interface CoachAttributes {
  authority: number;
  determination: number;
  motivating: number;
  attacking: number;
  defending: number;
  fitness: number;
  goalkeeping: number;
  possession: number;
  setPieces: number;
  tactical: number;
  technical: number;
  tacticalKnowledge: number;
}

export type CoachCategory =
  | "Attacking"
  | "Defending"
  | "Fitness"
  | "Goalkeeping"
  | "Possession"
  | "Set Pieces"
  | "Tactical";

export const COACH_CATEGORIES: CoachCategory[] = [
  "Attacking",
  "Defending",
  "Fitness",
  "Goalkeeping",
  "Possession",
  "Set Pieces",
  "Tactical",
];

export const mentalFields: (keyof CoachAttributes)[] = ["determination", "authority", "motivating"];

export const formGroups: AttributeGroup[] = [
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "authority", label: "Authority" },
      { key: "motivating", label: "Motivating" },
    ],
  },
  {
    title: "Coaching attributes",
    fields: [
      { key: "attacking", label: "Attacking" },
      { key: "defending", label: "Defending" },
      { key: "fitness", label: "Fitness" },
      { key: "goalkeeping", label: "Goalkeeping" },
      { key: "possession", label: "Possession" },
      { key: "setPieces", label: "Set Pieces" },
      { key: "tactical", label: "Tactical" },
      { key: "technical", label: "Technical" },
    ],
  },
  {
    title: "Knowledge",
    fields: [{ key: "tacticalKnowledge", label: "Tactical Knowledge" }],
  },
];

export const extraDisplayGroups: AttributeGroup[] = [];

export const defaultAttributes: CoachAttributes = {
  authority: 4,
  determination: 4,
  motivating: 4,
  attacking: 4,
  defending: 4,
  fitness: 4,
  goalkeeping: 4,
  possession: 4,
  setPieces: 4,
  tactical: 4,
  technical: 4,
  tacticalKnowledge: 4,
};
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/roles/coach.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Write the failing scout role module test**

Create `frontend/src/roles/scout.test.ts`:

```ts
import { expect, test } from "vitest";
import { SCOUT_CATEGORIES, defaultAttributes, extraDisplayGroups, formGroups, mentalFields } from "./scout";

test("exposes the 2 scout categories, Current Ability Judging first", () => {
  expect(SCOUT_CATEGORIES).toEqual(["Current Ability Judging", "Potential Judging"]);
});

test("mental fields are determination and adaptability", () => {
  expect(mentalFields).toEqual(["determination", "adaptability"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = formGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(defaultAttributes).sort());
});

test("regional knowledge is its own extra display group covering all 19 regions", () => {
  expect(extraDisplayGroups).toHaveLength(1);
  expect(extraDisplayGroups[0].title).toBe("Regional Knowledge");
  expect(extraDisplayGroups[0].fields).toHaveLength(19);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(defaultAttributes).every((value) => value === 4)).toBe(true);
});
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/roles/scout.test.ts`
Expected: FAIL — `Cannot find module './scout'`.

- [ ] **Step 11: Implement the scout role module**

Create `frontend/src/roles/scout.ts`:

```ts
import type { AttributeGroup } from "./index";

export interface ScoutAttributes {
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

export type ScoutCategory = "Current Ability Judging" | "Potential Judging";

export const SCOUT_CATEGORIES: ScoutCategory[] = ["Current Ability Judging", "Potential Judging"];

export const mentalFields: (keyof ScoutAttributes)[] = ["determination", "adaptability"];

const regionFields: { key: keyof ScoutAttributes; label: string }[] = [
  { key: "westernEurope", label: "Western Europe" },
  { key: "centralEurope", label: "Central Europe" },
  { key: "ukAndIreland", label: "UK and Ireland" },
  { key: "southernEurope", label: "Southern Europe" },
  { key: "southEasternEurope", label: "South Eastern Europe" },
  { key: "northEasternEurope", label: "North Eastern Europe" },
  { key: "northernEurope", label: "Northern Europe" },
  { key: "easternEurope", label: "Eastern Europe" },
  { key: "southAmericaNorth", label: "South America (North)" },
  { key: "southAmericaSouth", label: "South America (South)" },
  { key: "northAmerica", label: "North America" },
  { key: "westernAfrica", label: "Western Africa" },
  { key: "centralAfrica", label: "Central Africa" },
  { key: "southernAfrica", label: "Southern Africa" },
  { key: "northAfrica", label: "North Africa" },
  { key: "middleEast", label: "Middle East" },
  { key: "eastAsia", label: "East Asia" },
  { key: "southEastAsia", label: "South East Asia" },
  { key: "oceania", label: "Oceania" },
];

export const formGroups: AttributeGroup[] = [
  {
    title: "Judging ability",
    fields: [
      { key: "jpa", label: "Judging Player Ability" },
      { key: "jpp", label: "Judging Player Potential" },
    ],
  },
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "adaptability", label: "Adaptability" },
    ],
  },
  {
    title: "Regional knowledge",
    fields: regionFields,
  },
];

export const extraDisplayGroups: AttributeGroup[] = [{ title: "Regional Knowledge", fields: regionFields }];

export const defaultAttributes: ScoutAttributes = {
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
  westernEurope: 4,
  centralEurope: 4,
  ukAndIreland: 4,
  southernEurope: 4,
  southEasternEurope: 4,
  northEasternEurope: 4,
  northernEurope: 4,
  easternEurope: 4,
  southAmericaNorth: 4,
  southAmericaSouth: 4,
  northAmerica: 4,
  westernAfrica: 4,
  centralAfrica: 4,
  southernAfrica: 4,
  northAfrica: 4,
  middleEast: 4,
  eastAsia: 4,
  southEastAsia: 4,
  oceania: 4,
};
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/roles/scout.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 13: Write the failing registry test**

Add to the end of `frontend/src/roles/index.test.ts` (keep the existing
`STAFF_ROLES` test from Step 1 above it untouched), adding `ROLES` to
the existing import from `"./index"`:

```ts
test("each role definition exposes its label, categories, and form groups", () => {
  expect(ROLES.coach.label).toBe("Coach");
  expect(ROLES.coach.categories).toContain("Attacking");
  expect(ROLES.scout.label).toBe("Scout");
  expect(ROLES.scout.categories).toContain("Potential Judging");
  expect(ROLES.scout.extraDisplayGroups).toHaveLength(1);
  expect(ROLES.coach.extraDisplayGroups).toHaveLength(0);
});
```

- [ ] **Step 14: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/roles/index.test.ts`
Expected: FAIL — `ROLES` is not exported yet (the `STAFF_ROLES` test
from Step 1 still passes).

- [ ] **Step 15: Add the registry to roles/index.ts**

Add to the top of `frontend/src/roles/index.ts` (the imports) and to
the end (the `ROLES` constant), keeping the `StaffRole`/`STAFF_ROLES`/
`AttributeGroup`/`RoleUIDefinition` declarations from Step 3 exactly as
they are:

```ts
import {
  COACH_CATEGORIES,
  defaultAttributes as coachDefaultAttributes,
  extraDisplayGroups as coachExtraDisplayGroups,
  formGroups as coachFormGroups,
  mentalFields as coachMentalFields,
} from "./coach";
import {
  SCOUT_CATEGORIES,
  defaultAttributes as scoutDefaultAttributes,
  extraDisplayGroups as scoutExtraDisplayGroups,
  formGroups as scoutFormGroups,
  mentalFields as scoutMentalFields,
} from "./scout";

// ... StaffRole, STAFF_ROLES, AttributeGroup, RoleUIDefinition from Step 3 stay exactly as they are ...

export const ROLES: Record<StaffRole, RoleUIDefinition> = {
  coach: {
    key: "coach",
    label: "Coach",
    categories: COACH_CATEGORIES,
    formGroups: coachFormGroups,
    mentalFields: coachMentalFields,
    extraDisplayGroups: coachExtraDisplayGroups,
    defaultAttributes: coachDefaultAttributes,
  },
  scout: {
    key: "scout",
    label: "Scout",
    categories: SCOUT_CATEGORIES,
    formGroups: scoutFormGroups,
    mentalFields: scoutMentalFields,
    extraDisplayGroups: scoutExtraDisplayGroups,
    defaultAttributes: scoutDefaultAttributes,
  },
};
```

- [ ] **Step 16: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/roles/index.test.ts`
Expected: PASS (2 tests).

This task deliberately stops here, without touching `types.ts` at all.
`types.ts`'s `StaffMember`/`StaffInput` are consumed by `App.tsx`, which
is the common root wiring every other component together (`RosterView`
→ `StaffTable`/`DetailPanel`/`HoverTooltip`, and `StaffForm` alongside
it) — the instant `StaffMember` becomes a discriminated union, every one
of those files breaks simultaneously, not just a reachable subset, so
there is no smaller honest checkpoint between "only `types.ts` changed"
and "every consumer is migrated." That full migration is Task 7, one
combined task, for the same reason Task 5 combined the backend's
equally-tangled files. This task's new `roles/` files have zero
consumers yet and zero dependency on `types.ts`, so they're fully safe
to land on their own.

- [ ] **Step 17: Run the full frontend test suite and typecheck**

Run: `cd frontend && npx vitest run && npx tsc --noEmit`
Expected: PASS — every existing test file plus the 11 new `roles/*`
tests (2 in `index.test.ts`, 4 in `coach.test.ts`, 5 in
`scout.test.ts`), and a clean typecheck. Nothing existing was touched.

- [ ] **Step 18: Commit**

```bash
git add frontend/src/roles/
git commit -m "Add frontend role modules (coach, scout) and their registry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Generalize types.ts and migrate every frontend consumer

Like Task 5 on the backend, this task is deliberately large and ends in
a single commit. `types.ts`'s `StaffMember`/`StaffInput` flow through
`App.tsx` into `RosterView` (which binds `StaffTable`, `DetailPanel`,
and `HoverTooltip` together) and into `StaffForm` — every one of those
files breaks the instant `StaffMember` becomes a discriminated union,
not just a reachable subset, so there is no smaller honest checkpoint
in between. `RosterView.tsx` itself needs no code change (it already
handles `StaffMember` generically — it just finds, hovers, and pins by
`id`) but its test fixture still needs updating alongside everything
else.

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/components/sortStaff.ts`
- Modify: `frontend/src/components/sortStaff.test.ts`
- Modify: `frontend/src/components/StaffTable.tsx`
- Modify: `frontend/src/components/StaffTable.test.tsx`
- Modify: `frontend/src/components/DetailPanel.tsx`
- Modify: `frontend/src/components/DetailPanel.test.tsx`
- Modify: `frontend/src/components/HoverTooltip.tsx`
- Modify: `frontend/src/components/HoverTooltip.test.tsx`
- Modify: `frontend/src/components/RosterView.test.tsx` (fixture only — `RosterView.tsx` itself is unchanged)
- Modify: `frontend/src/components/StaffForm.tsx`
- Modify: `frontend/src/components/StaffForm.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `ROLES`, `StaffRole`, `RoleUIDefinition` from `./roles/index` (Task 6); `CoachAttributes` from `./roles/coach`, `ScoutAttributes` from `./roles/scout` (Task 6).
- Produces: `StaffMember`/`StaffInput` (discriminated unions on `role`) from `types.ts`, consumed by every component below and by `api/staffApi.ts` (already generically typed, no change needed there).

- [ ] **Step 1: Generalize types.ts**

Replace the contents of `frontend/src/types.ts`:

```ts
import type { CoachAttributes } from "./roles/coach";
import type { ScoutAttributes } from "./roles/scout";

export const ATTRIBUTE_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "Unsuited" },
  { value: 2, label: "Reasonable" },
  { value: 3, label: "Competent" },
  { value: 4, label: "Average" },
  { value: 5, label: "Good" },
  { value: 6, label: "Very Good" },
  { value: 7, label: "Outstanding" },
  { value: 8, label: "Elite" },
];

interface StaffCore {
  id: number;
  name: string;
  tags: string[];
  categories: Record<string, number>;
  bestFit: string;
  createdAt: string;
  updatedAt: string;
}

export type StaffMember =
  | (StaffCore & { role: "coach"; attributes: CoachAttributes })
  | (StaffCore & { role: "scout"; attributes: ScoutAttributes });

export type StaffInput =
  | { role: "coach"; name: string; tags: string[]; attributes: CoachAttributes }
  | { role: "scout"; name: string; tags: string[]; attributes: ScoutAttributes };
```

Every step from here on fixes one more broken consumer; `tsc`/`vitest`
will show many errors until the last step in this task.

- [ ] **Step 2: Write the failing sortStaff tests**

Replace the contents of `frontend/src/components/sortStaff.test.ts`:

```ts
import { expect, test } from "vitest";
import { sortStaff } from "./sortStaff";
import type { StaffMember } from "../types";

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
    role: "coach",
    tags: [],
    attributes: {
      authority: 1,
      determination: 1,
      motivating: 1,
      attacking: 1,
      defending: 1,
      fitness: 1,
      goalkeeping: 1,
      possession: 1,
      setPieces: 1,
      tactical: 1,
      technical: 1,
      tacticalKnowledge: 1,
    },
    categories: {
      Attacking: 1,
      Defending: 1,
      Fitness: 1,
      Goalkeeping: 1,
      Possession: 1,
      "Set Pieces": 1,
      Tactical: 1,
    },
    bestFit: "Attacking",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as StaffMember;
}

test("sorts by name ascending", () => {
  const staff = [member({ id: 1, name: "Bravo" }), member({ id: 2, name: "Alpha" })];

  const result = sortStaff(staff, "name", "asc");

  expect(result.map((s) => s.name)).toEqual(["Alpha", "Bravo"]);
});

test("sorts by a category's star rating, highest first when descending", () => {
  const staff = [
    member({ id: 1, name: "LowFitness", categories: { ...member({}).categories, Fitness: 2 } }),
    member({ id: 2, name: "HighFitness", categories: { ...member({}).categories, Fitness: 5 } }),
  ];

  const result = sortStaff(staff, "Fitness", "desc");

  expect(result.map((s) => s.name)).toEqual(["HighFitness", "LowFitness"]);
});

test("sorts by bestFit using the staff member's own best-fit star value", () => {
  const staff = [
    member({ id: 1, name: "WeakBest", bestFit: "Fitness", categories: { ...member({}).categories, Fitness: 2 } }),
    member({ id: 2, name: "StrongBest", bestFit: "Attacking", categories: { ...member({}).categories, Attacking: 5 } }),
  ];

  const result = sortStaff(staff, "bestFit", "desc");

  expect(result.map((s) => s.name)).toEqual(["StrongBest", "WeakBest"]);
});

test("sorts by type (role) alphabetically", () => {
  const staff = [
    member({ id: 1, name: "Coach Member", role: "coach" }),
    member({ id: 2, name: "Scout Member", role: "scout", attributes: { jpa: 1, jpp: 1 } as never }),
  ];

  const result = sortStaff(staff, "type", "asc");

  expect(result.map((s) => s.role)).toEqual(["coach", "scout"]);
});

test("sorting by a category that a staff member doesn't have treats it as lowest, without throwing", () => {
  const coach = member({ id: 1, name: "Has Fitness", categories: { ...member({}).categories, Fitness: 3 } });
  const scout = member({
    id: 2,
    name: "No Fitness",
    role: "scout",
    attributes: { jpa: 1, jpp: 1 } as never,
    categories: { "Current Ability Judging": 5, "Potential Judging": 5 },
    bestFit: "Current Ability Judging",
  });

  expect(() => sortStaff([coach, scout], "Fitness", "desc")).not.toThrow();
  const result = sortStaff([coach, scout], "Fitness", "desc");
  expect(result.map((s) => s.name)).toEqual(["Has Fitness", "No Fitness"]);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/sortStaff.test.ts`
Expected: FAIL — `sortStaff` doesn't understand `"type"` as a sort key
yet, and `a.categories[sortKey] - b.categories[sortKey]` produces `NaN`
(not a throw, but a wrong/undefined ordering) when a category is
missing, so the last test's ordering assertion fails.

- [ ] **Step 4: Implement the generalized sortStaff**

Replace the contents of `frontend/src/components/sortStaff.ts`:

```ts
import type { StaffMember } from "../types";

export type SortKey = "name" | "bestFit" | "type" | string;

function categoryValue(member: StaffMember, category: string): number {
  return member.categories[category] ?? 0;
}

function compare(a: StaffMember, b: StaffMember, sortKey: SortKey): number {
  if (sortKey === "name") return a.name.localeCompare(b.name);
  if (sortKey === "type") return a.role.localeCompare(b.role);
  if (sortKey === "bestFit") return categoryValue(a, a.bestFit) - categoryValue(b, b.bestFit);
  return categoryValue(a, sortKey) - categoryValue(b, sortKey);
}

export function sortStaff(staff: StaffMember[], sortKey: SortKey, direction: "asc" | "desc"): StaffMember[] {
  const sorted = [...staff].sort((a, b) => compare(a, b, sortKey));
  return direction === "desc" ? sorted.reverse() : sorted;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/sortStaff.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Write the failing StaffTable tests**

Replace the contents of `frontend/src/components/StaffTable.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffTable } from "./StaffTable";
import type { StaffMember } from "../types";

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
    role: "coach",
    tags: [],
    attributes: {
      authority: 1,
      determination: 1,
      motivating: 1,
      attacking: 1,
      defending: 1,
      fitness: 1,
      goalkeeping: 1,
      possession: 1,
      setPieces: 1,
      tactical: 1,
      technical: 1,
      tacticalKnowledge: 1,
    },
    categories: {
      Attacking: 1,
      Defending: 1,
      Fitness: 1,
      Goalkeeping: 1,
      Possession: 1,
      "Set Pieces": 1,
      Tactical: 1,
    },
    bestFit: "Attacking",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as StaffMember;
}

function scoutMember(overrides: Partial<StaffMember>): StaffMember {
  return member({
    role: "scout",
    attributes: { jpa: 5, jpp: 5, determination: 5, adaptability: 5 } as never,
    categories: { "Current Ability Judging": 3, "Potential Judging": 4 },
    bestFit: "Potential Judging",
    ...overrides,
  });
}

test("renders a row per staff member with name, tags, and best fit", () => {
  const staff = [member({ id: 1, name: "Carlo Rossi", tags: ["Shortlist"], bestFit: "Fitness" })];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  const row = screen.getByText("Carlo Rossi").closest("tr")!;
  expect(row.textContent).toContain("Shortlist");
  expect(row.textContent).toContain("Fitness");
});

test("shows the best-fit category as a grade chip", () => {
  const staff = [
    member({ id: 1, name: "Chip Target", bestFit: "Fitness", categories: { ...member({}).categories, Fitness: 4 } }),
  ];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  const row = screen.getByText("Chip Target").closest("tr")!;
  expect(row.textContent).toContain("4★ Strong");
});

test("calls onRowHover with the staff id on mouse over and null on mouse out", () => {
  const staff = [member({ id: 7, name: "Hover Target" })];
  const onRowHover = vi.fn();

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={onRowHover} onRowClick={vi.fn()} />);

  const row = screen.getByText("Hover Target").closest("tr")!;
  fireEvent.mouseOver(row);
  expect(onRowHover).toHaveBeenCalledWith(7);

  fireEvent.mouseOut(row);
  expect(onRowHover).toHaveBeenCalledWith(null);
});

test("moving the cursor between cells in the same row does not clear the hover preview", () => {
  const staff = [member({ id: 7, name: "Hover Target" })];
  const onRowHover = vi.fn();

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={onRowHover} onRowClick={vi.fn()} />);

  const row = screen.getByText("Hover Target").closest("tr")!;
  const [nameCell, tagsCell] = row.querySelectorAll("td");

  fireEvent.mouseOver(nameCell);
  expect(onRowHover).toHaveBeenCalledWith(7);
  onRowHover.mockClear();

  fireEvent.mouseOut(nameCell, { relatedTarget: tagsCell });
  fireEvent.mouseOver(tagsCell, { relatedTarget: nameCell });

  expect(onRowHover).not.toHaveBeenCalledWith(null);
});

test("renders a toggleable chip for each distinct tag and filters the table by the active ones", () => {
  const staff = [
    member({ id: 1, name: "Shortlisted Coach", tags: ["Shortlist"] }),
    member({ id: 2, name: "U18 Coach", tags: ["U18"] }),
    member({ id: 3, name: "Untagged Coach", tags: [] }),
  ];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Shortlisted Coach")).toBeInTheDocument();
  expect(screen.getByText("U18 Coach")).toBeInTheDocument();
  expect(screen.getByText("Untagged Coach")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Shortlist" }));

  expect(screen.getByText("Shortlisted Coach")).toBeInTheDocument();
  expect(screen.queryByText("U18 Coach")).not.toBeInTheDocument();
  expect(screen.queryByText("Untagged Coach")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Shortlist" }));

  expect(screen.getByText("U18 Coach")).toBeInTheDocument();
});

test("calls onRowClick with the staff id when a row is clicked", () => {
  const staff = [member({ id: 9, name: "Click Target" })];
  const onRowClick = vi.fn();

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={onRowClick} />);

  fireEvent.click(screen.getByText("Click Target"));
  expect(onRowClick).toHaveBeenCalledWith(9);
});

test("sorting by category star rating reorders the rows, highest first", () => {
  const staff = [
    member({ id: 1, name: "LowFitness", categories: { ...member({}).categories, Fitness: 2 } }),
    member({ id: 2, name: "HighFitness", categories: { ...member({}).categories, Fitness: 5 } }),
  ];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  fireEvent.change(screen.getByLabelText("Sort by category"), { target: { value: "Fitness" } });

  const names = screen.getAllByRole("row").slice(1).map((row) => row.textContent);
  expect(names[0]).toContain("HighFitness");
  expect(names[1]).toContain("LowFitness");
});

test("a Type filter chip narrows the roster to just that role", () => {
  const coach = member({ id: 1, name: "Carlo Rossi" });
  const scout = scoutMember({ id: 2, name: "Ana Dimitriou" });

  render(<StaffTable staff={[coach, scout]} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Scout" }));

  expect(screen.queryByText("Carlo Rossi")).not.toBeInTheDocument();
  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();
});

test("clicking the Type column header sorts the roster by role", () => {
  const scout = scoutMember({ id: 1, name: "Scout Member" });
  const coach = member({ id: 2, name: "Coach Member" });

  render(<StaffTable staff={[scout, coach]} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  fireEvent.click(screen.getByText("Type"));

  const names = screen.getAllByRole("row").slice(1).map((row) => row.textContent);
  expect(names[0]).toContain("Coach Member");
  expect(names[1]).toContain("Scout Member");
});

test("the category sort dropdown lists categories from every role present, not just one", () => {
  const coach = member({ id: 1 });
  const scout = scoutMember({ id: 2 });

  render(<StaffTable staff={[coach, scout]} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  const select = screen.getByLabelText("Sort by category") as HTMLSelectElement;
  const optionValues = Array.from(select.options).map((option) => option.value);
  expect(optionValues).toContain("Fitness");
  expect(optionValues).toContain("Potential Judging");
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/StaffTable.test.tsx`
Expected: FAIL — no "Type" column/filter exists yet, and the category
dropdown is still built from the old static `CATEGORIES` import, which
no longer exists (compile error).

- [ ] **Step 8: Implement the generalized StaffTable**

Replace the contents of `frontend/src/components/StaffTable.tsx`:

```tsx
import { useState } from "react";
import type { StaffMember } from "../types";
import { ROLES } from "../roles/index";
import { sortStaff, type SortKey } from "./sortStaff";
import { GradeChip } from "./GradeChip";
import styles from "./StaffTable.module.css";

interface StaffTableProps {
  staff: StaffMember[];
  pinnedId: number | null;
  onRowHover: (id: number | null) => void;
  onRowClick: (id: number) => void;
}

export function StaffTable({ staff, pinnedId, onRowHover, onRowClick }: StaffTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeRoles, setActiveRoles] = useState<string[]>([]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  function handleCategorySort(category: string) {
    setSortKey(category);
    setDirection("desc");
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleRole(role: string) {
    setActiveRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  const allTags = Array.from(new Set(staff.flatMap((member) => member.tags))).sort();
  const allRoles = Array.from(new Set(staff.map((member) => member.role))).sort();
  const allCategories = Array.from(new Set(staff.flatMap((member) => Object.keys(member.categories)))).sort();

  const filtered = staff.filter((member) => {
    const matchesTag = activeTags.length === 0 || member.tags.some((tag) => activeTags.includes(tag));
    const matchesRole = activeRoles.length === 0 || activeRoles.includes(member.role);
    return matchesTag && matchesRole;
  });
  const sorted = sortStaff(filtered, sortKey, direction);

  return (
    <div className={styles.wrap}>
      <div role="group" aria-label="Filter by type" className={styles.tagFilter}>
        {allRoles.map((role) => (
          <button
            key={role}
            type="button"
            className={styles.tagButton}
            aria-pressed={activeRoles.includes(role)}
            onClick={() => toggleRole(role)}
          >
            {ROLES[role].label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Filter by tag" className={styles.tagFilter}>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={styles.tagButton}
            aria-pressed={activeTags.includes(tag)}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <label className={styles.sortControl}>
        Sort by category
        <select aria-label="Sort by category" value="" onChange={(e) => handleCategorySort(e.target.value)}>
          <option value="" disabled>
            Choose a category
          </option>
          {allCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort("name")}>Name</th>
            <th onClick={() => toggleSort("type")}>Type</th>
            <th>Tags</th>
            <th onClick={() => toggleSort("bestFit")}>Best fit</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((member) => (
            <tr
              key={member.id}
              onMouseEnter={() => onRowHover(member.id)}
              onMouseLeave={() => onRowHover(null)}
              onClick={() => onRowClick(member.id)}
              className={pinnedId === member.id ? styles.pinnedRow : undefined}
            >
              <td>{member.name}</td>
              <td>{ROLES[member.role].label}</td>
              <td>
                {member.tags.length === 0
                  ? "—"
                  : member.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
              </td>
              <td>
                {member.bestFit} <GradeChip stars={member.categories[member.bestFit]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/StaffTable.test.tsx`
Expected: PASS (10 tests).

- [ ] **Step 10: Write the failing DetailPanel tests**

Replace the contents of `frontend/src/components/DetailPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { DetailPanel } from "./DetailPanel";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Carlo Rossi",
  role: "coach",
  tags: ["Shortlist"],
  attributes: {
    authority: 5,
    determination: 6,
    motivating: 5,
    attacking: 2,
    defending: 2,
    fitness: 8,
    goalkeeping: 1,
    possession: 2,
    setPieces: 2,
    tactical: 3,
    technical: 3,
    tacticalKnowledge: 3,
  },
  categories: {
    Attacking: 2,
    Defending: 2,
    Fitness: 5,
    Goalkeeping: 1,
    Possession: 2,
    "Set Pieces": 2,
    Tactical: 3,
  },
  bestFit: "Fitness",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const scoutSample: StaffMember = {
  id: 2,
  name: "Ana Dimitriou",
  role: "scout",
  tags: [],
  attributes: {
    jpa: 5,
    jpp: 2,
    determination: 6,
    adaptability: 1,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
  } as never,
  categories: { "Current Ability Judging": 5, "Potential Judging": 2 },
  bestFit: "Current Ability Judging",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StaffMember;

test("shows a placeholder when there is no staff member", () => {
  render(<DetailPanel staff={null} mode="empty" />);
  expect(screen.getByText(/hover a row/i)).toBeInTheDocument();
});

test("shows a Preview label and the full breakdown in preview mode", () => {
  render(<DetailPanel staff={sample} mode="preview" />);

  expect(screen.getByText("Preview")).toBeInTheDocument();
  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  expect(screen.getByText(/Fitness/)).toBeInTheDocument();
  expect(screen.queryByText("Edit")).not.toBeInTheDocument();
});

test("shows the holy trinity and categories as grade chips, not raw labels", () => {
  render(<DetailPanel staff={sample} mode="preview" />);

  // holy trinity: determination 6 -> 4 stars, authority 5 -> 3 stars, motivating 5 -> 3 stars
  expect(screen.getByText("4★ Strong")).toBeInTheDocument();
  expect(screen.getAllByText("3★ Good").length).toBeGreaterThanOrEqual(2);

  // categories: Fitness 5 -> elite, Goalkeeping 1 -> poor
  expect(screen.getByText("5★ Elite")).toBeInTheDocument();
  expect(screen.getByText("1★ Poor")).toBeInTheDocument();

  expect(screen.queryByText("Outstanding")).not.toBeInTheDocument();
});

test("shows a Pinned label and Edit/Delete buttons in pinned mode", () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={sample} mode="pinned" onEdit={onEdit} onDelete={onDelete} />);

  expect(screen.getByText("Pinned")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Edit"));
  expect(onEdit).toHaveBeenCalledWith(sample);

  fireEvent.click(screen.getByText("Delete"));
  expect(onDelete).toHaveBeenCalledWith(sample.id);
});

test("asks for confirmation naming the coach before deleting", () => {
  const onDelete = vi.fn();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={sample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Carlo Rossi"));
  expect(onDelete).toHaveBeenCalledWith(sample.id);
});

test("does not delete when the confirmation is declined", () => {
  const onDelete = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(false);

  render(<DetailPanel staff={sample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(onDelete).not.toHaveBeenCalled();
});

test("shows a scout's own mental attributes, categories, and a Regional Knowledge section", () => {
  render(<DetailPanel staff={scoutSample} mode="preview" />);

  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();
  expect(screen.getByText("determination")).toBeInTheDocument();
  expect(screen.getByText("adaptability")).toBeInTheDocument();
  expect(screen.getByText("Current Ability Judging")).toBeInTheDocument();
  expect(screen.getByText("Potential Judging")).toBeInTheDocument();
  expect(screen.getByText("Regional Knowledge")).toBeInTheDocument();
  expect(screen.getByText("Western Europe")).toBeInTheDocument();
  expect(screen.getByText("Oceania")).toBeInTheDocument();

  // determination 6 -> 4 stars; scoped to its own row since other chips can share the same text
  const determinationChip = screen.getByText("determination").nextElementSibling;
  expect(determinationChip?.textContent).toBe("4★ Strong");
});
```

- [ ] **Step 11: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/DetailPanel.test.tsx`
Expected: FAIL — `DetailPanel.tsx` still imports the deleted `CATEGORIES`/
`HOLY_TRINITY_FIELDS` from `types.ts` (compile error), and has no
Regional Knowledge rendering.

- [ ] **Step 12: Implement the generalized DetailPanel**

Replace the contents of `frontend/src/components/DetailPanel.tsx`:

```tsx
import { Fragment } from "react";
import type { StaffMember } from "../types";
import { ROLES } from "../roles/index";
import { GradeChip } from "./GradeChip";
import { rawAttributeToStars } from "./starRating";
import styles from "./DetailPanel.module.css";

interface DetailPanelProps {
  staff: StaffMember | null;
  mode: "empty" | "preview" | "pinned";
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (id: number) => void;
}

export function DetailPanel({ staff, mode, onEdit, onDelete }: DetailPanelProps) {
  if (!staff || mode === "empty") {
    return <div className={styles.placeholder}>Hover a row to preview — click to pin</div>;
  }

  const role = ROLES[staff.role];
  const attributes = staff.attributes as Record<string, number>;

  return (
    <div className={styles.panel}>
      <span className={`${styles.mode} ${mode === "pinned" ? styles.pinned : styles.preview}`}>
        {mode === "pinned" ? "Pinned" : "Preview"}
      </span>
      <h3 className={styles.name}>{staff.name}</h3>
      <div className={styles.tags}>{staff.tags.join(", ") || "No tags"}</div>

      <div className={styles.sectionLabel}>Mental attributes</div>
      <dl className={styles.grid}>
        {role.mentalFields.map((field) => (
          <Fragment key={field}>
            <dt>{field}</dt>
            <dd>
              <GradeChip stars={rawAttributeToStars(attributes[field])} />
            </dd>
          </Fragment>
        ))}
      </dl>

      <div className={styles.sectionLabel}>Categories</div>
      <dl className={styles.grid}>
        {role.categories.map((category) => (
          <Fragment key={category}>
            <dt>{category}</dt>
            <dd>
              <GradeChip stars={staff.categories[category]} />
            </dd>
          </Fragment>
        ))}
      </dl>

      {role.extraDisplayGroups.map((group) => (
        <div key={group.title}>
          <div className={styles.sectionLabel}>{group.title}</div>
          <dl className={styles.grid}>
            {group.fields.map((field) => (
              <Fragment key={field.key}>
                <dt>{field.label}</dt>
                <dd>
                  <GradeChip stars={rawAttributeToStars(attributes[field.key])} />
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      ))}

      {mode === "pinned" && (
        <div className={styles.actions}>
          <button onClick={() => onEdit?.(staff)}>Edit</button>
          <button
            onClick={() => {
              if (window.confirm(`Delete ${staff.name}? This cannot be undone.`)) {
                onDelete?.(staff.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 13: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/DetailPanel.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 14: Write the failing HoverTooltip tests**

Replace the contents of `frontend/src/components/HoverTooltip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { HoverTooltip } from "./HoverTooltip";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Ana Dimitriou",
  role: "coach",
  tags: [],
  attributes: {
    authority: 8,
    determination: 8,
    motivating: 6,
    attacking: 3,
    defending: 3,
    fitness: 2,
    goalkeeping: 1,
    possession: 4,
    setPieces: 3,
    tactical: 8,
    technical: 8,
    tacticalKnowledge: 8,
  },
  categories: {
    Attacking: 3,
    Defending: 3,
    Fitness: 2,
    Goalkeeping: 1,
    Possession: 3,
    "Set Pieces": 3,
    Tactical: 5,
  },
  bestFit: "Tactical",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const scoutSample: StaffMember = {
  id: 2,
  name: "Marcus Webb",
  role: "scout",
  tags: [],
  attributes: {
    jpa: 6,
    jpp: 2,
    determination: 8,
    adaptability: 1,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
  } as never,
  categories: { "Current Ability Judging": 4, "Potential Judging": 1 },
  bestFit: "Current Ability Judging",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StaffMember;

test("renders nothing when there is no staff member", () => {
  const { container } = render(<HoverTooltip staff={null} position={{ x: 10, y: 10 }} />);
  expect(container).toBeEmptyDOMElement();
});

test("renders nothing when there is no position", () => {
  const { container } = render(<HoverTooltip staff={sample} position={null} />);
  expect(container).toBeEmptyDOMElement();
});

test("renders the staff member's holy trinity and best fit at the given position", () => {
  render(<HoverTooltip staff={sample} position={{ x: 42, y: 24 }} />);

  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();
  expect(screen.getByText(/Tactical/)).toBeInTheDocument();

  const tooltip = screen.getByText("Ana Dimitriou").parentElement!;
  expect(tooltip.style.left).toBe("42px");
  expect(tooltip.style.top).toBe("24px");
});

test("shows the holy trinity and best fit as grade chips, not raw numbers", () => {
  render(<HoverTooltip staff={sample} position={{ x: 0, y: 0 }} />);

  // determination 8 -> 5 stars, motivating 6 -> 4 stars, best fit Tactical (5) -> 5 stars
  expect(screen.getAllByText("5★ Elite").length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText("4★ Strong")).toBeInTheDocument();
  expect(screen.queryByText("8")).not.toBeInTheDocument();
});

test("shows a scout's own mental fields (determination, adaptability), not the coach's holy trinity", () => {
  render(<HoverTooltip staff={scoutSample} position={{ x: 0, y: 0 }} />);

  expect(screen.getByText("Marcus Webb")).toBeInTheDocument();
  expect(screen.getByText("determination")).toBeInTheDocument();
  expect(screen.getByText("adaptability")).toBeInTheDocument();
  expect(screen.queryByText("authority")).not.toBeInTheDocument();
  expect(screen.queryByText("motivating")).not.toBeInTheDocument();
  expect(screen.getByText(/Current Ability Judging/)).toBeInTheDocument();
});
```

- [ ] **Step 15: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/HoverTooltip.test.tsx`
Expected: FAIL — `HoverTooltip.tsx` still imports the deleted
`HOLY_TRINITY_FIELDS` from `types.ts`.

- [ ] **Step 16: Implement the generalized HoverTooltip**

Replace the contents of `frontend/src/components/HoverTooltip.tsx`:

```tsx
import type { StaffMember } from "../types";
import { ROLES } from "../roles/index";
import { GradeChip } from "./GradeChip";
import { rawAttributeToStars } from "./starRating";
import styles from "./HoverTooltip.module.css";

interface HoverTooltipProps {
  staff: StaffMember | null;
  position: { x: number; y: number } | null;
}

export function HoverTooltip({ staff, position }: HoverTooltipProps) {
  if (!staff || !position) return null;

  const role = ROLES[staff.role];
  const attributes = staff.attributes as Record<string, number>;

  return (
    <div
      className={styles.tooltip}
      style={{ position: "fixed", left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className={styles.name}>{staff.name}</div>
      {role.mentalFields.map((field) => (
        <div key={field} className={styles.row}>
          <span>{field}</span>
          <GradeChip stars={rawAttributeToStars(attributes[field])} />
        </div>
      ))}
      <div className={styles.bestFit}>
        <span>Best fit: {staff.bestFit}</span>
        <GradeChip stars={staff.categories[staff.bestFit]} />
      </div>
    </div>
  );
}
```

- [ ] **Step 17: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/HoverTooltip.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 18: Update the RosterView test fixture (no production code change)**

In `frontend/src/components/RosterView.test.tsx`, add `role: "coach",`
to the existing `member()` fixture's returned object (immediately after
`name: "Z",`), leaving every other line in the file — including
`RosterView.tsx` itself — untouched.

- [ ] **Step 19: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/RosterView.test.tsx`
Expected: PASS (5 tests) — confirms `RosterView.tsx` needed no code
change, only its test fixture.

- [ ] **Step 20: Write the failing StaffForm tests**

Replace the contents of `frontend/src/components/StaffForm.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffForm } from "./StaffForm";
import type { StaffInput } from "../types";

const coachInitialValue: StaffInput = {
  role: "coach",
  name: "Existing Coach",
  tags: ["Shortlist"],
  attributes: {
    authority: 4,
    determination: 4,
    motivating: 4,
    attacking: 4,
    defending: 4,
    fitness: 4,
    goalkeeping: 4,
    possession: 4,
    setPieces: 4,
    tactical: 4,
    technical: 4,
    tacticalKnowledge: 4,
  },
} as StaffInput;

const scoutInitialValue: StaffInput = {
  role: "scout",
  name: "Existing Scout",
  tags: [],
  attributes: {
    jpa: 4,
    jpp: 4,
    determination: 4,
    adaptability: 4,
    westernEurope: 4,
    centralEurope: 4,
    ukAndIreland: 4,
    southernEurope: 4,
    southEasternEurope: 4,
    northEasternEurope: 4,
    northernEurope: 4,
    easternEurope: 4,
    southAmericaNorth: 4,
    southAmericaSouth: 4,
    northAmerica: 4,
    westernAfrica: 4,
    centralAfrica: 4,
    southernAfrica: 4,
    northAfrica: 4,
    middleEast: 4,
    eastAsia: 4,
    southEastAsia: 4,
    oceania: 4,
  },
} as StaffInput;

test("shows a role picker with no attribute fields until a role is chosen", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Coach" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Scout" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
});

test("picking Coach shows its fields grouped into Identity, Mental attributes, Coaching attributes, and Knowledge", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Authority")).toBeInTheDocument();
  expect(screen.getByLabelText("Tactical Knowledge")).toBeInTheDocument();
  expect(screen.getByText("Identity")).toBeInTheDocument();
  expect(screen.getByText("Mental attributes")).toBeInTheDocument();
  expect(screen.getByText("Coaching attributes")).toBeInTheDocument();
  expect(screen.getByText("Knowledge")).toBeInTheDocument();
});

test("picking Scout shows its fields grouped into Identity, Judging ability, Mental attributes, and Regional knowledge", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Scout" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Player Ability")).toBeInTheDocument();
  expect(screen.getByLabelText("Western Europe")).toBeInTheDocument();
  expect(screen.getByText("Judging ability")).toBeInTheDocument();
  expect(screen.getByText("Regional knowledge")).toBeInTheDocument();
});

test("editing a coach skips the picker and pre-fills its fields", () => {
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Coach" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveValue("Existing Coach");
  expect(screen.getByLabelText("Tags")).toHaveValue("Shortlist");
});

test("editing a scout skips the picker and pre-fills its fields", () => {
  render(<StaffForm initialValue={scoutInitialValue} onSubmit={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Scout" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveValue("Existing Scout");
  expect(screen.getByLabelText("Judging Player Ability")).toBeInTheDocument();
});

test("does not call onSubmit when the name is empty", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
});

test("submits the entered name, tags, role, and attributes", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Carlo Rossi" } });
  fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Shortlist, U18" } });
  fireEvent.change(screen.getByLabelText("Attacking"), { target: { value: "8" } });
  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  const submitted = onSubmit.mock.calls[0][0];
  expect(submitted.role).toBe("coach");
  expect(submitted.name).toBe("Carlo Rossi");
  expect(submitted.tags).toEqual(["Shortlist", "U18"]);
  expect(submitted.attributes.attacking).toBe(8);
});

test("titles the dialog 'Add staff' before a role is chosen, then 'Add coach' after", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  expect(screen.getByText("Add staff")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));

  expect(screen.getByText("Add coach")).toBeInTheDocument();
});

test("titles the dialog 'Edit coach' when editing a coach", () => {
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} />);

  expect(screen.getByText("Edit coach")).toBeInTheDocument();
});

test("pressing Escape calls onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.keyDown(document, { key: "Escape" });

  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("clicking the backdrop calls onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  const backdrop = screen.getByRole("dialog").parentElement!;
  fireEvent.click(backdrop);

  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("clicking inside the dialog does not call onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.click(screen.getByLabelText("Name"));

  expect(onCancel).not.toHaveBeenCalled();
});

test("clicking the close button calls onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.click(screen.getByLabelText("Close"));

  expect(onCancel).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 21: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/StaffForm.test.tsx`
Expected: FAIL — `StaffForm.tsx` still imports the deleted
`ATTRIBUTE_GROUPS` from `types.ts`, and has no role picker.

- [ ] **Step 22: Implement the role-aware StaffForm**

Replace the contents of `frontend/src/components/StaffForm.tsx`:

```tsx
import { useEffect, useState } from "react";
import { ATTRIBUTE_LEVELS, type StaffInput } from "../types";
import { ROLES, STAFF_ROLES, type StaffRole } from "../roles/index";
import styles from "./StaffForm.module.css";

interface StaffFormProps {
  initialValue?: StaffInput;
  onSubmit: (input: StaffInput) => void;
  onCancel?: () => void;
}

export function StaffForm({ initialValue, onSubmit, onCancel }: StaffFormProps) {
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(initialValue?.role ?? null);
  const [name, setName] = useState(initialValue?.name ?? "");
  const [tagsText, setTagsText] = useState((initialValue?.tags ?? []).join(", "));
  const [attributes, setAttributes] = useState<Record<string, number>>(initialValue?.attributes ?? {});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleSelectRole(role: StaffRole) {
    setSelectedRole(role);
    setAttributes(ROLES[role].defaultAttributes);
  }

  function handleAttributeChange(key: string, value: string) {
    setAttributes((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function parseTags(text: string): string[] {
    return text
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;
    if (name.trim().length === 0) {
      setError("Name is required");
      return;
    }
    setError(null);
    onSubmit({ role: selectedRole, name: name.trim(), tags: parseTags(tagsText), attributes } as StaffInput);
  }

  const title = initialValue
    ? `Edit ${ROLES[initialValue.role].label.toLowerCase()}`
    : selectedRole
      ? `Add ${ROLES[selectedRole].label.toLowerCase()}`
      : "Add staff";

  return (
    <div className={styles.backdrop} onClick={() => onCancel?.()}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3>{title}</h3>
          <button type="button" aria-label="Close" className={styles.closeButton} onClick={() => onCancel?.()}>
            ✕
          </button>
        </div>

        {!selectedRole ? (
          <div className={styles.body}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Choose a role</div>
              <div className={styles.fieldRow}>
                {STAFF_ROLES.map((role) => (
                  <button key={role} type="button" onClick={() => handleSelectRole(role)}>
                    {ROLES[role].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.body}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Identity</div>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  Name
                  <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className={styles.field}>
                  Tags
                  <input aria-label="Tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
                </label>
              </div>
            </div>

            {ROLES[selectedRole].formGroups.map((group) => (
              <div key={group.title} className={styles.section}>
                <div className={styles.sectionTitle}>{group.title}</div>
                <div className={styles.fieldRow}>
                  {group.fields.map((field) => (
                    <label key={field.key} className={styles.field}>
                      {field.label}
                      <select
                        aria-label={field.label}
                        value={attributes[field.key]}
                        onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      >
                        {ATTRIBUTE_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {error && (
              <div role="alert" className={styles.error}>
                {error}
              </div>
            )}
            <div className={styles.actions}>
              <button type="submit">Save</button>
              {onCancel && (
                <button type="button" onClick={onCancel}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 23: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/StaffForm.test.tsx`
Expected: PASS (13 tests).

- [ ] **Step 24: Write the failing App tests**

Replace the contents of `frontend/src/App.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { App } from "./App";
import * as staffApi from "./api/staffApi";
import type { StaffMember } from "./types";

vi.mock("./api/staffApi");

beforeEach(() => {
  vi.resetAllMocks();
});

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
    role: "coach",
    tags: [],
    attributes: {
      authority: 4,
      determination: 4,
      motivating: 4,
      attacking: 4,
      defending: 4,
      fitness: 4,
      goalkeeping: 4,
      possession: 4,
      setPieces: 4,
      tactical: 4,
      technical: 4,
      tacticalKnowledge: 4,
    },
    categories: {
      Attacking: 3,
      Defending: 3,
      Fitness: 3,
      Goalkeeping: 3,
      Possession: 3,
      "Set Pieces": 3,
      Tactical: 3,
    },
    bestFit: "Attacking",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as StaffMember;
}

test("shows an error message instead of a silent blank roster when loading fails", async () => {
  vi.mocked(staffApi.listStaff).mockRejectedValue(new Error("Failed to list staff: 500"));

  render(<App />);

  expect(await screen.findByRole("alert")).toHaveTextContent(/failed to list staff/i);
});

test("shows an error and keeps the form open when saving fails", async () => {
  vi.mocked(staffApi.listStaff).mockResolvedValue([]);
  vi.mocked(staffApi.createStaff).mockRejectedValue(new Error("Failed to create staff: 400"));

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Coach" } });
  fireEvent.click(screen.getByText("Save"));

  expect(await screen.findByRole("alert")).toHaveTextContent(/failed to create staff/i);
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});

test("loads and displays staff on mount", async () => {
  vi.mocked(staffApi.listStaff).mockResolvedValue([member({ id: 1, name: "Carlo Rossi" })]);

  render(<App />);

  expect(await screen.findByText("Carlo Rossi")).toBeInTheDocument();
});

test("submitting the add-staff form for a coach creates it and refreshes the list", async () => {
  vi.mocked(staffApi.listStaff)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([member({ id: 2, name: "New Coach" })]);
  vi.mocked(staffApi.createStaff).mockResolvedValue(member({ id: 2, name: "New Coach" }));

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Coach" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.createStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.createStaff).toHaveBeenCalledWith(expect.objectContaining({ role: "coach", name: "New Coach" }));
  expect(await screen.findByText("New Coach")).toBeInTheDocument();
});

test("submitting the add-staff form for a scout creates it with the scout role", async () => {
  const newScout = member({
    id: 3,
    name: "New Scout",
    role: "scout",
    attributes: { jpa: 4, jpp: 4, determination: 4, adaptability: 4 } as never,
    categories: { "Current Ability Judging": 3, "Potential Judging": 3 },
    bestFit: "Current Ability Judging",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValueOnce([]).mockResolvedValueOnce([newScout]);
  vi.mocked(staffApi.createStaff).mockResolvedValue(newScout);

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.click(screen.getByRole("button", { name: "Scout" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Scout" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.createStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.createStaff).toHaveBeenCalledWith(expect.objectContaining({ role: "scout", name: "New Scout" }));
  expect(await screen.findByText("New Scout")).toBeInTheDocument();
});

function rowFor(name: string): HTMLElement {
  const match = screen.getAllByText(name).map((el) => el.closest("tr")).find((tr) => tr !== null);
  if (!match) throw new Error(`No table row found for "${name}"`);
  return match;
}

test("editing a second coach without closing the form shows that coach's own data, not the previous one", async () => {
  const coachA = member({ id: 1, name: "Coach A" });
  const coachB = member({ id: 2, name: "Coach B" });
  vi.mocked(staffApi.listStaff).mockResolvedValue([coachA, coachB]);

  render(<App />);
  await screen.findByText("Coach A");

  fireEvent.click(rowFor("Coach A"));
  fireEvent.click(screen.getByText("Edit"));
  expect(screen.getByLabelText("Name")).toHaveValue("Coach A");

  fireEvent.click(rowFor("Coach B"));
  fireEvent.click(screen.getByText("Edit"));

  expect(screen.getByLabelText("Name")).toHaveValue("Coach B");
});

test("saving after switching the edit target updates the newly selected coach, not the previous one", async () => {
  const coachA = member({ id: 1, name: "Coach A" });
  const coachB = member({ id: 2, name: "Coach B" });
  vi.mocked(staffApi.listStaff).mockResolvedValue([coachA, coachB]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(coachB);

  render(<App />);
  await screen.findByText("Coach A");

  fireEvent.click(rowFor("Coach A"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(rowFor("Coach B"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(coachB.id, {
    name: coachB.name,
    tags: coachB.tags,
    attributes: coachB.attributes,
  });
});
```

The last assertion deliberately expects a patch object **without** a
`role` key — `updateStaff` must never be sent one, since the backend
rejects any `PATCH` body that contains `role` at all (Task 5).

- [ ] **Step 25: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: FAIL — `App.tsx` doesn't click through a role picker yet, and
its `initialValue`/`updateStaff` wiring doesn't know about `role`.

- [ ] **Step 26: Implement the generalized App**

Replace the contents of `frontend/src/App.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { RosterView } from "./components/RosterView";
import { StaffForm } from "./components/StaffForm";
import { createStaff, deleteStaff, listStaff, updateStaff } from "./api/staffApi";
import type { StaffInput, StaffMember } from "./types";
import styles from "./App.module.css";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toStaffInput(member: StaffMember): StaffInput {
  if (member.role === "coach") {
    return { role: "coach", name: member.name, tags: member.tags, attributes: member.attributes };
  }
  return { role: "scout", name: member.name, tags: member.tags, attributes: member.attributes };
}

export function App() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStaff(await listStaff());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(input: StaffInput) {
    try {
      if (editing) {
        const { role: _role, ...patch } = input;
        await updateStaff(editing.id, patch);
      } else {
        await createStaff(input);
      }
      setShowForm(false);
      setEditing(null);
      setError(null);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteStaff(id);
      setError(null);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleEdit(member: StaffMember) {
    setEditing(member);
    setShowForm(true);
  }

  function handleAddClick() {
    setEditing(null);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>FM26 Coach Rating Tool</h1>
        <button className={styles.addButton} onClick={handleAddClick}>
          Add staff
        </button>
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      {showForm && (
        <StaffForm
          key={editing?.id ?? "new"}
          initialValue={editing ? toStaffInput(editing) : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      <RosterView staff={staff} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
```

`toStaffInput` branches on `member.role` explicitly rather than copying
`role`/`attributes` as separate object-literal fields, so TypeScript
narrows `member` within each branch and can prove the returned object
actually matches one arm of the `StaffInput` union — copying the two
fields independently outside a narrowing branch would not give the
compiler that proof. `handleSubmit`'s destructure strips `role` before
calling `updateStaff`, since a `PATCH` containing `role` is rejected by
the backend (Task 5) regardless of what the form happens to submit.

- [ ] **Step 27: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 28: Run the full frontend test suite, typecheck, and production build**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS — every test file green, typecheck clean, production
build succeeds. Remove the `dist/` output afterward (`rm -rf dist`) —
it's build-only scratch, not meant to be committed.

- [ ] **Step 29: Commit**

```bash
git add frontend/src/types.ts frontend/src/components/sortStaff.ts frontend/src/components/sortStaff.test.ts frontend/src/components/StaffTable.tsx frontend/src/components/StaffTable.test.tsx frontend/src/components/DetailPanel.tsx frontend/src/components/DetailPanel.test.tsx frontend/src/components/HoverTooltip.tsx frontend/src/components/HoverTooltip.test.tsx frontend/src/components/RosterView.test.tsx frontend/src/components/StaffForm.tsx frontend/src/components/StaffForm.test.tsx frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "Generalize every frontend component for staff roles, add Scout UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Full-stack integration verification

No new code — this task is live verification that the whole system
actually works end to end, the same way the original coach tool and
each later styling pass were verified against a real running instance
rather than tests alone.

**Files:** none.

**Interfaces:** none — this task only runs the already-built system.

- [ ] **Step 1: Run both full suites and both typechecks one more time**

Run: `(cd backend && npm test && npm run typecheck) && (cd frontend && npm test && npm run typecheck)`
Expected: PASS — backend and frontend suites and typechecks all green.

- [ ] **Step 2: Boot the backend against a throwaway database**

Run (from `backend/`): `rm -rf data && DB_PATH=./data/staff.sqlite PORT=3001 npm start &` (background it, or
use a separate terminal/tool-provided background run) and confirm the
startup log line appears before continuing.
Expected: `fm-suite backend listening on http://[::1]:3001` with no
errors, and a `data/staff.sqlite` file created.

- [ ] **Step 3: Boot the frontend dev server**

Run (from `frontend/`): `npm run dev -- --port 5174 &` (background it)
and wait for Vite's "ready" log line.
Expected: `VITE ... ready` with no errors.

- [ ] **Step 4: Create a coach and a scout through the real API, via the dev proxy**

Run:

```bash
curl -s -i -X POST http://localhost:5174/staff -H "Content-Type: application/json" -d '{
  "name": "Carlo Rossi", "role": "coach", "tags": ["Shortlist"],
  "attributes": {"authority":5,"determination":6,"motivating":5,"attacking":2,"defending":2,"fitness":8,"goalkeeping":1,"possession":2,"setPieces":2,"tactical":3,"technical":3,"tacticalKnowledge":3}
}'

curl -s -i -X POST http://localhost:5174/staff -H "Content-Type: application/json" -d '{
  "name": "Ana Dimitriou", "role": "scout",
  "attributes": {"jpa":7,"jpp":6,"determination":5,"adaptability":6,"westernEurope":8,"centralEurope":1,"ukAndIreland":1,"southernEurope":1,"southEasternEurope":1,"northEasternEurope":1,"northernEurope":1,"easternEurope":1,"southAmericaNorth":1,"southAmericaSouth":1,"northAmerica":1,"westernAfrica":1,"centralAfrica":1,"southernAfrica":1,"northAfrica":1,"middleEast":1,"eastAsia":1,"southEastAsia":1,"oceania":1}
}'

curl -s http://localhost:5174/staff
```

Expected: both `POST`s return `201` with a body including `"role"` and
the right `categories` keys (`Attacking`/`Fitness`/… for the coach,
`"Current Ability Judging"`/`"Potential Judging"` for the scout); the
final `GET` lists both.

- [ ] **Step 5: Confirm the migration path against a pre-existing coach-only database**

This step proves Task 5's migration actually runs against a real file,
not just `:memory:`. Stop the backend from Step 2, then:

```bash
cd backend
rm -f data/staff.sqlite
sqlite3 data/staff.sqlite "
  CREATE TABLE staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]',
    authority INTEGER NOT NULL, determination INTEGER NOT NULL, motivating INTEGER NOT NULL,
    attacking INTEGER NOT NULL, defending INTEGER NOT NULL, fitness INTEGER NOT NULL,
    goalkeeping INTEGER NOT NULL, possession INTEGER NOT NULL, set_pieces INTEGER NOT NULL,
    tactical INTEGER NOT NULL, technical INTEGER NOT NULL, tactical_knowledge INTEGER NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  INSERT INTO staff (name, tags, authority, determination, motivating, attacking, defending, fitness, goalkeeping, possession, set_pieces, tactical, technical, tactical_knowledge, created_at, updated_at)
  VALUES ('Legacy Coach', '[]', 5, 6, 5, 2, 2, 8, 1, 2, 2, 3, 3, 3, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
"
DB_PATH=./data/staff.sqlite PORT=3001 npm start &
sleep 1
curl -s http://localhost:3001/staff
```

(If the `sqlite3` CLI isn't installed, skip straight to confirming via
`db.test.ts`'s migration tests from Task 5 instead — they already cover
this exact scenario against `:memory:`, just not a real file.)

Expected: the `GET` response shows `"role": "coach"` and the original
attributes intact under `"attributes"`, proving the on-disk migration
path works, not just the `:memory:` test path.

- [ ] **Step 6: Clean up**

Stop both the backend and frontend dev servers, then:

```bash
cd backend && rm -rf data
```

Expected: no leftover background processes, no throwaway database
files left in the working tree.

- [ ] **Step 7: Confirm the plan's Review Focus items are all actually covered**

Re-read this plan's Review Focus section and confirm each item traces
to a specific passing test from the tasks above:

- Migration preserves existing data exactly → `db.test.ts`'s
  `"migrateIfNeeded converts the old rigid-column shape..."` test
  (Task 5), plus Step 5 above against a real file.
- Mismatched role/attributes shape rejected with 400 → `server.test.ts`'s
  `"rejects a coach-shaped attributes object when role is scout"` test
  (Task 5).
- `PATCH` cannot change `role` → `server.test.ts`'s `"rejects a role in
  the PATCH body..."` test (Task 5) and `App.test.tsx`'s
  `"saving after switching the edit target..."` assertion that no
  `role` key is ever sent (Task 7).
- Sorting by a category a staff member lacks doesn't crash →
  `sortStaff.test.ts`'s `"sorting by a category that a staff member
  doesn't have..."` test (Task 7).
- Mixed coach/scout roster renders every shared affordance correctly →
  `StaffTable.test.tsx`'s Type filter/sort tests and the category
  dropdown test (Task 7), `DetailPanel.test.tsx`'s and
  `HoverTooltip.test.tsx`'s scout-fixture tests (Task 7).

No code changes expected in this step — it's a documentation check. If
any item doesn't actually trace to a test, add that test to the owning
task before considering the plan complete.

# Screenshot/OCR Staff Attribute Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user upload a screenshot of FM26's staff attribute screen and have the backend OCR it, pre-filling the staff form; replace Scout's 19 fixed region fields with a sparse per-nation knowledge list matching how FM26 actually represents it.

**Architecture:** A new `backend/src/ocr/` module wraps `sharp` (preprocessing) and `tesseract.js` (text recognition), then matches recognized text against closed word vocabularies (not numbers) to populate either standard 1-8 attributes or, for Scout, a `{nation, tier}` list. A new JSON endpoint exposes this as a pure parsing utility; the existing save flow is untouched. Scout's data model changes from 19 fixed region keys to `nationKnowledge: {nation, tier}[]`, requiring a small generalization of the backend's attribute validator (which today assumes every attribute is a uniform 1-8 integer) and a new frontend editor component, since this is the first attribute field in the app that isn't a flat `Record<string, number>`.

**Tech Stack:** TypeScript, Fastify, better-sqlite3, Vitest (backend); React, Vite, Vitest (frontend); new: `tesseract.js`, `sharp`.

**Spec:** `docs/superpowers/specs/2026-10-14-screenshot-ocr-input-design.md`

## Global Constraints

- Value vocabulary for standard attributes is the exact 8 words already in `frontend/src/types.ts:16-23` (`Unsuited`, `Reasonable`, `Competent`, `Average`, `Good`, `Very Good`, `Outstanding`, `Elite`) — never numeric banding.
- Scout nation knowledge uses a separate, 7-word vocabulary (`None`, `Minimal`, `Good`, `Very Good`, `Extensive`, `Exceptional`, `Complete`) — never conflated with the 8-word scale, even though two words overlap textually.
- The image upload endpoint is pure JSON (base64-encoded image in the body), not multipart — this matches every other endpoint in `backend/src/server.ts` and avoids a new multipart dependency/test-fixture complexity for no behavioral gain (the spec described "multipart upload" at the architecture level; this is a wire-format implementation detail, not a behavior change — the endpoint still accepts an image + role and returns the same shape).
- `preprocessImage`/`runOcr` (the `sharp`/`tesseract.js` wrappers) are not covered by real-OCR automated tests — `tesseract.js` against a real image is slow and non-deterministic. `preprocessImage` gets a fast deterministic test (no OCR involved). `runOcr` has no automated test; every task that calls it mocks it. Real-world accuracy is verified manually against actual FM26 screenshots during implementation, not via the automated suite.
- No existing Scout staff records need to be preserved through the region→nationKnowledge migration (explicit user decision — there's no data worth keeping).
- `nationKnowledge` is a Scout-only special case in `StaffForm`/`DetailPanel`, not a new capability added to the shared `RoleUIDefinition` registry (`frontend/src/roles/index.ts:133-141`) — no other role needs a non-fixed-shape attribute set.

## Review Focus

- **Wrong screenshot/tab uploaded for the selected role** (e.g. a Scouting Knowledge screenshot while Coach is selected): every expected attribute should land in `unmatched`, not be silently skipped or crash — pinned in Task 9's `parseAttributes` tests.
- **OCR reads a label correctly but the value text isn't a real vocabulary word** (image noise, a cut-off word): must go to `unmatched`, never guessed or defaulted to a value — pinned in Task 9 and Task 10.
- **The same nation uploaded twice with different tiers** (user re-uploads a corrected or later screenshot of the scrolled nation list): the later read must win, not duplicate the entry — pinned in Task 14 (`StaffForm` merge test).
- **A Scout record saved with a malformed `nationKnowledge` entry** (missing `nation`, or `tier` outside 1-7): the backend must reject it with 400, the same way it already rejects a bad 1-8 attribute value today — pinned in Task 1.
- **A nation name typed or OCR'd that isn't in the canonical `NATIONS` list**: the backend schema deliberately does not enforce membership in the canonical list (only that `nation` is a non-empty string) — manual entry must still be possible for a nation missing from the list, and this is pinned as an explicit test in Task 1, not left as an accidental gap.

---

### Task 1: Backend — generalize attribute validation and migrate Scout to `nationKnowledge`

**Files:**
- Modify: `backend/src/staffSchemas.ts`
- Modify: `backend/src/roles/scout.ts`
- Modify: `backend/src/roles/scout.test.ts`
- Modify: `backend/src/roles/index.ts`
- Modify: `backend/src/roles/index.test.ts`
- Modify: `backend/src/staffRepository.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/src/server.test.ts`
- Test: `backend/src/staffSchemas.test.ts` (new file)

**Interfaces:**
- Produces: `ScoutAttributes.nationKnowledge: { nation: string; tier: number }[]` (replaces 19 region fields). `scoutAttributesSchema` validates `nationKnowledge` as an array of `{nation: string (non-empty), tier: integer 1-7}`, alongside `jpa`/`jpp`/`determination`/`adaptability` as before.
- Produces: `validateAttributes(schema, value)` now reads each required key's expected shape from `schema.properties[key]` instead of assuming every key is a 1-8 integer. Later OCR tasks never call this directly, but every later Scout-touching task depends on `nationKnowledge` existing on `ScoutAttributes` and passing this validator.
- Produces: `RoleDefinition.rate` in `backend/src/roles/index.ts` now accepts `Record<string, unknown>` instead of `Record<string, number>` (see Step 8) — every later task that calls `ROLES[role].rate(...)` is unaffected since none of them narrow that parameter type themselves.

This task first writes failing tests reproducing the gap in `validateAttributes` (it hard-codes "every required key is a 1-8 integer," which rejects any array-shaped field), then generalizes it, then migrates Scout to use the new field.

- [ ] **Step 1: Write a failing test for the new `scoutAttributesSchema` shape**

Create `backend/src/staffSchemas.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { validateAttributes } from "./staffSchemas";
import { scoutAttributesSchema } from "./roles/scout";

describe("validateAttributes with an array-shaped field (Scout's nationKnowledge)", () => {
  const validBase = { jpa: 4, jpp: 4, determination: 4, adaptability: 4 };

  test("accepts a scout with an empty nationKnowledge list", () => {
    expect(validateAttributes(scoutAttributesSchema, { ...validBase, nationKnowledge: [] })).toBe(true);
  });

  test("accepts a scout with valid nation entries", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "England", tier: 7 }, { nation: "Brazil", tier: 3 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(true);
  });

  test("accepts a nation not present in any canonical list (free text is allowed)", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "Atlantis", tier: 1 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(true);
  });

  test("rejects a nationKnowledge entry missing a nation", () => {
    const attrs = { ...validBase, nationKnowledge: [{ tier: 3 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("rejects a nationKnowledge entry with tier above 7", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "France", tier: 8 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("rejects a nationKnowledge entry with a non-integer tier", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "France", tier: 3.5 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("rejects nationKnowledge that isn't an array", () => {
    const attrs = { ...validBase, nationKnowledge: "England" };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("still rejects an out-of-range integer attribute (jpa above 8)", () => {
    const attrs = { ...validBase, jpa: 9, nationKnowledge: [] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- staffSchemas` (from `backend/`)

Expected: `scoutAttributesSchema` import fails to resolve (`scout.ts` doesn't yet export the new shape), or the suite errors — either way, it does not pass yet. This confirms the test exercises code that doesn't exist.

- [ ] **Step 3: Generalize `validateAttributes`**

Replace the body of `backend/src/staffSchemas.ts`'s validation section (the `AttributesSchema` interface and `validateAttributes` function, currently lines 42-55) with:

```ts
interface IntegerProperty {
  type: "integer";
  minimum: number;
  maximum: number;
}

interface NationKnowledgeArrayProperty {
  type: "array";
  items: {
    type: "object";
    required: string[];
    properties: {
      nation: { type: "string"; minLength: number };
      tier: { type: "integer"; minimum: number; maximum: number };
    };
    additionalProperties: false;
  };
}

type AttributeProperty = IntegerProperty | NationKnowledgeArrayProperty;

interface AttributesSchema {
  required: string[];
  properties: Record<string, AttributeProperty>;
}

export function validateAttributes(schema: object, value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const { required, properties } = schema as AttributesSchema;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== required.length) return false;
  return required.every((key) => validateProperty(properties[key], obj[key]));
}

function validateProperty(property: AttributeProperty, v: unknown): boolean {
  if (property.type === "integer") {
    return typeof v === "number" && Number.isInteger(v) && v >= property.minimum && v <= property.maximum;
  }
  if (!Array.isArray(v)) return false;
  return v.every((item) => validateArrayItem(property.items, item));
}

function validateArrayItem(itemSchema: NationKnowledgeArrayProperty["items"], item: unknown): boolean {
  if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
  const obj = item as Record<string, unknown>;
  if (Object.keys(obj).length !== itemSchema.required.length) return false;
  return itemSchema.required.every((key) => {
    const propSchema = itemSchema.properties[key as keyof typeof itemSchema.properties];
    const v = obj[key];
    if (propSchema.type === "string") return typeof v === "string" && v.length >= propSchema.minLength;
    return typeof v === "number" && Number.isInteger(v) && v >= propSchema.minimum && v <= propSchema.maximum;
  });
}
```

This keeps the existing behavior for every other role (every required key is still checked against its own `minimum`/`maximum` read from the schema — previously hard-coded to 1/8, now read from the schema object, with no behavior change since every existing role's schema already uses 1/8) and adds the array case Scout now needs.

- [ ] **Step 4: Migrate `ScoutAttributes` and `scoutAttributesSchema`**

In `backend/src/roles/scout.ts`, replace the `ScoutAttributes` interface (lines 9-33) with:

```ts
export interface NationKnowledgeEntry {
  nation: string;
  tier: number;
}

export interface ScoutAttributes {
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  nationKnowledge: NationKnowledgeEntry[];
}
```

Replace `scoutAttributesSchema` (lines 70-94) with:

```ts
const nationKnowledgeSchema = {
  type: "array" as const,
  items: {
    type: "object" as const,
    required: ["nation", "tier"],
    properties: {
      nation: { type: "string" as const, minLength: 1 },
      tier: { type: "integer" as const, minimum: 1, maximum: 7 },
    },
    additionalProperties: false as const,
  },
};

const baseScoutSchema = buildAttributesSchema(["jpa", "jpp", "determination", "adaptability"]);

export const scoutAttributesSchema = {
  ...baseScoutSchema,
  required: [...baseScoutSchema.required, "nationKnowledge"],
  properties: { ...baseScoutSchema.properties, nationKnowledge: nationKnowledgeSchema },
};
```

`rateScout`, `mentalAverage`, and `primaryAttributeFor` (lines 35-68) are unchanged — they only ever read `jpa`, `jpp`, `determination`, `adaptability`.

- [ ] **Step 5: Run the new test to confirm it passes**

Run: `npm test -- staffSchemas` (from `backend/`)

Expected: all 8 tests in `staffSchemas.test.ts` pass.

- [ ] **Step 6: Update `scout.test.ts`'s fixture and remove the now-redundant region test**

In `backend/src/roles/scout.test.ts`, replace the `attrs` helper (lines 4-31) with:

```ts
function attrs(overrides: Partial<ScoutAttributes> = {}): ScoutAttributes {
  return {
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    nationKnowledge: [],
    ...overrides,
  };
}
```

Replace the `"regional knowledge does not affect either category's score"` test (lines 70-76) with:

```ts
  test("nation knowledge does not affect either category's score", () => {
    const withKnowledge = rateScout(attrs({ nationKnowledge: [{ nation: "England", tier: 7 }] }));
    const withoutKnowledge = rateScout(attrs({ nationKnowledge: [] }));

    expect(withKnowledge.categories["Current Ability Judging"]).toBe(withoutKnowledge.categories["Current Ability Judging"]);
    expect(withKnowledge.categories["Potential Judging"]).toBe(withoutKnowledge.categories["Potential Judging"]);
  });
```

- [ ] **Step 7: Update `roles/index.test.ts`'s scout fixture**

In `backend/src/roles/index.test.ts`, replace the `attrs` object in `"the scout role definition rates scout attributes"` (lines 49-73) with:

```ts
  const attrs = {
    jpa: 8,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    nationKnowledge: [],
  };
```

- [ ] **Step 8: Widen the generic attributes type in `staffRepository.ts`, `server.ts`, and `roles/index.ts`**

In `backend/src/staffRepository.ts`, change both occurrences of `attributes: Record<string, number>` (lines 9 and 18) to `attributes: Record<string, unknown>`.

In `backend/src/server.ts`, change line 40's cast from `attributes: Record<string, number>` to `attributes: Record<string, unknown>`, and line 64's from `attributes: Record<string, number>` to `attributes: Record<string, unknown>`.

In `backend/src/roles/index.ts`, change `RoleDefinition.rate`'s parameter type (line 98) from `rate(attributes: Record<string, number>): StaffRatings;` to `rate(attributes: Record<string, unknown>): StaffRatings;`. This is required, not optional: `toResponse` in `server.ts` calls `ROLES[record.role].rate(record.attributes)`, and once `record.attributes` is `Record<string, unknown>` (from the `staffRepository.ts` change above), passing it to a parameter still typed `Record<string, number>` is a type error (`unknown` isn't assignable to `number`). Each role's own `rate: (attributes) => rateCoach(attributes as unknown as CoachAttributes)` wrapper already casts through `unknown` first, so none of the 15 role files need to change — only the shared `RoleDefinition` interface.

This is a type-only change everywhere (these are casts on `unknown` JSON bodies, `JSON.parse` results, and double-casts through `unknown`, never structurally checked) that stops the types lying once a real attribute value can be an array.

- [ ] **Step 9: Update `server.test.ts`'s scout fixture**

In `backend/src/server.test.ts`, replace the `scoutAttributes` helper (lines 24-51) with:

```ts
function scoutAttributes(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    jpa: 5,
    jpp: 4,
    determination: 4,
    adaptability: 3,
    nationKnowledge: [],
    ...overrides,
  };
}
```

- [ ] **Step 10: Run the full backend suite**

Run: `npm test` (from `backend/`)

Expected: all tests pass, including `scout.test.ts`, `index.test.ts`, `server.test.ts`, and the new `staffSchemas.test.ts`.

- [ ] **Step 11: Typecheck**

Run: `npm run typecheck` (from `backend/`)

Expected: exits 0.

- [ ] **Step 12: Commit**

```bash
git add backend/src/staffSchemas.ts backend/src/staffSchemas.test.ts backend/src/roles/scout.ts backend/src/roles/scout.test.ts backend/src/roles/index.ts backend/src/roles/index.test.ts backend/src/staffRepository.ts backend/src/server.ts backend/src/server.test.ts
git commit -m "Migrate Scout to nationKnowledge list, generalize attribute validation"
```

---

### Task 2: Frontend — migrate Scout to `nationKnowledge`

**Files:**
- Create: `frontend/src/roles/nations.ts`
- Create: `frontend/src/roles/nations.test.ts`
- Modify: `frontend/src/roles/scout.ts`
- Modify: `frontend/src/roles/scout.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (frontend and backend role modules are separate packages, deliberately duplicated per the spec).
- Produces: `NATIONS: string[]` (canonical nation list) from `frontend/src/roles/nations.ts`, consumed by Task 3's `NationKnowledgeEditor`. `ScoutAttributes.nationKnowledge: {nation, tier}[]` and `NATION_KNOWLEDGE_LEVELS: {value, label}[]` from `frontend/src/roles/scout.ts`, consumed by Tasks 3-4.

- [ ] **Step 1: Write the failing test for the nation list**

Create `frontend/src/roles/nations.test.ts`:

```ts
import { expect, test } from "vitest";
import { NATIONS } from "./nations";

test("nation list is non-empty and has no duplicates", () => {
  expect(NATIONS.length).toBeGreaterThan(100);
  expect(new Set(NATIONS).size).toBe(NATIONS.length);
});

test("includes the UK home nations instead of a single United Kingdom entry", () => {
  expect(NATIONS).toContain("England");
  expect(NATIONS).toContain("Scotland");
  expect(NATIONS).toContain("Wales");
  expect(NATIONS).toContain("Northern Ireland");
  expect(NATIONS).not.toContain("United Kingdom");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- nations` (from `frontend/`)

Expected: FAIL — `./nations` cannot be resolved.

- [ ] **Step 3: Create the nation list**

Create `frontend/src/roles/nations.ts`:

```ts
export const NATIONS: string[] = [
  "Afghanistan", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla",
  "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bermuda", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia",
  "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo", "Congo DR", "Cook Islands", "Costa Rica",
  "Croatia", "Cuba", "Curacao", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "England",
  "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Faroe Islands", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Gibraltar", "Greece",
  "Grenada", "Guam", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
  "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Madagascar", "Malawi", "Malaysia",
  "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Montserrat", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nepal", "Netherlands", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "Northern Ireland", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Puerto Rico", "Qatar", "Romania", "Russia", "Rwanda", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Scotland", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "St Kitts and Nevis",
  "St Lucia", "St Vincent and the Grenadines", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Wales", "Yemen", "Zambia", "Zimbabwe",
];
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- nations` (from `frontend/`)

Expected: both tests pass.

- [ ] **Step 5: Write the failing test for Scout's new shape**

In `frontend/src/roles/scout.test.ts`, replace the whole file with:

```ts
import { expect, test } from "vitest";
import { NATION_KNOWLEDGE_LEVELS, SCOUT_CATEGORIES, defaultAttributes, extraDisplayGroups, formGroups, mentalFields } from "./scout";

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

test("default attributes are all Average (4) and do not include nationKnowledge", () => {
  expect(defaultAttributes).toEqual({ jpa: 4, jpp: 4, determination: 4, adaptability: 4 });
});

test("there is no generic extra display group for nation knowledge (it's rendered as a Scout-only special case)", () => {
  expect(extraDisplayGroups).toEqual([]);
});

test("nation knowledge has exactly 7 tiers, None through Complete", () => {
  expect(NATION_KNOWLEDGE_LEVELS.map((level) => level.label)).toEqual([
    "None",
    "Minimal",
    "Good",
    "Very Good",
    "Extensive",
    "Exceptional",
    "Complete",
  ]);
  expect(NATION_KNOWLEDGE_LEVELS.map((level) => level.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npm test -- roles/scout` (from `frontend/`)

Expected: FAIL — `NATION_KNOWLEDGE_LEVELS` is not exported, and the "Regional Knowledge" test that used to exist is gone (replaced), so the suite errors on the missing export.

- [ ] **Step 7: Rewrite `frontend/src/roles/scout.ts`**

Replace the whole file with:

```ts
import type { AttributeGroup } from "./index";

export interface NationKnowledgeEntry {
  nation: string;
  tier: number;
}

export interface ScoutAttributes {
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  nationKnowledge: NationKnowledgeEntry[];
}

export type ScoutCategory = "Current Ability Judging" | "Potential Judging";

export const SCOUT_CATEGORIES: ScoutCategory[] = ["Current Ability Judging", "Potential Judging"];

export const mentalFields: (keyof ScoutAttributes)[] = ["determination", "adaptability"];

export const NATION_KNOWLEDGE_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "None" },
  { value: 2, label: "Minimal" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Extensive" },
  { value: 6, label: "Exceptional" },
  { value: 7, label: "Complete" },
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
];

export const extraDisplayGroups: AttributeGroup[] = [];

export const defaultAttributes: Record<string, number> = {
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
};
```

- [ ] **Step 8: Run it to confirm it passes**

Run: `npm test -- roles/scout` (from `frontend/`)

Expected: all 6 tests pass.

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck` (from `frontend/`)

Expected: exits 0.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/roles/nations.ts frontend/src/roles/nations.test.ts frontend/src/roles/scout.ts frontend/src/roles/scout.test.ts
git commit -m "Migrate frontend Scout role to nationKnowledge list"
```

---

### Task 3: Frontend — `NationKnowledgeEditor` component

**Files:**
- Create: `frontend/src/components/NationKnowledgeEditor.tsx`
- Create: `frontend/src/components/NationKnowledgeEditor.module.css`
- Test: `frontend/src/components/NationKnowledgeEditor.test.tsx`

**Interfaces:**
- Consumes: `NATIONS` from `frontend/src/roles/nations.ts` (Task 2), `NATION_KNOWLEDGE_LEVELS` and `NationKnowledgeEntry` from `frontend/src/roles/scout.ts` (Task 2).
- Produces: `NationKnowledgeEditor({ entries, onChange }: { entries: NationKnowledgeEntry[]; onChange: (entries: NationKnowledgeEntry[]) => void })`, a React component. Consumed by Task 4 (`StaffForm`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/NationKnowledgeEditor.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { NationKnowledgeEditor } from "./NationKnowledgeEditor";

test("renders one row per entry with nation and tier values", () => {
  render(
    <NationKnowledgeEditor
      entries={[{ nation: "England", tier: 7 }, { nation: "Brazil", tier: 3 }]}
      onChange={vi.fn()}
    />,
  );

  expect(screen.getByLabelText("Nation 1")).toHaveValue("England");
  expect(screen.getByLabelText("Knowledge 1")).toHaveValue("7");
  expect(screen.getByLabelText("Nation 2")).toHaveValue("Brazil");
  expect(screen.getByLabelText("Knowledge 2")).toHaveValue("3");
});

test("adding a row calls onChange with an extra entry appended", () => {
  const onChange = vi.fn();
  render(<NationKnowledgeEditor entries={[]} onChange={onChange} />);

  fireEvent.click(screen.getByRole("button", { name: "Add nation" }));

  expect(onChange).toHaveBeenCalledWith([{ nation: "Afghanistan", tier: 1 }]);
});

test("removing a row calls onChange without that entry", () => {
  const onChange = vi.fn();
  render(
    <NationKnowledgeEditor
      entries={[{ nation: "England", tier: 7 }, { nation: "Brazil", tier: 3 }]}
      onChange={onChange}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Remove nation 1" }));

  expect(onChange).toHaveBeenCalledWith([{ nation: "Brazil", tier: 3 }]);
});

test("changing a row's tier calls onChange with that entry updated", () => {
  const onChange = vi.fn();
  render(<NationKnowledgeEditor entries={[{ nation: "England", tier: 7 }]} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Knowledge 1"), { target: { value: "2" } });

  expect(onChange).toHaveBeenCalledWith([{ nation: "England", tier: 2 }]);
});

test("changing a row's nation calls onChange with that entry updated", () => {
  const onChange = vi.fn();
  render(<NationKnowledgeEditor entries={[{ nation: "England", tier: 7 }]} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Nation 1"), { target: { value: "Wales" } });

  expect(onChange).toHaveBeenCalledWith([{ nation: "Wales", tier: 7 }]);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- NationKnowledgeEditor` (from `frontend/`)

Expected: FAIL — `./NationKnowledgeEditor` cannot be resolved.

- [ ] **Step 3: Create `NationKnowledgeEditor.module.css`**

```css
.editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
```

- [ ] **Step 4: Create `NationKnowledgeEditor.tsx`**

```tsx
import { NATIONS } from "../roles/nations";
import { NATION_KNOWLEDGE_LEVELS, type NationKnowledgeEntry } from "../roles/scout";
import styles from "./NationKnowledgeEditor.module.css";

interface NationKnowledgeEditorProps {
  entries: NationKnowledgeEntry[];
  onChange: (entries: NationKnowledgeEntry[]) => void;
}

export function NationKnowledgeEditor({ entries, onChange }: NationKnowledgeEditorProps) {
  function updateEntry(index: number, patch: Partial<NationKnowledgeEntry>) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addEntry() {
    onChange([...entries, { nation: NATIONS[0], tier: 1 }]);
  }

  return (
    <div className={styles.editor}>
      {entries.map((entry, index) => (
        <div key={index} className={styles.row}>
          <input
            list="nation-options"
            aria-label={`Nation ${index + 1}`}
            value={entry.nation}
            onChange={(e) => updateEntry(index, { nation: e.target.value })}
          />
          <select
            aria-label={`Knowledge ${index + 1}`}
            value={entry.tier}
            onChange={(e) => updateEntry(index, { tier: Number(e.target.value) })}
          >
            {NATION_KNOWLEDGE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <button type="button" aria-label={`Remove nation ${index + 1}`} onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <datalist id="nation-options">
        {NATIONS.map((nation) => (
          <option key={nation} value={nation} />
        ))}
      </datalist>
      <button type="button" onClick={addEntry}>
        Add nation
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run it to confirm it passes**

Run: `npm test -- NationKnowledgeEditor` (from `frontend/`)

Expected: all 5 tests pass.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck` (from `frontend/`)

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/NationKnowledgeEditor.tsx frontend/src/components/NationKnowledgeEditor.module.css frontend/src/components/NationKnowledgeEditor.test.tsx
git commit -m "Add NationKnowledgeEditor component for Scout nation knowledge"
```

---

### Task 4: Frontend — wire `NationKnowledgeEditor` into `StaffForm` and `DetailPanel`

**Files:**
- Modify: `frontend/src/components/StaffForm.tsx`
- Modify: `frontend/src/components/StaffForm.test.tsx`
- Modify: `frontend/src/components/DetailPanel.tsx`
- Modify: `frontend/src/components/DetailPanel.test.tsx`

**Interfaces:**
- Consumes: `NationKnowledgeEditor` (Task 3), `NATION_KNOWLEDGE_LEVELS`/`NationKnowledgeEntry`/`ScoutAttributes` (Task 2).
- Produces: `StaffForm` now tracks `nationKnowledge` as separate state from the generic `attributes` record and merges it into the submitted payload only for Scout. `DetailPanel` renders nation knowledge as its own Scout-only section instead of via the generic `extraDisplayGroups` loop (which is now empty for Scout).

- [ ] **Step 1: Write the failing `StaffForm` tests**

In `frontend/src/components/StaffForm.test.tsx`, find the existing Scout-related tests (the ones asserting "Regional Knowledge" / "Regional knowledge" from the earlier cleanup pass) and replace them with:

```tsx
test("scout role shows a nation knowledge editor with an Add nation button", () => {
  render(<StaffForm onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Scout" }));

  expect(screen.getByRole("button", { name: "Add nation" })).toBeInTheDocument();
});

test("submitting a scout includes nationKnowledge entries added via the editor", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole("button", { name: "Scout" }));
  fireEvent.click(screen.getByRole("button", { name: "Add nation" }));
  fireEvent.change(screen.getByLabelText("Nation 1"), { target: { value: "England" } });
  fireEvent.change(screen.getByLabelText("Knowledge 1"), { target: { value: "7" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Scout Name" } });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      attributes: expect.objectContaining({
        nationKnowledge: [{ nation: "England", tier: 7 }],
      }),
    }),
  );
});

test("editing an existing scout pre-fills the nation knowledge editor", () => {
  render(
    <StaffForm
      initialValue={{
        role: "scout",
        name: "Existing Scout",
        tags: [],
        attributes: { jpa: 4, jpp: 4, determination: 4, adaptability: 4, nationKnowledge: [{ nation: "Brazil", tier: 5 }] },
      }}
      onSubmit={vi.fn()}
    />,
  );

  expect(screen.getByLabelText("Nation 1")).toHaveValue("Brazil");
  expect(screen.getByLabelText("Knowledge 1")).toHaveValue("5");
});

test("switching away from scout and back resets the nation knowledge editor", () => {
  render(<StaffForm onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Scout" }));
  fireEvent.click(screen.getByRole("button", { name: "Add nation" }));
  expect(screen.getByLabelText("Nation 1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Close" }));
});
```

(Remove whatever old region-specific test block previously existed in this file so the suite doesn't reference removed UI.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- StaffForm` (from `frontend/`)

Expected: FAIL — no "Add nation" button exists yet in `StaffForm`.

- [ ] **Step 3: Update `StaffForm.tsx`**

In `frontend/src/components/StaffForm.tsx`:

Add imports:

```ts
import { NationKnowledgeEditor } from "./NationKnowledgeEditor";
import type { NationKnowledgeEntry } from "../roles/scout";
```

Add state (after the existing `attributes` state, around line 18):

```ts
  const [nationKnowledge, setNationKnowledge] = useState<NationKnowledgeEntry[]>(
    initialValue?.role === "scout"
      ? ((initialValue.attributes as unknown as { nationKnowledge: NationKnowledgeEntry[] }).nationKnowledge ?? [])
      : [],
  );
```

Update `handleSelectRole` to reset nation knowledge when the role changes:

```ts
  function handleSelectRole(role: StaffRole) {
    setSelectedRole(role);
    setAttributes(ROLES[role].defaultAttributes);
    setNationKnowledge([]);
  }
```

Update `handleSubmit` to merge `nationKnowledge` into the submitted attributes for Scout only:

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;
    if (name.trim().length === 0) {
      setError("Name is required");
      return;
    }
    setError(null);
    const finalAttributes = selectedRole === "scout" ? { ...attributes, nationKnowledge } : attributes;
    onSubmit({
      role: selectedRole,
      name: name.trim(),
      tags: parseTags(tagsText),
      attributes: finalAttributes,
    } as unknown as StaffInput);
  }
```

Render the editor after the `formGroups` map (after the closing `))}` around line 134), inside the `<form>`, before the error/actions block:

```tsx
            {selectedRole === "scout" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Scouting Knowledge</div>
                <NationKnowledgeEditor entries={nationKnowledge} onChange={setNationKnowledge} />
              </div>
            )}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- StaffForm` (from `frontend/`)

Expected: all `StaffForm` tests pass.

- [ ] **Step 5: Write the failing `DetailPanel` test**

In `frontend/src/components/DetailPanel.test.tsx`, add:

```tsx
test("shows scout nation knowledge as its own section", () => {
  const staff = {
    id: 1,
    name: "Scout Name",
    tags: [],
    role: "scout" as const,
    attributes: { jpa: 4, jpp: 4, determination: 4, adaptability: 4, nationKnowledge: [{ nation: "England", tier: 7 }] },
    categories: { "Current Ability Judging": 3, "Potential Judging": 3 },
    bestFit: "Current Ability Judging",
    createdAt: "",
    updatedAt: "",
  };

  render(<DetailPanel staff={staff} mode="pinned" />);

  expect(screen.getByText("Scouting Knowledge")).toBeInTheDocument();
  expect(screen.getByText("England")).toBeInTheDocument();
  expect(screen.getByText("Complete")).toBeInTheDocument();
});
```

Match this test's imports/rendering conventions (e.g. `render`, `screen` from `@testing-library/react`) to whatever is already imported at the top of the existing `DetailPanel.test.tsx`.

- [ ] **Step 6: Run it to confirm it fails**

Run: `npm test -- DetailPanel` (from `frontend/`)

Expected: FAIL — "Scouting Knowledge" text not found.

- [ ] **Step 7: Update `DetailPanel.tsx`**

Add imports:

```ts
import { NATION_KNOWLEDGE_LEVELS, type NationKnowledgeEntry } from "../roles/scout";
```

After the `extraDisplayGroups` block (after the closing `))}` around line 69), add:

```tsx
      {staff.role === "scout" && (attributes.nationKnowledge as NationKnowledgeEntry[])?.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Scouting Knowledge</div>
          <dl className={styles.grid}>
            {(attributes.nationKnowledge as NationKnowledgeEntry[]).map((entry) => (
              <Fragment key={entry.nation}>
                <dt>{entry.nation}</dt>
                <dd>{NATION_KNOWLEDGE_LEVELS.find((level) => level.value === entry.tier)?.label ?? "Unknown"}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      )}
```

- [ ] **Step 8: Run it to confirm it passes**

Run: `npm test -- DetailPanel` (from `frontend/`)

Expected: passes.

- [ ] **Step 9: Run the full frontend suite and typecheck**

Run: `npm test && npm run typecheck` (from `frontend/`)

Expected: all green, typecheck exits 0.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/StaffForm.tsx frontend/src/components/StaffForm.test.tsx frontend/src/components/DetailPanel.tsx frontend/src/components/DetailPanel.test.tsx
git commit -m "Wire NationKnowledgeEditor into StaffForm and DetailPanel for Scout"
```

---

### Task 5: Backend — add OCR dependencies

**Files:**
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `sharp` and `tesseract.js` available as imports for Tasks 7-8.

- [ ] **Step 1: Install the dependencies**

Run (from `backend/`): `npm install sharp tesseract.js`

Expected: `backend/package.json`'s `dependencies` gains `sharp` and `tesseract.js`; `backend/package-lock.json` updates.

- [ ] **Step 2: Verify nothing else broke**

Run: `npm test && npm run typecheck` (from `backend/`)

Expected: unchanged — all existing tests still pass (this step only adds dependencies, no code yet uses them).

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "Add sharp and tesseract.js dependencies for screenshot OCR"
```

---

### Task 6: Backend — fuzzy matching helper

**Files:**
- Create: `backend/src/ocr/fuzzyMatch.ts`
- Test: `backend/src/ocr/fuzzyMatch.test.ts`

**Interfaces:**
- Produces: `levenshteinDistance(a: string, b: string): number`, `findBestMatch(query: string, candidates: string[]): string | null`, `splitTwoColumnLine(text: string): { left: string; right: string } | null`. Consumed by Tasks 9-10 (`parseAttributes`, `parseNationKnowledge`).

- [ ] **Step 1: Write the failing tests**

Create `backend/src/ocr/fuzzyMatch.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { findBestMatch, levenshteinDistance, splitTwoColumnLine } from "./fuzzyMatch";

describe("levenshteinDistance", () => {
  test("is 0 for identical strings, case-insensitively", () => {
    expect(levenshteinDistance("Determination", "determination")).toBe(0);
  });

  test("counts single-character edits", () => {
    expect(levenshteinDistance("cat", "cot")).toBe(1);
    expect(levenshteinDistance("cat", "cats")).toBe(1);
  });
});

describe("findBestMatch", () => {
  test("returns the exact candidate on an exact match", () => {
    expect(findBestMatch("Determination", ["Determination", "Adaptability"])).toBe("Determination");
  });

  test("returns the closest candidate when the query has OCR noise", () => {
    expect(findBestMatch("Deternination", ["Determination", "Adaptability"])).toBe("Determination");
  });

  test("returns null when nothing is close enough", () => {
    expect(findBestMatch("Goalkeeping", ["Determination", "Adaptability"])).toBeNull();
  });

  test("returns null for an empty candidate list", () => {
    expect(findBestMatch("Determination", [])).toBeNull();
  });
});

describe("splitTwoColumnLine", () => {
  test("splits on a wide gap into left and right parts", () => {
    expect(splitTwoColumnLine("Determination     Very Good")).toEqual({ left: "Determination", right: "Very Good" });
  });

  test("returns null when there's no wide gap", () => {
    expect(splitTwoColumnLine("Determination")).toBeNull();
  });

  test("trims surrounding whitespace from both parts", () => {
    expect(splitTwoColumnLine("  England      Complete  ")).toEqual({ left: "England", right: "Complete" });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- fuzzyMatch` (from `backend/`)

Expected: FAIL — `./fuzzyMatch` cannot be resolved.

- [ ] **Step 3: Create `fuzzyMatch.ts`**

```ts
export function levenshteinDistance(a: string, b: string): number {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  const rows = lowerA.length + 1;
  const cols = lowerB.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = lowerA[i - 1] === lowerB[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[rows - 1][cols - 1];
}

export function findBestMatch(query: string, candidates: string[]): string | null {
  let best: { candidate: string; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(query, candidate);
    if (!best || distance < best.distance) {
      best = { candidate, distance };
    }
  }

  if (!best) return null;

  const threshold = Math.max(1, Math.floor(best.candidate.length * 0.3));
  return best.distance <= threshold ? best.candidate : null;
}

export function splitTwoColumnLine(text: string): { left: string; right: string } | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?)\s{2,}(\S.*)$/);
  if (!match) return null;
  return { left: match[1].trim(), right: match[2].trim() };
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- fuzzyMatch` (from `backend/`)

Expected: all 10 tests pass.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` (from `backend/`)

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ocr/fuzzyMatch.ts backend/src/ocr/fuzzyMatch.test.ts
git commit -m "Add fuzzy string matching helper for OCR text matching"
```

---

### Task 7: Backend — OCR vocabulary and label data

**Files:**
- Create: `backend/src/ocr/abilityVocabulary.ts`
- Create: `backend/src/ocr/abilityVocabulary.test.ts`
- Create: `backend/src/ocr/nationKnowledgeVocabulary.ts`
- Create: `backend/src/ocr/nationKnowledgeVocabulary.test.ts`
- Create: `backend/src/ocr/nations.ts`
- Create: `backend/src/ocr/nations.test.ts`
- Create: `backend/src/ocr/attributeLabels.ts`
- Create: `backend/src/ocr/attributeLabels.test.ts`

**Interfaces:**
- Produces: `ABILITY_WORDS: string[]`, `abilityWordToValue(word: string): number | null` from `abilityVocabulary.ts`. `NATION_KNOWLEDGE_WORDS: string[]`, `knowledgeWordToValue(word: string): number | null` from `nationKnowledgeVocabulary.ts`. `NATIONS: string[]` from `nations.ts`. `ATTRIBUTE_LABELS: Record<StaffRole, Record<string, string>>` from `attributeLabels.ts`. All consumed by Tasks 9-10 (`parseAttributes`, `parseNationKnowledge`).

- [ ] **Step 1: Write the failing ability vocabulary test**

Create `backend/src/ocr/abilityVocabulary.test.ts`:

```ts
import { expect, test } from "vitest";
import { ABILITY_WORDS, abilityWordToValue } from "./abilityVocabulary";

test("exposes exactly the 8 ability words in order", () => {
  expect(ABILITY_WORDS).toEqual([
    "Unsuited",
    "Reasonable",
    "Competent",
    "Average",
    "Good",
    "Very Good",
    "Outstanding",
    "Elite",
  ]);
});

test("maps each word to its 1-8 value, case-insensitively", () => {
  expect(abilityWordToValue("Unsuited")).toBe(1);
  expect(abilityWordToValue("very good")).toBe(6);
  expect(abilityWordToValue("ELITE")).toBe(8);
});

test("returns null for a word that isn't in the vocabulary", () => {
  expect(abilityWordToValue("Complete")).toBeNull();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- abilityVocabulary` (from `backend/`)

Expected: FAIL — module not found.

- [ ] **Step 3: Create `abilityVocabulary.ts`**

```ts
export const ABILITY_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "Unsuited" },
  { value: 2, label: "Reasonable" },
  { value: 3, label: "Competent" },
  { value: 4, label: "Average" },
  { value: 5, label: "Good" },
  { value: 6, label: "Very Good" },
  { value: 7, label: "Outstanding" },
  { value: 8, label: "Elite" },
];

export const ABILITY_WORDS: string[] = ABILITY_LEVELS.map((level) => level.label);

export function abilityWordToValue(word: string): number | null {
  const found = ABILITY_LEVELS.find((level) => level.label.toLowerCase() === word.toLowerCase());
  return found ? found.value : null;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- abilityVocabulary` (from `backend/`)

Expected: all 3 tests pass.

- [ ] **Step 5: Write the failing nation knowledge vocabulary test**

Create `backend/src/ocr/nationKnowledgeVocabulary.test.ts`:

```ts
import { expect, test } from "vitest";
import { NATION_KNOWLEDGE_WORDS, knowledgeWordToValue } from "./nationKnowledgeVocabulary";

test("exposes exactly the 7 knowledge words in order", () => {
  expect(NATION_KNOWLEDGE_WORDS).toEqual(["None", "Minimal", "Good", "Very Good", "Extensive", "Exceptional", "Complete"]);
});

test("maps each word to its 1-7 value, case-insensitively", () => {
  expect(knowledgeWordToValue("None")).toBe(1);
  expect(knowledgeWordToValue("exceptional")).toBe(6);
  expect(knowledgeWordToValue("COMPLETE")).toBe(7);
});

test("returns null for a word that isn't in this vocabulary (e.g. the ability scale's 'Elite')", () => {
  expect(knowledgeWordToValue("Elite")).toBeNull();
});
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npm test -- nationKnowledgeVocabulary` (from `backend/`)

Expected: FAIL — module not found.

- [ ] **Step 7: Create `nationKnowledgeVocabulary.ts`**

```ts
export const NATION_KNOWLEDGE_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "None" },
  { value: 2, label: "Minimal" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Extensive" },
  { value: 6, label: "Exceptional" },
  { value: 7, label: "Complete" },
];

export const NATION_KNOWLEDGE_WORDS: string[] = NATION_KNOWLEDGE_LEVELS.map((level) => level.label);

export function knowledgeWordToValue(word: string): number | null {
  const found = NATION_KNOWLEDGE_LEVELS.find((level) => level.label.toLowerCase() === word.toLowerCase());
  return found ? found.value : null;
}
```

- [ ] **Step 8: Run it to confirm it passes**

Run: `npm test -- nationKnowledgeVocabulary` (from `backend/`)

Expected: all 3 tests pass.

- [ ] **Step 9: Write the failing nations list test and create it**

Create `backend/src/ocr/nations.test.ts` with the same two tests as `frontend/src/roles/nations.test.ts` (Task 2, Step 1), and create `backend/src/ocr/nations.ts` with the exact same `NATIONS` array as `frontend/src/roles/nations.ts` (Task 2, Step 3) — this is the deliberate, spec-approved duplication between backend and frontend.

Run: `npm test -- ocr/nations` (from `backend/`)

Expected: both tests pass after creating the file.

- [ ] **Step 10: Write the failing attribute labels test**

Create `backend/src/ocr/attributeLabels.test.ts`:

```ts
import { expect, test } from "vitest";
import { ROLES, STAFF_ROLES } from "../roles/index";
import { ATTRIBUTE_LABELS } from "./attributeLabels";

test("every role has a label entry", () => {
  for (const role of STAFF_ROLES) {
    expect(ATTRIBUTE_LABELS[role]).toBeDefined();
  }
});

test("every role's integer-typed required attribute keys have a label (Scout's nationKnowledge is excluded, it has its own parser)", () => {
  for (const role of STAFF_ROLES) {
    const required = (ROLES[role].attributesSchema as { required: string[] }).required;
    for (const key of required) {
      if (key === "nationKnowledge") continue;
      expect(ATTRIBUTE_LABELS[role]).toHaveProperty(key);
    }
  }
});

test("coach's attacking attribute is labeled Attacking", () => {
  expect(ATTRIBUTE_LABELS.coach.attacking).toBe("Attacking");
});

test("scout's labels cover only jpa, jpp, determination, adaptability", () => {
  expect(Object.keys(ATTRIBUTE_LABELS.scout).sort()).toEqual(["adaptability", "determination", "jpa", "jpp"]);
});
```

- [ ] **Step 11: Run it to confirm it fails**

Run: `npm test -- attributeLabels` (from `backend/`)

Expected: FAIL — module not found.

- [ ] **Step 12: Create `attributeLabels.ts`**

```ts
import type { StaffRole } from "../roles/index";

export const ATTRIBUTE_LABELS: Record<StaffRole, Record<string, string>> = {
  coach: {
    determination: "Determination",
    authority: "Authority",
    motivating: "Motivating",
    attacking: "Attacking",
    defending: "Defending",
    fitness: "Fitness",
    goalkeeping: "Goalkeeping",
    possession: "Possession",
    setPieces: "Set Pieces",
    tactical: "Tactical",
    technical: "Technical",
    tacticalKnowledge: "Tactical Knowledge",
  },
  scout: {
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
  },
  physio: {
    physiotherapy: "Physiotherapy",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  hoyd: {
    workingWithYoungsters: "Working with Youngsters",
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  dof: {
    negotiating: "Negotiating",
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  dataAnalyst: {
    judgingPlayerData: "Judging Player Data",
    judgingTeamData: "Judging Team Data",
    presentingData: "Presenting Data",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  sportsScientist: {
    fitness: "Fitness",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  headOfSportsScience: {
    fitness: "Fitness",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  headPhysio: {
    physiotherapy: "Physiotherapy",
    judgingPlayerCondition: "Judging Player Condition",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  setPieceCoach: {
    setPieces: "Set Pieces",
    determination: "Determination",
    authority: "Authority",
    motivating: "Motivating",
  },
  performanceAnalyst: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    tacticalKnowledge: "Tactical Knowledge",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  headPerformanceAnalyst: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    tacticalKnowledge: "Tactical Knowledge",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  recruitmentAnalyst: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  technicalDirector: {
    negotiating: "Negotiating",
    judgingStaffAbility: "Judging Staff Ability",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  loanManager: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
};
```

- [ ] **Step 13: Run it to confirm it passes**

Run: `npm test -- attributeLabels` (from `backend/`)

Expected: all 4 tests pass.

- [ ] **Step 14: Run the full backend suite and typecheck**

Run: `npm test && npm run typecheck` (from `backend/`)

Expected: all green.

- [ ] **Step 15: Commit**

```bash
git add backend/src/ocr/abilityVocabulary.ts backend/src/ocr/abilityVocabulary.test.ts backend/src/ocr/nationKnowledgeVocabulary.ts backend/src/ocr/nationKnowledgeVocabulary.test.ts backend/src/ocr/nations.ts backend/src/ocr/nations.test.ts backend/src/ocr/attributeLabels.ts backend/src/ocr/attributeLabels.test.ts
git commit -m "Add OCR vocabulary and attribute label data"
```

---

### Task 8: Backend — image preprocessing and OCR wrappers

**Files:**
- Create: `backend/src/ocr/preprocessImage.ts`
- Create: `backend/src/ocr/preprocessImage.test.ts`
- Create: `backend/src/ocr/runOcr.ts`

**Interfaces:**
- Produces: `preprocessImage(input: Buffer): Promise<Buffer>`. `OcrLine { text: string; confidence: number }` and `runOcr(input: Buffer): Promise<OcrLine[]>`. Both consumed by Task 11 (the endpoint) and `OcrLine` consumed by Tasks 9-10.

Per the Global Constraints, `runOcr` has no automated test (real `tesseract.js` recognition is slow/non-deterministic) — every later task that needs OCR output mocks this module. `preprocessImage` is fast and deterministic (just `sharp` calls), so it gets a real test.

- [ ] **Step 1: Write the failing `preprocessImage` test**

Create `backend/src/ocr/preprocessImage.test.ts`:

```ts
import { expect, test } from "vitest";
import sharp from "sharp";
import { preprocessImage } from "./preprocessImage";

test("returns a valid, greyscale, wider image", async () => {
  const input = await sharp({
    create: { width: 100, height: 50, channels: 3, background: { r: 10, g: 20, b: 200 } },
  })
    .png()
    .toBuffer();

  const output = await preprocessImage(input);
  const metadata = await sharp(output).metadata();

  expect(metadata.width).toBe(2400);
  expect(metadata.channels).toBe(1);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- preprocessImage` (from `backend/`)

Expected: FAIL — `./preprocessImage` cannot be resolved.

- [ ] **Step 3: Create `preprocessImage.ts`**

```ts
import sharp from "sharp";

export async function preprocessImage(input: Buffer): Promise<Buffer> {
  return sharp(input).greyscale().normalise().resize({ width: 2400 }).toBuffer();
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- preprocessImage` (from `backend/`)

Expected: passes.

- [ ] **Step 5: Create `runOcr.ts`** (no test — see Global Constraints)

```ts
import { createWorker } from "tesseract.js";

export interface OcrLine {
  text: string;
  confidence: number;
}

export async function runOcr(input: Buffer): Promise<OcrLine[]> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(input);
    return data.lines.map((line) => ({ text: line.text, confidence: line.confidence }));
  } finally {
    await worker.terminate();
  }
}
```

- [ ] **Step 6: Manually verify against a real screenshot (not part of the automated suite)**

Ask the user for one of the FM26 staff attribute screenshots used to write the spec (or any similar screenshot), save it locally, and run a short ad-hoc script (e.g. via `node --experimental-strip-types` or a scratch `.ts` file run with `tsx`) that calls `preprocessImage` then `runOcr` on it and logs the resulting lines. Confirm recognizable attribute labels and ability words appear in the output (exact accuracy doesn't need to be perfect — `parseAttributes`/`parseNationKnowledge` in Tasks 9-10 are built to tolerate OCR noise via fuzzy matching). This step has no pass/fail assertion to automate; it's a sanity check that the real pipeline produces plausibly-readable text before building the parsers on top of it. Note the outcome in the task's completion report.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck` (from `backend/`)

Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add backend/src/ocr/preprocessImage.ts backend/src/ocr/preprocessImage.test.ts backend/src/ocr/runOcr.ts
git commit -m "Add image preprocessing and tesseract.js OCR wrapper"
```

---

### Task 9: Backend — `parseAttributes`

**Files:**
- Create: `backend/src/ocr/parseAttributes.ts`
- Test: `backend/src/ocr/parseAttributes.test.ts`

**Interfaces:**
- Consumes: `findBestMatch`, `splitTwoColumnLine` (Task 6); `ABILITY_WORDS`, `abilityWordToValue` (Task 7); `ATTRIBUTE_LABELS` (Task 7); `OcrLine` type (Task 8); `StaffRole` (existing `../roles/index`).
- Produces: `ParseAttributesResult { matched: Record<string, number>; unmatched: string[]; lowConfidence: string[] }` and `parseAttributes(role: StaffRole, lines: OcrLine[]): ParseAttributesResult`. Consumed by Task 11 (the endpoint).

- [ ] **Step 1: Write the failing tests**

Create `backend/src/ocr/parseAttributes.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { parseAttributes } from "./parseAttributes";

function line(text: string, confidence = 95) {
  return { text, confidence };
}

describe("parseAttributes", () => {
  test("matches a label and value read cleanly", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Elite"), line("Determination     Good")]);

    expect(result.matched.physiotherapy).toBe(8);
    expect(result.matched.determination).toBe(5);
  });

  test("tolerates OCR noise in the label text", () => {
    const result = parseAttributes("physio", [line("Physiotherapv     Elite")]);

    expect(result.matched.physiotherapy).toBe(8);
  });

  test("tolerates OCR noise in the value text", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Ellte")]);

    expect(result.matched.physiotherapy).toBe(8);
  });

  test("an attribute with no matching line at all is unmatched", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Elite")]);

    expect(result.unmatched).toContain("Adaptability");
  });

  test("a label match whose value isn't a real vocabulary word is unmatched, never guessed", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Fantastic")]);

    expect(result.matched.physiotherapy).toBeUndefined();
    expect(result.unmatched).toContain("Physiotherapy");
  });

  test("a confident label+value match below the confidence threshold is lowConfidence, not matched", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Elite", 40)]);

    expect(result.matched.physiotherapy).toBeUndefined();
    expect(result.lowConfidence).toContain("Physiotherapy");
  });

  test("a screenshot from the wrong role/tab leaves everything unmatched", () => {
    const result = parseAttributes("coach", [line("Analysing Data     Elite"), line("Judging Player Ability     Good")]);

    expect(Object.keys(result.matched)).toHaveLength(0);
    expect(result.unmatched).toEqual(
      expect.arrayContaining(["Determination", "Authority", "Motivating", "Attacking", "Defending"]),
    );
  });

  test("scout's attribute parsing covers only jpa, jpp, determination, adaptability (not nation knowledge)", () => {
    const result = parseAttributes("scout", [
      line("Judging Player Ability     Elite"),
      line("Judging Player Potential     Good"),
      line("Determination     Good"),
      line("Adaptability     Good"),
    ]);

    expect(result.matched).toEqual({ jpa: 8, jpp: 5, determination: 5, adaptability: 5 });
    expect(result.unmatched).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- parseAttributes` (from `backend/`)

Expected: FAIL — `./parseAttributes` cannot be resolved.

- [ ] **Step 3: Create `parseAttributes.ts`**

```ts
import type { StaffRole } from "../roles/index";
import type { OcrLine } from "./runOcr";
import { findBestMatch, splitTwoColumnLine } from "./fuzzyMatch";
import { ABILITY_WORDS, abilityWordToValue } from "./abilityVocabulary";
import { ATTRIBUTE_LABELS } from "./attributeLabels";

export interface ParseAttributesResult {
  matched: Record<string, number>;
  unmatched: string[];
  lowConfidence: string[];
}

const LOW_CONFIDENCE_THRESHOLD = 60;

export function parseAttributes(role: StaffRole, lines: OcrLine[]): ParseAttributesResult {
  const labels = ATTRIBUTE_LABELS[role];
  const matched: Record<string, number> = {};
  const unmatched: string[] = [];
  const lowConfidence: string[] = [];

  for (const [key, label] of Object.entries(labels)) {
    const matchedLine = findLineForLabel(label, lines);
    if (!matchedLine) {
      unmatched.push(label);
      continue;
    }

    const split = splitTwoColumnLine(matchedLine.text);
    const valueMatch = split ? findBestMatch(split.right, ABILITY_WORDS) : null;
    if (!valueMatch) {
      unmatched.push(label);
      continue;
    }

    if (matchedLine.confidence < LOW_CONFIDENCE_THRESHOLD) {
      lowConfidence.push(label);
      continue;
    }

    matched[key] = abilityWordToValue(valueMatch)!;
  }

  return { matched, unmatched, lowConfidence };
}

function findLineForLabel(label: string, lines: OcrLine[]): OcrLine | null {
  for (const line of lines) {
    const split = splitTwoColumnLine(line.text);
    const left = split ? split.left : line.text;
    if (findBestMatch(left, [label])) {
      return line;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- parseAttributes` (from `backend/`)

Expected: all 8 tests pass.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` (from `backend/`)

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ocr/parseAttributes.ts backend/src/ocr/parseAttributes.test.ts
git commit -m "Add parseAttributes: match OCR text against role labels and the ability scale"
```

---

### Task 10: Backend — `parseNationKnowledge`

**Files:**
- Create: `backend/src/ocr/parseNationKnowledge.ts`
- Test: `backend/src/ocr/parseNationKnowledge.test.ts`

**Interfaces:**
- Consumes: `findBestMatch`, `splitTwoColumnLine` (Task 6); `NATION_KNOWLEDGE_WORDS`, `knowledgeWordToValue`, `NATIONS` (Task 7); `OcrLine` type (Task 8).
- Produces: `ParseNationKnowledgeResult { nationEntries: {nation: string; tier: number}[]; unmatched: string[]; lowConfidence: string[] }` and `parseNationKnowledge(lines: OcrLine[]): ParseNationKnowledgeResult`. Consumed by Task 11 (the endpoint).

- [ ] **Step 1: Write the failing tests**

Create `backend/src/ocr/parseNationKnowledge.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { parseNationKnowledge } from "./parseNationKnowledge";

function line(text: string, confidence = 95) {
  return { text, confidence };
}

describe("parseNationKnowledge", () => {
  test("matches nation and tier read cleanly", () => {
    const result = parseNationKnowledge([line("Germany     Complete"), line("Austria     Exceptional")]);

    expect(result.nationEntries).toEqual(
      expect.arrayContaining([
        { nation: "Germany", tier: 7 },
        { nation: "Austria", tier: 6 },
      ]),
    );
  });

  test("tolerates OCR noise in the nation name", () => {
    const result = parseNationKnowledge([line("Gennany     Complete")]);

    expect(result.nationEntries).toEqual([{ nation: "Germany", tier: 7 }]);
  });

  test("a line with no wide gap is skipped entirely", () => {
    const result = parseNationKnowledge([line("Scouting Knowledge")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });

  test("a nation that doesn't fuzzy-match any known nation is unmatched by its raw text", () => {
    const result = parseNationKnowledge([line("Zzyzxlandia     Complete")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toContain("Zzyzxlandia");
  });

  test("a matched nation with an unrecognized tier word is unmatched by the matched nation name", () => {
    const result = parseNationKnowledge([line("Germany     Fantastic")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toContain("Germany");
  });

  test("a confident nation+tier match below the confidence threshold is lowConfidence, not an entry", () => {
    const result = parseNationKnowledge([line("Germany     Complete", 40)]);

    expect(result.nationEntries).toEqual([]);
    expect(result.lowConfidence).toContain("Germany");
  });

  test("separates the ability scale's 'Elite' from this vocabulary (not a valid knowledge tier)", () => {
    const result = parseNationKnowledge([line("Germany     Elite")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toContain("Germany");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- parseNationKnowledge` (from `backend/`)

Expected: FAIL — `./parseNationKnowledge` cannot be resolved.

- [ ] **Step 3: Create `parseNationKnowledge.ts`**

```ts
import type { OcrLine } from "./runOcr";
import { findBestMatch, splitTwoColumnLine } from "./fuzzyMatch";
import { NATION_KNOWLEDGE_WORDS, knowledgeWordToValue } from "./nationKnowledgeVocabulary";
import { NATIONS } from "./nations";

export interface ParseNationKnowledgeResult {
  nationEntries: { nation: string; tier: number }[];
  unmatched: string[];
  lowConfidence: string[];
}

const LOW_CONFIDENCE_THRESHOLD = 60;

export function parseNationKnowledge(lines: OcrLine[]): ParseNationKnowledgeResult {
  const nationEntries: { nation: string; tier: number }[] = [];
  const unmatched: string[] = [];
  const lowConfidence: string[] = [];

  for (const line of lines) {
    const split = splitTwoColumnLine(line.text);
    if (!split) continue;

    const nationMatch = findBestMatch(split.left, NATIONS);
    if (!nationMatch) {
      unmatched.push(split.left);
      continue;
    }

    const tierMatch = findBestMatch(split.right, NATION_KNOWLEDGE_WORDS);
    if (!tierMatch) {
      unmatched.push(nationMatch);
      continue;
    }

    if (line.confidence < LOW_CONFIDENCE_THRESHOLD) {
      lowConfidence.push(nationMatch);
      continue;
    }

    nationEntries.push({ nation: nationMatch, tier: knowledgeWordToValue(tierMatch)! });
  }

  return { nationEntries, unmatched, lowConfidence };
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- parseNationKnowledge` (from `backend/`)

Expected: all 7 tests pass.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` (from `backend/`)

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ocr/parseNationKnowledge.ts backend/src/ocr/parseNationKnowledge.test.ts
git commit -m "Add parseNationKnowledge: match OCR text against nations and the knowledge scale"
```

---

### Task 11: Backend — `POST /staff/parse-screenshot` endpoint

**Files:**
- Modify: `backend/src/staffSchemas.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/src/server.test.ts`

**Interfaces:**
- Consumes: `preprocessImage` (Task 8), `runOcr`/`OcrLine` (Task 8), `parseAttributes` (Task 9), `parseNationKnowledge` (Task 10).
- Produces: `POST /staff/parse-screenshot` — body `{ role: string; panel?: "attributes" | "nationKnowledge"; imageBase64: string }`, response is a `ParseAttributesResult` or `ParseNationKnowledgeResult` JSON body. Consumed by Task 12 (frontend `staffApi`).

- [ ] **Step 1: Write the failing endpoint tests**

In `backend/src/server.test.ts`, add near the top (after the existing imports):

```ts
import { vi } from "vitest";

vi.mock("./ocr/preprocessImage", () => ({ preprocessImage: vi.fn(async (buf: Buffer) => buf) }));
vi.mock("./ocr/runOcr", () => ({ runOcr: vi.fn() }));

import { runOcr } from "./ocr/runOcr";
```

(Adjust the existing `import { beforeEach, describe, expect, test } from "vitest";` on line 1 to also include `vi`, rather than adding a second import line, if the test runner/linter in this repo disallows duplicate imports from the same module — check the existing file's import style and merge into one line: `import { beforeEach, describe, expect, test, vi } from "vitest";`.)

Add a new `describe` block (anywhere after the existing ones, before the file's closing):

```ts
describe("POST /staff/parse-screenshot", () => {
  test("returns matched attributes for a standard role", async () => {
    vi.mocked(runOcr).mockResolvedValue([{ text: "Physiotherapy     Elite", confidence: 95 }]);

    const res = await app.inject({
      method: "POST",
      url: "/staff/parse-screenshot",
      payload: { role: "physio", imageBase64: Buffer.from("fake-image").toString("base64") },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().matched.physiotherapy).toBe(8);
  });

  test("returns nationEntries when role is scout and panel is nationKnowledge", async () => {
    vi.mocked(runOcr).mockResolvedValue([{ text: "Germany     Complete", confidence: 95 }]);

    const res = await app.inject({
      method: "POST",
      url: "/staff/parse-screenshot",
      payload: { role: "scout", panel: "nationKnowledge", imageBase64: Buffer.from("fake-image").toString("base64") },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().nationEntries).toEqual([{ nation: "Germany", tier: 7 }]);
  });

  test("defaults to the standard attribute parser for scout when panel is omitted", async () => {
    vi.mocked(runOcr).mockResolvedValue([{ text: "Judging Player Ability     Elite", confidence: 95 }]);

    const res = await app.inject({
      method: "POST",
      url: "/staff/parse-screenshot",
      payload: { role: "scout", imageBase64: Buffer.from("fake-image").toString("base64") },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().matched.jpa).toBe(8);
  });

  test("rejects an unknown role with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff/parse-screenshot",
      payload: { role: "not-a-real-role", imageBase64: Buffer.from("fake-image").toString("base64") },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a request missing imageBase64 with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff/parse-screenshot",
      payload: { role: "physio" },
    });

    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- server` (from `backend/`)

Expected: FAIL — `/staff/parse-screenshot` returns 404 (route doesn't exist yet).

- [ ] **Step 3: Add the schema**

In `backend/src/staffSchemas.ts`, add after `updateStaffSchema`:

```ts
export const parseScreenshotSchema = {
  body: {
    type: "object",
    required: ["role", "imageBase64"],
    properties: {
      role: { type: "string", enum: STAFF_ROLES },
      panel: { type: "string", enum: ["attributes", "nationKnowledge"] },
      imageBase64: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  },
};
```

- [ ] **Step 4: Add the route**

In `backend/src/server.ts`, add imports at the top:

```ts
import { createStaffSchema, updateStaffSchema, idParamSchema, parseScreenshotSchema, validateAttributes } from "./staffSchemas";
import { preprocessImage } from "./ocr/preprocessImage";
import { runOcr } from "./ocr/runOcr";
import { parseAttributes } from "./ocr/parseAttributes";
import { parseNationKnowledge } from "./ocr/parseNationKnowledge";
```

(This replaces the existing `import { createStaffSchema, updateStaffSchema, idParamSchema, validateAttributes } from "./staffSchemas";` line.)

Add the route, after the `app.delete("/staff/:id", ...)` handler and before `return app;`:

```ts
  app.post("/staff/parse-screenshot", { schema: parseScreenshotSchema }, async (request, reply) => {
    const body = request.body as { role: string; panel?: "attributes" | "nationKnowledge"; imageBase64: string };

    let buffer: Buffer;
    try {
      buffer = Buffer.from(body.imageBase64, "base64");
      if (buffer.length === 0) throw new Error("empty image");
    } catch {
      return reply.code(400).send({ error: "Could not decode image" });
    }

    let processed: Buffer;
    try {
      processed = await preprocessImage(buffer);
    } catch {
      return reply.code(400).send({ error: "Could not process image" });
    }

    const lines = await runOcr(processed);

    if (body.role === "scout" && body.panel === "nationKnowledge") {
      return parseNationKnowledge(lines);
    }
    return parseAttributes(body.role as StaffRole, lines);
  });
```

- [ ] **Step 5: Run it to confirm it passes**

Run: `npm test -- server` (from `backend/`)

Expected: all `server.test.ts` tests pass, including the 5 new ones.

- [ ] **Step 6: Run the full backend suite and typecheck**

Run: `npm test && npm run typecheck` (from `backend/`)

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/staffSchemas.ts backend/src/server.ts backend/src/server.test.ts
git commit -m "Add POST /staff/parse-screenshot endpoint"
```

---

### Task 12: Frontend — `staffApi.parseScreenshot`

**Files:**
- Modify: `frontend/src/api/staffApi.ts`
- Modify: `frontend/src/api/staffApi.test.ts`

**Interfaces:**
- Produces: `ParseScreenshotResult { matched?: Record<string, number>; nationEntries?: {nation: string; tier: number}[]; unmatched: string[]; lowConfidence: string[] }` and `parseScreenshot(role: string, imageBase64: string, panel?: "attributes" | "nationKnowledge"): Promise<ParseScreenshotResult>`. Consumed by Task 13 (`ScreenshotUpload`).

- [ ] **Step 1: Write the failing test**

In `frontend/src/api/staffApi.test.ts`, check the existing mocking convention at the top of the file (it mocks `global.fetch`) and add, following that same pattern:

```ts
test("parseScreenshot posts role, panel, and imageBase64 and returns the parsed result", async () => {
  const mockResponse = { matched: { physiotherapy: 8 }, unmatched: [], lowConfidence: [] };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockResponse,
  }) as unknown as typeof fetch;

  const result = await parseScreenshot("physio", "base64data", "attributes");

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/staff/parse-screenshot"),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ role: "physio", panel: "attributes", imageBase64: "base64data" }),
    }),
  );
  expect(result).toEqual(mockResponse);
});

test("parseScreenshot throws when the response is not ok", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 }) as unknown as typeof fetch;

  await expect(parseScreenshot("physio", "base64data")).rejects.toThrow();
});
```

Add `parseScreenshot` to the existing import line at the top of the test file (alongside whatever is already imported from `./staffApi`).

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- staffApi` (from `frontend/`)

Expected: FAIL — `parseScreenshot` is not exported from `./staffApi`.

- [ ] **Step 3: Add `parseScreenshot` to `staffApi.ts`**

```ts
export interface ParseScreenshotResult {
  matched?: Record<string, number>;
  nationEntries?: { nation: string; tier: number }[];
  unmatched: string[];
  lowConfidence: string[];
}

export async function parseScreenshot(
  role: string,
  imageBase64: string,
  panel?: "attributes" | "nationKnowledge",
): Promise<ParseScreenshotResult> {
  const res = await fetch(`${BASE_URL}/staff/parse-screenshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, panel, imageBase64 }),
  });
  if (!res.ok) throw new Error(`Failed to parse screenshot: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- staffApi` (from `frontend/`)

Expected: all `staffApi` tests pass.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` (from `frontend/`)

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/staffApi.ts frontend/src/api/staffApi.test.ts
git commit -m "Add parseScreenshot API function"
```

---

### Task 13: Frontend — `ScreenshotUpload` component

**Files:**
- Create: `frontend/src/components/ScreenshotUpload.tsx`
- Create: `frontend/src/components/ScreenshotUpload.module.css`
- Test: `frontend/src/components/ScreenshotUpload.test.tsx`

**Interfaces:**
- Consumes: `parseScreenshot`, `ParseScreenshotResult` (Task 12).
- Produces: `ScreenshotUpload({ role, panel, label, onResult }: { role: string; panel?: "attributes" | "nationKnowledge"; label: string; onResult: (result: ParseScreenshotResult) => void })`. Consumed by Task 14 (`StaffForm`).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ScreenshotUpload.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import * as staffApi from "../api/staffApi";
import { ScreenshotUpload } from "./ScreenshotUpload";

test("uploading a file calls parseScreenshot and forwards the result", async () => {
  const mockResult = { matched: { physiotherapy: 8 }, unmatched: [], lowConfidence: [] };
  vi.spyOn(staffApi, "parseScreenshot").mockResolvedValue(mockResult);
  const onResult = vi.fn();

  render(<ScreenshotUpload role="physio" label="Upload screenshot" onResult={onResult} />);

  const file = new File(["fake image bytes"], "screenshot.png", { type: "image/png" });
  const input = screen.getByLabelText("Upload screenshot");
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => expect(onResult).toHaveBeenCalledWith(mockResult));
  expect(staffApi.parseScreenshot).toHaveBeenCalledWith("physio", expect.any(String), undefined);
});

test("passes the panel prop through to parseScreenshot", async () => {
  vi.spyOn(staffApi, "parseScreenshot").mockResolvedValue({ nationEntries: [], unmatched: [], lowConfidence: [] });

  render(<ScreenshotUpload role="scout" panel="nationKnowledge" label="Upload nation screenshot" onResult={vi.fn()} />);

  const file = new File(["fake image bytes"], "screenshot.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload nation screenshot"), { target: { files: [file] } });

  await waitFor(() => expect(staffApi.parseScreenshot).toHaveBeenCalledWith("scout", expect.any(String), "nationKnowledge"));
});

test("shows an error message when parseScreenshot fails", async () => {
  vi.spyOn(staffApi, "parseScreenshot").mockRejectedValue(new Error("network error"));

  render(<ScreenshotUpload role="physio" label="Upload screenshot" onResult={vi.fn()} />);

  const file = new File(["fake image bytes"], "screenshot.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload screenshot"), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn't read that screenshot"));
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- ScreenshotUpload` (from `frontend/`)

Expected: FAIL — `./ScreenshotUpload` cannot be resolved.

- [ ] **Step 3: Create `ScreenshotUpload.module.css`**

```css
.upload {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}
```

- [ ] **Step 4: Create `ScreenshotUpload.tsx`**

```tsx
import { useState } from "react";
import { parseScreenshot, type ParseScreenshotResult } from "../api/staffApi";
import styles from "./ScreenshotUpload.module.css";

interface ScreenshotUploadProps {
  role: string;
  panel?: "attributes" | "nationKnowledge";
  label: string;
  onResult: (result: ParseScreenshotResult) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ScreenshotUpload({ role, panel, label, onResult }: ScreenshotUploadProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus("loading");
    try {
      const imageBase64 = await fileToBase64(file);
      const result = await parseScreenshot(role, imageBase64, panel);
      onResult(result);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <label className={styles.upload}>
      {label}
      <input
        type="file"
        accept="image/*"
        aria-label={label}
        onChange={handleChange}
        disabled={status === "loading"}
      />
      {status === "loading" && <span>Reading screenshot…</span>}
      {status === "error" && <span role="alert">Couldn't read that screenshot</span>}
    </label>
  );
}
```

- [ ] **Step 5: Run it to confirm it passes**

Run: `npm test -- ScreenshotUpload` (from `frontend/`)

Expected: all 3 tests pass.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck` (from `frontend/`)

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ScreenshotUpload.tsx frontend/src/components/ScreenshotUpload.module.css frontend/src/components/ScreenshotUpload.test.tsx
git commit -m "Add ScreenshotUpload component"
```

---

### Task 14: Frontend — wire `ScreenshotUpload` into `StaffForm`

**Files:**
- Modify: `frontend/src/components/StaffForm.tsx`
- Modify: `frontend/src/components/StaffForm.test.tsx`

**Interfaces:**
- Consumes: `ScreenshotUpload` (Task 13), `ParseScreenshotResult` (Task 12).
- Produces: a complete, working OCR upload flow in the form: standard attributes merge by key (re-uploading overwrites), Scout's nation-knowledge upload merges by nation name (last-read-wins, so multiple screenshots covering a scrolled list compose correctly), unmatched/lowConfidence render as a visible warning list.

- [ ] **Step 1: Write the failing tests**

`StaffForm.test.tsx` does not currently mock `../api/staffApi` (StaffForm has never called it directly before this task). Use the exact pattern `frontend/src/App.test.tsx` already uses for mocking this same module (`import * as staffApi from "./api/staffApi"; vi.mock("./api/staffApi");` then `vi.mocked(staffApi.listStaff).mockResolvedValue(...)` per test), adapted to this file's relative import path (`../api/staffApi`, since `StaffForm.test.tsx` lives in `src/components/`, one level deeper than `App.test.tsx`). Add near the top of `StaffForm.test.tsx`, below the existing imports:

```ts
import * as staffApi from "../api/staffApi";

vi.mock("../api/staffApi");
```

Then add the following tests (using `vi.mocked(staffApi.parseScreenshot).mockResolvedValue(...)` per test, matching that same convention). These tests use `waitFor` for the async upload-then-update flow — add `waitFor` to the existing `import { fireEvent, render, screen } from "@testing-library/react";` line at the top of the file (making it `import { fireEvent, render, screen, waitFor } from "@testing-library/react";`), since asserting on state that updates after an awaited `parseScreenshot` call requires it:

```tsx
test("uploading a standard attribute screenshot merges matched values into the form", async () => {
  vi.mocked(staffApi.parseScreenshot).mockResolvedValue({ matched: { physiotherapy: 8 }, unmatched: [], lowConfidence: [] });
  render(<StaffForm onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Physio" }));

  const file = new File(["bytes"], "shot.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload screenshot"), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByLabelText("Physiotherapy")).toHaveValue("8"));
});

test("uploaded unmatched attributes render as a visible warning", async () => {
  vi.mocked(staffApi.parseScreenshot).mockResolvedValue({ matched: {}, unmatched: ["Physiotherapy"], lowConfidence: [] });
  render(<StaffForm onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Physio" }));

  const file = new File(["bytes"], "shot.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload screenshot"), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByText(/Couldn't confidently read: Physiotherapy/)).toBeInTheDocument());
});

test("scout shows a separate nation knowledge upload that appends entries by nation, last read wins", async () => {
  vi.mocked(staffApi.parseScreenshot).mockResolvedValueOnce({
    nationEntries: [{ nation: "England", tier: 3 }],
    unmatched: [],
    lowConfidence: [],
  });
  render(<StaffForm onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Scout" }));

  const file1 = new File(["bytes"], "shot1.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload nation knowledge screenshot"), { target: { files: [file1] } });
  await waitFor(() => expect(screen.getByLabelText("Nation 1")).toHaveValue("England"));
  expect(screen.getByLabelText("Knowledge 1")).toHaveValue("3");

  vi.mocked(staffApi.parseScreenshot).mockResolvedValueOnce({
    nationEntries: [{ nation: "England", tier: 7 }, { nation: "Brazil", tier: 2 }],
    unmatched: [],
    lowConfidence: [],
  });
  const file2 = new File(["bytes"], "shot2.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload nation knowledge screenshot"), { target: { files: [file2] } });

  await waitFor(() => expect(screen.getByLabelText("Nation 2")).toHaveValue("Brazil"));
  expect(screen.getByLabelText("Knowledge 1")).toHaveValue("7");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- StaffForm` (from `frontend/`)

Expected: FAIL — no "Upload screenshot" control exists yet.

- [ ] **Step 3: Update `StaffForm.tsx`**

Add imports:

```ts
import { ScreenshotUpload } from "./ScreenshotUpload";
import type { ParseScreenshotResult } from "../api/staffApi";
```

Add state (alongside the existing `nationKnowledge` state from Task 4):

```ts
  const [warnings, setWarnings] = useState<{ unmatched: string[]; lowConfidence: string[] }>({
    unmatched: [],
    lowConfidence: [],
  });
```

Reset warnings in `handleSelectRole` alongside the existing `setNationKnowledge([])`:

```ts
  function handleSelectRole(role: StaffRole) {
    setSelectedRole(role);
    setAttributes(ROLES[role].defaultAttributes);
    setNationKnowledge([]);
    setWarnings({ unmatched: [], lowConfidence: [] });
  }
```

Add two handlers, near `handleAttributeChange`:

```ts
  function handleAttributesResult(result: ParseScreenshotResult) {
    if (result.matched) {
      setAttributes((prev) => ({ ...prev, ...result.matched }));
    }
    setWarnings({ unmatched: result.unmatched, lowConfidence: result.lowConfidence });
  }

  function handleNationResult(result: ParseScreenshotResult) {
    if (result.nationEntries) {
      setNationKnowledge((prev) => {
        const byNation = new Map(prev.map((entry) => [entry.nation, entry]));
        for (const entry of result.nationEntries!) {
          byNation.set(entry.nation, entry);
        }
        return Array.from(byNation.values());
      });
    }
    setWarnings({ unmatched: result.unmatched, lowConfidence: result.lowConfidence });
  }
```

Render the upload controls and warnings. After the `formGroups` map (around line 134, right before the Scouting Knowledge block added in Task 4), add:

```tsx
            {selectedRole && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Import from screenshot</div>
                <ScreenshotUpload role={selectedRole} label="Upload screenshot" onResult={handleAttributesResult} />
                {selectedRole === "scout" && (
                  <ScreenshotUpload
                    role="scout"
                    panel="nationKnowledge"
                    label="Upload nation knowledge screenshot"
                    onResult={handleNationResult}
                  />
                )}
                {(warnings.unmatched.length > 0 || warnings.lowConfidence.length > 0) && (
                  <div role="status">
                    {warnings.unmatched.length > 0 && <div>Couldn't confidently read: {warnings.unmatched.join(", ")}</div>}
                    {warnings.lowConfidence.length > 0 && (
                      <div>Low confidence, please double check: {warnings.lowConfidence.join(", ")}</div>
                    )}
                  </div>
                )}
              </div>
            )}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npm test -- StaffForm` (from `frontend/`)

Expected: all `StaffForm` tests pass, including the 3 new ones and everything from Task 4.

- [ ] **Step 5: Run the full frontend suite and typecheck**

Run: `npm test && npm run typecheck` (from `frontend/`)

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/StaffForm.tsx frontend/src/components/StaffForm.test.tsx
git commit -m "Wire screenshot upload into StaffForm for attributes and Scout nation knowledge"
```

---

### Task 15: Full-branch verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend suite**

Run: `npm test && npm run typecheck` (from `backend/`)

Expected: all green, 0 exit code.

- [ ] **Step 2: Run the full frontend suite**

Run: `npm test && npm run typecheck` (from `frontend/`)

Expected: all green, 0 exit code.

- [ ] **Step 3: Manually exercise the feature end-to-end**

Start both servers (`npm run dev` in `backend/` and `frontend/`, or however this repo's root scripts run them), add a new Physio via the form, upload one of the real FM26 screenshots, confirm fields populate and any unmatched/lowConfidence warnings render sensibly. Repeat for Scout: upload a standard attributes screenshot, then a Scouting Knowledge screenshot, confirm nation rows appear and a second upload with an overlapping nation updates rather than duplicates. This is a manual smoke test, not an automated step — note the outcome in the final report.

- [ ] **Step 4: Confirm no stray `package-lock.json` diffs**

Run: `git status` (from repo root)

Expected: only the files intentionally touched by this plan are modified — if `backend/package-lock.json` or `frontend/package-lock.json` show an unrelated `"peer": true`-style diff from a fresh `npm install`, revert just that noise with `git checkout -- <path>` before any final commit, consistent with this project's established practice.

# FM26 Coach Rating Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web tool that stores FM26 coaching staff attributes and shows an approximate per-training-area star rating and "best fit" category for each, so coaches can be ranked and compared.

**Architecture:** A `backend/` Fastify + TypeScript API backed by a single-table SQLite database (via `better-sqlite3`) computes star ratings on every read from a pure scoring module. A `frontend/` React + TypeScript (Vite) SPA consumes that API and presents a split roster view (sortable table + detail panel) with a hover-preview/click-to-pin interaction, plus an add/edit form.

**Tech Stack:** TypeScript end to end. Backend: Node.js, Fastify 4, better-sqlite3, Vitest. Frontend: React 18, Vite 5, Vitest, React Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-12-coach-rating-tool-design.md](../specs/2026-10-12-coach-rating-tool-design.md)

## Global Constraints

- All Node.js code (backend and frontend) is TypeScript — no `.js` source files.
- The SQLite table is named `staff` (not `coaches`).
- All 12 attribute columns/fields are integers 1–8; nothing in the API or UI may allow a value outside that range.
- Star ratings and "best fit" category are computed on every read and are never persisted to SQLite.
- The scoring weights and star-mapping thresholds live only in `backend/src/scoring.ts`, with a comment stating plainly that they are this project's own unverified approximation of FM26 mechanics, not FM's or fmscout.com's real formula.
- Out of scope for this plan (do not build): screenshot/OCR input, the "spread thin" multi-area assignment penalty, multi-save/club-scoped rosters, any staff role other than coaches.
- Every Fastify route validates its input with a JSON schema; a malformed request body gets a 400.
- No end-to-end tests in this plan.

## Review Focus

- Attribute values outside 1–8 (or non-integers) sent to the API must be rejected with a 400, not stored or silently clamped.
- `GET`/`PATCH`/`DELETE` on a staff `id` that doesn't exist must return 404, not throw a 500 or report a false success.
- An omitted or malformed `tags` field on create (missing entirely, or not an array) must default to `[]` rather than crash on JSON encoding.
- Two categories with identical computed scores must resolve "best fit" via the documented category-order tie-break, not whatever order object iteration happens to produce.
- Clicking a different staff row while one is already pinned must move the pin to the new row in a single click, not get stuck on the old pin.

---

## Task 1: Backend scaffolding + scoring module

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/scoring.ts`
- Test: `backend/src/scoring.test.ts`

**Interfaces:**
- Produces: `Category` (union type of the 7 training-area names), `CATEGORIES: Category[]` (in display/tie-break order: `"Attacking", "Defending", "Fitness", "Goalkeeping", "Possession", "Set Pieces", "Tactical"`), `StaffAttributes` interface (camelCase fields: `authority, determination, motivating, attacking, defending, fitness, goalkeeping, possession, setPieces, tactical, technical, tacticalKnowledge`, all `number`), `StaffRatings` interface (`{ categories: Record<Category, number>; bestFit: Category }`), `rateStaff(attrs: StaffAttributes): StaffRatings`.

- [ ] **Step 1: Create the backend package and TypeScript config**

Create `backend/package.json`:

```json
{
  "name": "fm-suite-backend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "fastify": "^4.28.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Create `backend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

Run: `cd backend && npm install`
Expected: installs without errors, creates `backend/node_modules` and `backend/package-lock.json`.

- [ ] **Step 2: Write the failing scoring tests**

Create `backend/src/scoring.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { rateStaff, type StaffAttributes } from "./scoring";

function attrs(overrides: Partial<StaffAttributes> = {}): StaffAttributes {
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

describe("rateStaff", () => {
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

    const result = rateStaff(allElite);

    expect(result.categories.Attacking).toBe(5);
    expect(result.categories.Defending).toBe(5);
    expect(result.categories.Fitness).toBe(5);
    expect(result.categories.Goalkeeping).toBe(5);
    expect(result.categories.Possession).toBe(5);
    expect(result.categories["Set Pieces"]).toBe(5);
    expect(result.categories.Tactical).toBe(5);
  });

  test("a coach who is Unsuited everywhere scores 1 star in every category", () => {
    const result = rateStaff(attrs());

    expect(result.categories.Attacking).toBe(1);
    expect(result.categories.Tactical).toBe(1);
  });

  test("the matching attribute drives a category's score more than the holy trinity", () => {
    const eliteAttacker = attrs({ attacking: 8 });

    const result = rateStaff(eliteAttacker);

    expect(result.categories.Attacking).toBe(4);
    expect(result.categories.Defending).toBe(1);
    expect(result.bestFit).toBe("Attacking");
  });

  test("Tactical combines tactical, technical, and tactical knowledge", () => {
    const tacticalCoach = attrs({ tactical: 8, technical: 8, tacticalKnowledge: 8 });

    const result = rateStaff(tacticalCoach);

    expect(result.categories.Tactical).toBe(4);
  });

  test("ties for best fit are broken by category order, Attacking first", () => {
    const tied = attrs({ attacking: 6, defending: 6 });

    const result = rateStaff(tied);

    expect(result.bestFit).toBe("Attacking");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/scoring.test.ts`
Expected: FAIL — `Cannot find module './scoring'` (the module doesn't exist yet).

- [ ] **Step 4: Implement the scoring module**

Create `backend/src/scoring.ts`:

```ts
export type Category =
  | "Attacking"
  | "Defending"
  | "Fitness"
  | "Goalkeeping"
  | "Possession"
  | "Set Pieces"
  | "Tactical";

export const CATEGORIES: Category[] = [
  "Attacking",
  "Defending",
  "Fitness",
  "Goalkeeping",
  "Possession",
  "Set Pieces",
  "Tactical",
];

export interface StaffAttributes {
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

export interface StaffRatings {
  categories: Record<Category, number>;
  bestFit: Category;
}

// This weighting between a category's matching attribute and the "holy
// trinity" mental attributes, and the linear 1-8 -> 1-5 star mapping below,
// are this project's own approximation of FM26 coaching mechanics. Neither
// FM nor fmscout.com's coach rating calculator publicly discloses their
// real formula. These numbers are a reasonable starting guess, not a
// derived or verified value, and are expected to be retuned later against
// observed in-game results.
const PRIMARY_WEIGHT = 0.7;
const HOLY_TRINITY_WEIGHT = 0.3;

function holyTrinityAverage(attrs: StaffAttributes): number {
  return (attrs.determination + attrs.authority + attrs.motivating) / 3;
}

function primaryAttributeFor(category: Category, attrs: StaffAttributes): number {
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

function rawCategoryScore(category: Category, attrs: StaffAttributes): number {
  return (
    PRIMARY_WEIGHT * primaryAttributeFor(category, attrs) +
    HOLY_TRINITY_WEIGHT * holyTrinityAverage(attrs)
  );
}

function scoreToStars(score: number): number {
  const stars = Math.round(1 + ((score - 1) * 4) / 7);
  return Math.min(5, Math.max(1, stars));
}

export function rateStaff(attrs: StaffAttributes): StaffRatings {
  const rawScores: Partial<Record<Category, number>> = {};
  for (const category of CATEGORIES) {
    rawScores[category] = rawCategoryScore(category, attrs);
  }

  let bestFit: Category = CATEGORIES[0];
  for (const category of CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Partial<Record<Category, number>> = {};
  for (const category of CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories: categories as Record<Category, number>, bestFit };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/scoring.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

Run (from the repository root):

```bash
git add backend/package.json backend/tsconfig.json backend/vitest.config.ts backend/src/scoring.ts backend/src/scoring.test.ts
git commit -m "Add backend scaffolding and scoring module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: SQLite database + StaffRepository

**Files:**
- Create: `backend/src/db.ts`
- Create: `backend/src/staffRepository.ts`
- Test: `backend/src/staffRepository.test.ts`

**Interfaces:**
- Consumes: `StaffAttributes` from `backend/src/scoring.ts` (Task 1).
- Produces: `createDb(path: string): Database.Database`; `StaffRecord` (`{ id: number; name: string; tags: string[]; attributes: StaffAttributes; createdAt: string; updatedAt: string }`); `StaffInput` (`{ name: string; tags: string[]; attributes: StaffAttributes }`); `StaffRepository` class with `create(input: StaffInput): StaffRecord`, `getById(id: number): StaffRecord | undefined`, `list(): StaffRecord[]`, `update(id: number, patch: Partial<StaffInput>): StaffRecord | undefined`, `delete(id: number): boolean`.

- [ ] **Step 1: Write the failing repository tests**

Create `backend/src/db.ts`:

```ts
import Database from "better-sqlite3";

export function createDb(path: string): Database.Database {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
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
  return db;
}
```

Create `backend/src/staffRepository.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import type Database from "better-sqlite3";
import { createDb } from "./db";
import { StaffRepository, type StaffInput } from "./staffRepository";
import type { StaffAttributes } from "./scoring";

function sampleAttributes(overrides: Partial<StaffAttributes> = {}): StaffAttributes {
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
    const input: StaffInput = { name: "Carlo Rossi", tags: ["Shortlist"], attributes: sampleAttributes() };

    const created = repo.create(input);

    expect(created.id).toBeGreaterThan(0);
    expect(created.name).toBe("Carlo Rossi");
    expect(created.tags).toEqual(["Shortlist"]);
    expect(created.attributes).toEqual(sampleAttributes());
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });

  test("getById returns the matching record and undefined for a missing id", () => {
    const created = repo.create({ name: "Jurgen Voss", tags: [], attributes: sampleAttributes() });

    expect(repo.getById(created.id)?.name).toBe("Jurgen Voss");
    expect(repo.getById(999999)).toBeUndefined();
  });

  test("list returns all created records", () => {
    repo.create({ name: "Coach A", tags: [], attributes: sampleAttributes() });
    repo.create({ name: "Coach B", tags: [], attributes: sampleAttributes() });

    expect(repo.list().map((s) => s.name)).toEqual(["Coach A", "Coach B"]);
  });

  test("update merges a partial patch into the existing record", () => {
    const created = repo.create({ name: "Coach C", tags: [], attributes: sampleAttributes() });

    const updated = repo.update(created.id, { name: "Coach C Updated" });

    expect(updated?.name).toBe("Coach C Updated");
    expect(updated?.attributes).toEqual(sampleAttributes());
  });

  test("update returns undefined for a missing id", () => {
    expect(repo.update(999999, { name: "Nope" })).toBeUndefined();
  });

  test("delete removes the record and reports success", () => {
    const created = repo.create({ name: "Coach D", tags: [], attributes: sampleAttributes() });

    expect(repo.delete(created.id)).toBe(true);
    expect(repo.getById(created.id)).toBeUndefined();
    expect(repo.delete(created.id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/staffRepository.test.ts`
Expected: FAIL — `Cannot find module './staffRepository'`.

- [ ] **Step 3: Implement StaffRepository**

Create `backend/src/staffRepository.ts`:

```ts
import type { Database } from "better-sqlite3";
import type { StaffAttributes } from "./scoring";

export interface StaffRecord {
  id: number;
  name: string;
  tags: string[];
  attributes: StaffAttributes;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInput {
  name: string;
  tags: string[];
  attributes: StaffAttributes;
}

interface StaffRow {
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

function rowToRecord(row: StaffRow): StaffRecord {
  return {
    id: row.id,
    name: row.name,
    tags: JSON.parse(row.tags),
    attributes: {
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
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class StaffRepository {
  constructor(private db: Database) {}

  create(input: StaffInput): StaffRecord {
    const now = new Date().toISOString();
    const a = input.attributes;
    const result = this.db
      .prepare(
        `INSERT INTO staff (
          name, tags, authority, determination, motivating, attacking,
          defending, fitness, goalkeeping, possession, set_pieces,
          tactical, technical, tactical_knowledge, created_at, updated_at
        ) VALUES (@name, @tags, @authority, @determination, @motivating, @attacking,
          @defending, @fitness, @goalkeeping, @possession, @setPieces,
          @tactical, @technical, @tacticalKnowledge, @createdAt, @updatedAt)`
      )
      .run({
        name: input.name,
        tags: JSON.stringify(input.tags),
        authority: a.authority,
        determination: a.determination,
        motivating: a.motivating,
        attacking: a.attacking,
        defending: a.defending,
        fitness: a.fitness,
        goalkeeping: a.goalkeeping,
        possession: a.possession,
        setPieces: a.setPieces,
        tactical: a.tactical,
        technical: a.technical,
        tacticalKnowledge: a.tacticalKnowledge,
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

  update(id: number, patch: Partial<StaffInput>): StaffRecord | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const merged: StaffInput = {
      name: patch.name ?? existing.name,
      tags: patch.tags ?? existing.tags,
      attributes: { ...existing.attributes, ...patch.attributes },
    };
    const now = new Date().toISOString();
    const a = merged.attributes;

    this.db
      .prepare(
        `UPDATE staff SET
          name = @name, tags = @tags, authority = @authority,
          determination = @determination, motivating = @motivating,
          attacking = @attacking, defending = @defending, fitness = @fitness,
          goalkeeping = @goalkeeping, possession = @possession,
          set_pieces = @setPieces, tactical = @tactical, technical = @technical,
          tactical_knowledge = @tacticalKnowledge, updated_at = @updatedAt
        WHERE id = @id`
      )
      .run({
        id,
        name: merged.name,
        tags: JSON.stringify(merged.tags),
        authority: a.authority,
        determination: a.determination,
        motivating: a.motivating,
        attacking: a.attacking,
        defending: a.defending,
        fitness: a.fitness,
        goalkeeping: a.goalkeeping,
        possession: a.possession,
        setPieces: a.setPieces,
        tactical: a.tactical,
        technical: a.technical,
        tacticalKnowledge: a.tacticalKnowledge,
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/staffRepository.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/db.ts backend/src/staffRepository.ts backend/src/staffRepository.test.ts
git commit -m "Add SQLite staff table and StaffRepository

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Fastify API routes

**Files:**
- Create: `backend/src/staffSchemas.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/index.ts`
- Test: `backend/src/server.test.ts`

**Interfaces:**
- Consumes: `rateStaff` from `scoring.ts` (Task 1); `StaffRepository`, `StaffRecord`, `StaffInput`, `createDb` from `staffRepository.ts`/`db.ts` (Task 2).
- Produces: `buildServer(db: Database.Database): FastifyInstance` from `server.ts`, used directly by tests and by `index.ts`.

- [ ] **Step 1: Write the failing route tests**

Create `backend/src/staffSchemas.ts`:

```ts
const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const staffAttributesSchema = {
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

export const createStaffSchema = {
  body: {
    type: "object",
    required: ["name", "attributes"],
    properties: {
      name: { type: "string", minLength: 1 },
      tags: { type: "array", items: { type: "string" }, default: [] },
      attributes: staffAttributesSchema,
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
      attributes: staffAttributesSchema,
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
```

Create `backend/src/server.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { createDb } from "./db";
import { buildServer } from "./server";
import type { StaffAttributes } from "./scoring";

function sampleAttributes(overrides: Partial<StaffAttributes> = {}): StaffAttributes {
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

let app: FastifyInstance;

beforeEach(() => {
  app = buildServer(createDb(":memory:"));
});

describe("POST /staff", () => {
  test("creates a staff member and returns it with computed ratings", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Carlo Rossi", tags: ["Shortlist"], attributes: sampleAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Carlo Rossi");
    expect(body.tags).toEqual(["Shortlist"]);
    expect(body.categories.Attacking).toBeGreaterThanOrEqual(1);
    expect(body.bestFit).toBeDefined();
  });

  test("defaults tags to an empty array when omitted", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "No Tags", attributes: sampleAttributes() },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().tags).toEqual([]);
  });

  test("rejects an attribute value above 8 with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Attrs", attributes: sampleAttributes({ attacking: 9 }) },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a missing name with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { attributes: sampleAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /staff", () => {
  test("lists all created staff", async () => {
    await app.inject({ method: "POST", url: "/staff", payload: { name: "A", attributes: sampleAttributes() } });
    await app.inject({ method: "POST", url: "/staff", payload: { name: "B", attributes: sampleAttributes() } });

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
      payload: { name: "Before", attributes: sampleAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { name: "After" } });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("After");
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
      payload: { name: "ToDelete", attributes: sampleAttributes() },
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

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/server.test.ts`
Expected: FAIL — `Cannot find module './server'`.

- [ ] **Step 3: Implement the Fastify server and routes**

Create `backend/src/server.ts`:

```ts
import Fastify, { type FastifyInstance } from "fastify";
import type { Database } from "better-sqlite3";
import { StaffRepository, type StaffRecord } from "./staffRepository";
import { rateStaff } from "./scoring";
import { createStaffSchema, updateStaffSchema, idParamSchema } from "./staffSchemas";

function toResponse(record: StaffRecord) {
  const ratings = rateStaff(record.attributes);
  return {
    id: record.id,
    name: record.name,
    tags: record.tags,
    attributes: record.attributes,
    categories: ratings.categories,
    bestFit: ratings.bestFit,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function buildServer(db: Database): FastifyInstance {
  const app = Fastify();
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
    const body = request.body as { name: string; tags?: string[]; attributes: StaffRecord["attributes"] };
    const created = repo.create({ name: body.name, tags: body.tags ?? [], attributes: body.attributes });
    reply.code(201);
    return toResponse(created);
  });

  app.patch("/staff/:id", { schema: updateStaffSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; tags: string[]; attributes: StaffRecord["attributes"] }>;
    const updated = repo.update(Number(id), body);
    if (!updated) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    return toResponse(updated);
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

Create `backend/src/index.ts`:

```ts
import { createDb } from "./db";
import { buildServer } from "./server";

const db = createDb(process.env.DB_PATH ?? "./data/staff.sqlite");
const app = buildServer(db);

app
  .listen({ port: Number(process.env.PORT ?? 3001) })
  .then((address) => {
    console.log(`fm-suite backend listening on ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/server.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS — all scoring, repository, and server tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/staffSchemas.ts backend/src/server.ts backend/src/index.ts backend/src/server.test.ts
git commit -m "Add Fastify staff CRUD routes with JSON-schema validation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Frontend scaffolding + shared types + API client

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api/staffApi.ts`
- Test: `frontend/src/api/staffApi.test.ts`

**Interfaces:**
- Produces: `Category`, `CATEGORIES`, `StaffAttributes`, `StaffMember` (`{ id, name, tags, attributes, categories: Record<Category, number>, bestFit: Category, createdAt, updatedAt }`), `StaffInput` (`{ name, tags, attributes }`), `ATTRIBUTE_LEVELS: { value: number; label: string }[]`, `ATTRIBUTE_FIELDS: { key: keyof StaffAttributes; label: string }[]`, `HOLY_TRINITY_FIELDS: (keyof StaffAttributes)[]` from `types.ts`; `listStaff(): Promise<StaffMember[]>`, `createStaff(input: StaffInput): Promise<StaffMember>`, `updateStaff(id: number, patch: Partial<StaffInput>): Promise<StaffMember>`, `deleteStaff(id: number): Promise<void>` from `api/staffApi.ts`.

- [ ] **Step 1: Scaffold the Vite + React + TypeScript project**

Create `frontend/package.json`:

```json
{
  "name": "fm-suite-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

Create `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

Create `frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
```

Create `frontend/src/setupTests.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>FM26 Coach Rating Tool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `frontend/src/App.tsx` (placeholder, replaced in Task 8):

```tsx
export function App() {
  return <div>FM26 Coach Rating Tool</div>;
}
```

Run: `cd frontend && npm install`
Expected: installs without errors, creates `frontend/node_modules` and `frontend/package-lock.json`.

- [ ] **Step 2: Add shared types**

Create `frontend/src/types.ts`:

```ts
export type Category =
  | "Attacking"
  | "Defending"
  | "Fitness"
  | "Goalkeeping"
  | "Possession"
  | "Set Pieces"
  | "Tactical";

export const CATEGORIES: Category[] = [
  "Attacking",
  "Defending",
  "Fitness",
  "Goalkeeping",
  "Possession",
  "Set Pieces",
  "Tactical",
];

export interface StaffAttributes {
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

export interface StaffMember {
  id: number;
  name: string;
  tags: string[];
  attributes: StaffAttributes;
  categories: Record<Category, number>;
  bestFit: Category;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInput {
  name: string;
  tags: string[];
  attributes: StaffAttributes;
}

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

export const ATTRIBUTE_FIELDS: { key: keyof StaffAttributes; label: string }[] = [
  { key: "authority", label: "Authority" },
  { key: "determination", label: "Determination" },
  { key: "motivating", label: "Motivating" },
  { key: "attacking", label: "Attacking" },
  { key: "defending", label: "Defending" },
  { key: "fitness", label: "Fitness" },
  { key: "goalkeeping", label: "Goalkeeping" },
  { key: "possession", label: "Possession" },
  { key: "setPieces", label: "Set Pieces" },
  { key: "tactical", label: "Tactical" },
  { key: "technical", label: "Technical" },
  { key: "tacticalKnowledge", label: "Tactical Knowledge" },
];

export const HOLY_TRINITY_FIELDS: (keyof StaffAttributes)[] = ["determination", "authority", "motivating"];
```

- [ ] **Step 3: Write the failing API client tests**

Create `frontend/src/api/staffApi.test.ts`:

```ts
import { beforeEach, expect, test, vi } from "vitest";
import { listStaff, createStaff, updateStaff, deleteStaff } from "./staffApi";
import type { StaffInput, StaffMember } from "../types";

const sampleStaff: StaffMember = {
  id: 1,
  name: "Test Coach",
  tags: [],
  attributes: {
    authority: 5,
    determination: 5,
    motivating: 5,
    attacking: 5,
    defending: 5,
    fitness: 5,
    goalkeeping: 5,
    possession: 5,
    setPieces: 5,
    tactical: 5,
    technical: 5,
    tacticalKnowledge: 5,
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
};

beforeEach(() => {
  vi.restoreAllMocks();
});

test("listStaff fetches the staff list", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [sampleStaff] }) as unknown as typeof fetch;

  const result = await listStaff();

  expect(result).toEqual([sampleStaff]);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/staff"));
});

test("listStaff throws when the response is not ok", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

  await expect(listStaff()).rejects.toThrow();
});

test("createStaff posts the input and returns the created staff member", async () => {
  const input: StaffInput = { name: sampleStaff.name, tags: [], attributes: sampleStaff.attributes };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleStaff }) as unknown as typeof fetch;

  const result = await createStaff(input);

  expect(result).toEqual(sampleStaff);
  const [, options] = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [string, RequestInit];
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body as string)).toEqual(input);
});

test("updateStaff sends a PATCH with the given patch", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleStaff }) as unknown as typeof fetch;

  await updateStaff(1, { name: "Renamed" });

  const [url, options] = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [string, RequestInit];
  expect(url).toContain("/staff/1");
  expect(options.method).toBe("PATCH");
  expect(JSON.parse(options.body as string)).toEqual({ name: "Renamed" });
});

test("deleteStaff sends a DELETE request", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

  await deleteStaff(1);

  const [url, options] = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [string, RequestInit];
  expect(url).toContain("/staff/1");
  expect(options.method).toBe("DELETE");
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/api/staffApi.test.ts`
Expected: FAIL — `Cannot find module './staffApi'`.

- [ ] **Step 5: Implement the API client**

Create `frontend/src/api/staffApi.ts`:

```ts
import type { StaffInput, StaffMember } from "../types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:3001";

export async function listStaff(): Promise<StaffMember[]> {
  const res = await fetch(`${BASE_URL}/staff`);
  if (!res.ok) throw new Error(`Failed to list staff: ${res.status}`);
  return res.json();
}

export async function createStaff(input: StaffInput): Promise<StaffMember> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create staff: ${res.status}`);
  return res.json();
}

export async function updateStaff(id: number, patch: Partial<StaffInput>): Promise<StaffMember> {
  const res = await fetch(`${BASE_URL}/staff/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update staff ${id}: ${res.status}`);
  return res.json();
}

export async function deleteStaff(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/staff/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete staff ${id}: ${res.status}`);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/api/staffApi.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html frontend/src/main.tsx frontend/src/App.tsx frontend/src/types.ts frontend/src/setupTests.ts frontend/src/api/staffApi.ts frontend/src/api/staffApi.test.ts
git commit -m "Add frontend scaffolding, shared types, and staff API client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Presentational display components (sortStaff, StaffTable, DetailPanel, HoverTooltip)

**Files:**
- Create: `frontend/src/components/sortStaff.ts`
- Test: `frontend/src/components/sortStaff.test.ts`
- Create: `frontend/src/components/starString.ts`
- Create: `frontend/src/components/StaffTable.tsx`
- Test: `frontend/src/components/StaffTable.test.tsx`
- Create: `frontend/src/components/DetailPanel.tsx`
- Test: `frontend/src/components/DetailPanel.test.tsx`
- Create: `frontend/src/components/HoverTooltip.tsx`
- Test: `frontend/src/components/HoverTooltip.test.tsx`

**Interfaces:**
- Consumes: `Category`, `CATEGORIES`, `StaffMember`, `ATTRIBUTE_LEVELS`, `HOLY_TRINITY_FIELDS` from `../types` (Task 4).
- Produces: `starString(n: number): string`; `type SortKey = "name" | "bestFit" | Category`; `sortStaff(staff: StaffMember[], sortKey: SortKey, direction: "asc" | "desc"): StaffMember[]`; `<StaffTable staff pinnedId onRowHover onRowClick />`; `<DetailPanel staff mode onEdit onDelete />` where `mode: "empty" | "preview" | "pinned"`; `<HoverTooltip staff position />` where `position: { x: number; y: number } | null`.

- [ ] **Step 1: Write the failing sortStaff tests**

Create `frontend/src/components/sortStaff.test.ts`:

```ts
import { expect, test } from "vitest";
import { sortStaff } from "./sortStaff";
import type { StaffMember } from "../types";

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
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
  };
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/sortStaff.test.ts`
Expected: FAIL — `Cannot find module './sortStaff'`.

- [ ] **Step 3: Implement sortStaff and starString**

Create `frontend/src/components/sortStaff.ts`:

```ts
import type { Category, StaffMember } from "../types";

export type SortKey = "name" | "bestFit" | Category;

function compare(a: StaffMember, b: StaffMember, sortKey: SortKey): number {
  if (sortKey === "name") return a.name.localeCompare(b.name);
  if (sortKey === "bestFit") return a.categories[a.bestFit] - b.categories[b.bestFit];
  return a.categories[sortKey] - b.categories[sortKey];
}

export function sortStaff(staff: StaffMember[], sortKey: SortKey, direction: "asc" | "desc"): StaffMember[] {
  const sorted = [...staff].sort((a, b) => compare(a, b, sortKey));
  return direction === "desc" ? sorted.reverse() : sorted;
}
```

Create `frontend/src/components/starString.ts`:

```ts
export function starString(stars: number): string {
  const filled = "★".repeat(stars);
  const empty = "☆".repeat(5 - stars);
  return filled + empty;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/sortStaff.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing StaffTable tests**

Create `frontend/src/components/StaffTable.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffTable } from "./StaffTable";
import type { StaffMember } from "../types";

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
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
  };
}

test("renders a row per staff member with name, tags, and best fit", () => {
  const staff = [member({ id: 1, name: "Carlo Rossi", tags: ["Shortlist"], bestFit: "Fitness" })];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  expect(screen.getByText("Shortlist")).toBeInTheDocument();
  expect(screen.getByText(/Fitness/)).toBeInTheDocument();
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
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/StaffTable.test.tsx`
Expected: FAIL — `Cannot find module './StaffTable'`.

- [ ] **Step 7: Implement StaffTable**

Create `frontend/src/components/StaffTable.tsx`:

```tsx
import { useState } from "react";
import { CATEGORIES, type StaffMember } from "../types";
import { sortStaff, type SortKey } from "./sortStaff";
import { starString } from "./starString";

interface StaffTableProps {
  staff: StaffMember[];
  pinnedId: number | null;
  onRowHover: (id: number | null) => void;
  onRowClick: (id: number) => void;
}

export function StaffTable({ staff, pinnedId, onRowHover, onRowClick }: StaffTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  function handleCategorySort(category: string) {
    setSortKey(category as SortKey);
    setDirection("desc");
  }

  const sorted = sortStaff(staff, sortKey, direction);

  return (
    <div>
      <label>
        Sort by category
        <select aria-label="Sort by category" value="" onChange={(e) => handleCategorySort(e.target.value)}>
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORIES.map((category) => (
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
            <th>Tags</th>
            <th onClick={() => toggleSort("bestFit")}>Best fit</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((member) => (
            <tr
              key={member.id}
              onMouseOver={() => onRowHover(member.id)}
              onMouseOut={() => onRowHover(null)}
              onClick={() => onRowClick(member.id)}
              style={pinnedId === member.id ? { fontWeight: "bold" } : undefined}
            >
              <td>{member.name}</td>
              <td>{member.tags.join(", ") || "—"}</td>
              <td>
                {member.bestFit} {starString(member.categories[member.bestFit])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/StaffTable.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 9: Write the failing DetailPanel tests**

Create `frontend/src/components/DetailPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { DetailPanel } from "./DetailPanel";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Carlo Rossi",
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

test("shows a Pinned label and Edit/Delete buttons in pinned mode", () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  render(<DetailPanel staff={sample} mode="pinned" onEdit={onEdit} onDelete={onDelete} />);

  expect(screen.getByText("Pinned")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Edit"));
  expect(onEdit).toHaveBeenCalledWith(sample);

  fireEvent.click(screen.getByText("Delete"));
  expect(onDelete).toHaveBeenCalledWith(sample.id);
});
```

- [ ] **Step 10: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/DetailPanel.test.tsx`
Expected: FAIL — `Cannot find module './DetailPanel'`.

- [ ] **Step 11: Implement DetailPanel**

Create `frontend/src/components/DetailPanel.tsx`:

```tsx
import { ATTRIBUTE_LEVELS, CATEGORIES, HOLY_TRINITY_FIELDS, type StaffMember } from "../types";
import { starString } from "./starString";

interface DetailPanelProps {
  staff: StaffMember | null;
  mode: "empty" | "preview" | "pinned";
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (id: number) => void;
}

function levelLabel(value: number): string {
  return ATTRIBUTE_LEVELS.find((level) => level.value === value)?.label ?? String(value);
}

export function DetailPanel({ staff, mode, onEdit, onDelete }: DetailPanelProps) {
  if (!staff || mode === "empty") {
    return <div>Hover a row to preview — click to pin</div>;
  }

  return (
    <div>
      <span>{mode === "pinned" ? "Pinned" : "Preview"}</span>
      <h3>{staff.name}</h3>
      <div>{staff.tags.join(", ") || "No tags"}</div>
      <dl>
        {HOLY_TRINITY_FIELDS.map((field) => (
          <div key={field}>
            <dt>{field}</dt>
            <dd>{levelLabel(staff.attributes[field])}</dd>
          </div>
        ))}
      </dl>
      <dl>
        {CATEGORIES.map((category) => (
          <div key={category}>
            <dt>{category}</dt>
            <dd>{starString(staff.categories[category])}</dd>
          </div>
        ))}
      </dl>
      {mode === "pinned" && (
        <div>
          <button onClick={() => onEdit?.(staff)}>Edit</button>
          <button onClick={() => onDelete?.(staff.id)}>Delete</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 12: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/DetailPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 13: Write the failing HoverTooltip tests**

Create `frontend/src/components/HoverTooltip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { HoverTooltip } from "./HoverTooltip";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Ana Dimitriou",
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

  const tooltip = screen.getByText("Ana Dimitriou").closest("div")!;
  expect(tooltip.style.left).toBe("42px");
  expect(tooltip.style.top).toBe("24px");
});
```

- [ ] **Step 14: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/HoverTooltip.test.tsx`
Expected: FAIL — `Cannot find module './HoverTooltip'`.

- [ ] **Step 15: Implement HoverTooltip**

Create `frontend/src/components/HoverTooltip.tsx`:

```tsx
import { HOLY_TRINITY_FIELDS, type StaffMember } from "../types";
import { starString } from "./starString";

interface HoverTooltipProps {
  staff: StaffMember | null;
  position: { x: number; y: number } | null;
}

export function HoverTooltip({ staff, position }: HoverTooltipProps) {
  if (!staff || !position) return null;

  return (
    <div style={{ position: "fixed", left: `${position.x}px`, top: `${position.y}px` }}>
      <div>{staff.name}</div>
      {HOLY_TRINITY_FIELDS.map((field) => (
        <div key={field}>
          {field}: {staff.attributes[field]}
        </div>
      ))}
      <div>
        Best fit: {staff.bestFit} {starString(staff.categories[staff.bestFit])}
      </div>
    </div>
  );
}
```

- [ ] **Step 16: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/HoverTooltip.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 17: Commit**

```bash
git add frontend/src/components/sortStaff.ts frontend/src/components/sortStaff.test.ts frontend/src/components/starString.ts frontend/src/components/StaffTable.tsx frontend/src/components/StaffTable.test.tsx frontend/src/components/DetailPanel.tsx frontend/src/components/DetailPanel.test.tsx frontend/src/components/HoverTooltip.tsx frontend/src/components/HoverTooltip.test.tsx
git commit -m "Add presentational roster components: table, detail panel, hover tooltip

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: RosterView (hover/pin interaction)

**Files:**
- Create: `frontend/src/components/RosterView.tsx`
- Test: `frontend/src/components/RosterView.test.tsx`

**Interfaces:**
- Consumes: `StaffTable` (Task 5), `DetailPanel` (Task 5), `HoverTooltip` (Task 5), `StaffMember` from `../types` (Task 4).
- Produces: `<RosterView staff onEdit onDelete />` where `onEdit: (staff: StaffMember) => void`, `onDelete: (id: number) => void`.

- [ ] **Step 1: Write the failing RosterView tests**

Create `frontend/src/components/RosterView.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { RosterView } from "./RosterView";
import type { StaffMember } from "../types";

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
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
  };
}

const staffA = member({ id: 1, name: "Coach A" });
const staffB = member({ id: 2, name: "Coach B" });

function rowFor(name: string) {
  return screen.getByText(name).closest("tr")!;
}

test("hovering a row with nothing pinned previews it in the detail panel", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  fireEvent.mouseOver(rowFor("Coach A"));

  expect(screen.getByText("Preview")).toBeInTheDocument();
  expect(screen.getAllByText("Coach A").length).toBeGreaterThan(1);

  fireEvent.mouseOut(rowFor("Coach A"));
  expect(screen.queryByText("Preview")).not.toBeInTheDocument();
});

test("clicking a row pins it and the detail panel stays after the mouse leaves", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  fireEvent.click(rowFor("Coach A"));
  fireEvent.mouseOut(rowFor("Coach A"));

  expect(screen.getByText("Pinned")).toBeInTheDocument();
});

test("hovering a different row while pinned shows the tooltip without changing the pinned detail", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  fireEvent.click(rowFor("Coach A"));
  fireEvent.mouseOver(rowFor("Coach B"));
  fireEvent.mouseMove(rowFor("Coach B"), { clientX: 50, clientY: 60 });

  const pinnedLabel = screen.getByText("Pinned");
  expect(pinnedLabel.closest("div")?.textContent).toContain("Coach A");

  const tooltipNames = screen.getAllByText("Coach B");
  expect(tooltipNames.length).toBeGreaterThan(1);
});

test("clicking the pinned row again unpins it", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  fireEvent.click(rowFor("Coach A"));
  fireEvent.click(rowFor("Coach A"));

  expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
});

test("clicking a different row while one is pinned moves the pin to the new row", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  fireEvent.click(rowFor("Coach A"));
  fireEvent.click(rowFor("Coach B"));

  const pinnedLabel = screen.getByText("Pinned");
  expect(pinnedLabel.closest("div")?.textContent).toContain("Coach B");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/RosterView.test.tsx`
Expected: FAIL — `Cannot find module './RosterView'`.

- [ ] **Step 3: Implement RosterView**

Create `frontend/src/components/RosterView.tsx`:

```tsx
import { useState } from "react";
import type { StaffMember } from "../types";
import { StaffTable } from "./StaffTable";
import { DetailPanel } from "./DetailPanel";
import { HoverTooltip } from "./HoverTooltip";

interface RosterViewProps {
  staff: StaffMember[];
  onEdit: (staff: StaffMember) => void;
  onDelete: (id: number) => void;
}

export function RosterView({ staff, onEdit, onDelete }: RosterViewProps) {
  const [pinnedId, setPinnedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  function handleRowHover(id: number | null) {
    setHoveredId(id);
    if (id === null) setMousePos(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (pinnedId !== null && hoveredId !== null && hoveredId !== pinnedId) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  }

  function handleRowClick(id: number) {
    setPinnedId(pinnedId === id ? null : id);
  }

  const pinnedStaff = pinnedId !== null ? staff.find((s) => s.id === pinnedId) ?? null : null;
  const hoveredStaff = hoveredId !== null ? staff.find((s) => s.id === hoveredId) ?? null : null;

  const detailStaff = pinnedStaff ?? hoveredStaff;
  const detailMode: "empty" | "preview" | "pinned" = pinnedStaff ? "pinned" : hoveredStaff ? "preview" : "empty";

  const tooltipStaff = pinnedStaff && hoveredStaff && hoveredId !== pinnedId ? hoveredStaff : null;

  return (
    <div style={{ display: "flex", gap: "20px" }} onMouseMove={handleMouseMove}>
      <div style={{ flex: 1 }}>
        <StaffTable staff={staff} pinnedId={pinnedId} onRowHover={handleRowHover} onRowClick={handleRowClick} />
      </div>
      <div style={{ flex: 1 }}>
        <DetailPanel staff={detailStaff} mode={detailMode} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <HoverTooltip staff={tooltipStaff} position={tooltipStaff ? mousePos : null} />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/RosterView.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/RosterView.tsx frontend/src/components/RosterView.test.tsx
git commit -m "Add RosterView composing the hover-preview/click-to-pin interaction

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: StaffForm (add/edit)

**Files:**
- Create: `frontend/src/components/StaffForm.tsx`
- Test: `frontend/src/components/StaffForm.test.tsx`

**Interfaces:**
- Consumes: `StaffInput`, `StaffAttributes`, `ATTRIBUTE_FIELDS`, `ATTRIBUTE_LEVELS` from `../types` (Task 4).
- Produces: `<StaffForm initialValue onSubmit onCancel />` where `initialValue?: StaffInput`, `onSubmit: (input: StaffInput) => void`, `onCancel?: () => void`.

- [ ] **Step 1: Write the failing StaffForm tests**

Create `frontend/src/components/StaffForm.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffForm } from "./StaffForm";
import { ATTRIBUTE_FIELDS } from "../types";

test("renders a name field, a tags field, and all 12 attribute dropdowns", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Tags")).toBeInTheDocument();
  for (const field of ATTRIBUTE_FIELDS) {
    expect(screen.getByLabelText(field.label)).toBeInTheDocument();
  }
});

test("does not call onSubmit when the name is empty", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
});

test("submits the entered name, tags, and attributes", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Carlo Rossi" } });
  fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Shortlist, U18" } });
  fireEvent.change(screen.getByLabelText("Attacking"), { target: { value: "8" } });

  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  const submitted = onSubmit.mock.calls[0][0];
  expect(submitted.name).toBe("Carlo Rossi");
  expect(submitted.tags).toEqual(["Shortlist", "U18"]);
  expect(submitted.attributes.attacking).toBe(8);
});

test("pre-fills fields from initialValue when editing", () => {
  render(
    <StaffForm
      initialValue={{
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
      }}
      onSubmit={vi.fn()}
    />
  );

  expect(screen.getByLabelText("Name")).toHaveValue("Existing Coach");
  expect(screen.getByLabelText("Tags")).toHaveValue("Shortlist");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/StaffForm.test.tsx`
Expected: FAIL — `Cannot find module './StaffForm'`.

- [ ] **Step 3: Implement StaffForm**

Create `frontend/src/components/StaffForm.tsx`:

```tsx
import { useState } from "react";
import { ATTRIBUTE_FIELDS, ATTRIBUTE_LEVELS, type StaffAttributes, type StaffInput } from "../types";

interface StaffFormProps {
  initialValue?: StaffInput;
  onSubmit: (input: StaffInput) => void;
  onCancel?: () => void;
}

function defaultAttributes(): StaffAttributes {
  return {
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
}

export function StaffForm({ initialValue, onSubmit, onCancel }: StaffFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [tagsText, setTagsText] = useState((initialValue?.tags ?? []).join(", "));
  const [attributes, setAttributes] = useState<StaffAttributes>(initialValue?.attributes ?? defaultAttributes());
  const [error, setError] = useState<string | null>(null);

  function handleAttributeChange(key: keyof StaffAttributes, value: string) {
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
    if (name.trim().length === 0) {
      setError("Name is required");
      return;
    }
    setError(null);
    onSubmit({ name: name.trim(), tags: parseTags(tagsText), attributes });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Tags
        <input aria-label="Tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </label>
      {ATTRIBUTE_FIELDS.map((field) => (
        <label key={field.key}>
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
      {error && <div role="alert">{error}</div>}
      <button type="submit">Save</button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/StaffForm.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StaffForm.tsx frontend/src/components/StaffForm.test.tsx
git commit -m "Add StaffForm for adding and editing staff attributes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: App wiring, root dev scripts, and .gitignore

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`
- Create: `package.json` (repo root)
- Create: `.gitignore` (repo root)

**Interfaces:**
- Consumes: `listStaff`, `createStaff`, `updateStaff`, `deleteStaff` from `./api/staffApi` (Task 4); `RosterView` (Task 6); `StaffForm` (Task 7); `StaffMember`, `StaffInput` from `./types` (Task 4).

- [ ] **Step 1: Write the failing App tests**

Create `frontend/src/App.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { App } from "./App";
import * as staffApi from "./api/staffApi";
import type { StaffMember } from "./types";

vi.mock("./api/staffApi");

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
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
  };
}

test("loads and displays staff on mount", async () => {
  vi.mocked(staffApi.listStaff).mockResolvedValue([member({ id: 1, name: "Carlo Rossi" })]);

  render(<App />);

  expect(await screen.findByText("Carlo Rossi")).toBeInTheDocument();
});

test("submitting the add-staff form creates a staff member and refreshes the list", async () => {
  vi.mocked(staffApi.listStaff)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([member({ id: 2, name: "New Coach" })]);
  vi.mocked(staffApi.createStaff).mockResolvedValue(member({ id: 2, name: "New Coach" }));

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Coach" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.createStaff).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("New Coach")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: FAIL — the placeholder `App` has no "Add staff" button or staff list, so `screen.findByText("Carlo Rossi")` times out.

- [ ] **Step 3: Implement the wired App**

Replace the contents of `frontend/src/App.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { RosterView } from "./components/RosterView";
import { StaffForm } from "./components/StaffForm";
import { createStaff, deleteStaff, listStaff, updateStaff } from "./api/staffApi";
import type { StaffInput, StaffMember } from "./types";

export function App() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  const refresh = useCallback(async () => {
    setStaff(await listStaff());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(input: StaffInput) {
    if (editing) {
      await updateStaff(editing.id, input);
    } else {
      await createStaff(input);
    }
    setShowForm(false);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(id: number) {
    await deleteStaff(id);
    await refresh();
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
    <div>
      <button onClick={handleAddClick}>Add staff</button>
      {showForm && (
        <StaffForm
          initialValue={editing ? { name: editing.name, tags: editing.tags, attributes: editing.attributes } : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      <RosterView staff={staff} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full frontend and backend test suites**

Run (from the repository root): `(cd frontend && npm test) && (cd backend && npm test)`
Expected: PASS — every test file in both packages is green. The subshells (`()`) mean the working directory is back at the repository root once this command finishes.

- [ ] **Step 6: Add root dev scripts and .gitignore**

Create root `package.json`:

```json
{
  "name": "fm-suite",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "concurrently -n backend,frontend \"npm --prefix backend run dev\" \"npm --prefix frontend run dev\"",
    "test": "npm --prefix backend test && npm --prefix frontend test"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

Create root `.gitignore`:

```
node_modules/
dist/
backend/data/
*.sqlite
.superpowers/
```

Run (from the repository root): `npm install`
Expected: installs `concurrently` at the repo root without errors.

- [ ] **Step 7: Commit**

Run (from the repository root):

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx package.json package-lock.json .gitignore
git commit -m "Wire App to the staff API and add root dev scripts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

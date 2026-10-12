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

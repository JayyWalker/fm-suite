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

import { expect, test } from "vitest";
import { COACH_CATEGORIES, coachDefaultAttributes, coachFormGroups, coachMentalFields } from "./coach";

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
  expect(coachMentalFields).toEqual(["determination", "authority", "motivating"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = coachFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(coachDefaultAttributes).sort());
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(coachDefaultAttributes).every((value) => value === 4)).toBe(true);
});

import { expect, test } from "vitest";
import { NATION_KNOWLEDGE_LEVELS, SCOUT_CATEGORIES, scoutDefaultAttributes, scoutExtraDisplayGroups, scoutFormGroups, scoutMentalFields } from "./scout";

test("exposes the 2 scout categories, Current Ability Judging first", () => {
  expect(SCOUT_CATEGORIES).toEqual(["Current Ability Judging", "Potential Judging"]);
});

test("mental fields are determination and adaptability", () => {
  expect(scoutMentalFields).toEqual(["determination", "adaptability"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = scoutFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(scoutDefaultAttributes).sort());
});

test("default attributes are all Average (4) and do not include nationKnowledge", () => {
  expect(scoutDefaultAttributes).toEqual({ jpa: 4, jpp: 4, determination: 4, adaptability: 4 });
});

test("there is no generic extra display group for nation knowledge (it's rendered as a Scout-only special case)", () => {
  expect(scoutExtraDisplayGroups).toEqual([]);
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

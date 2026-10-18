import { expect, test } from "vitest";
import {
  PERFORMANCE_ANALYST_CATEGORIES,
  performanceAnalystDefaultAttributes,
  performanceAnalystExtraDisplayGroups,
  performanceAnalystFormGroups,
  performanceAnalystMentalFields,
} from "./performanceAnalyst";

test("exposes the 3 performance analyst categories, Analysing Data first", () => {
  expect(PERFORMANCE_ANALYST_CATEGORIES).toEqual(["Analysing Data", "Judging Player Ability", "Tactical Knowledge"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(performanceAnalystMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = performanceAnalystFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(performanceAnalystDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(performanceAnalystExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(performanceAnalystDefaultAttributes).every((value) => value === 4)).toBe(true);
});

import { expect, test } from "vitest";
import { DATA_ANALYST_CATEGORIES, dataAnalystDefaultAttributes, dataAnalystExtraDisplayGroups, dataAnalystFormGroups, dataAnalystMentalFields } from "./dataAnalyst";

test("exposes the 3 data analyst categories, Judging Player Data first", () => {
  expect(DATA_ANALYST_CATEGORIES).toEqual(["Judging Player Data", "Judging Team Data", "Presenting Data"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(dataAnalystMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = dataAnalystFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(dataAnalystDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(dataAnalystExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(dataAnalystDefaultAttributes).every((value) => value === 4)).toBe(true);
});

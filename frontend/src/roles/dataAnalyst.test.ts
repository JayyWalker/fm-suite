import { expect, test } from "vitest";
import { DATA_ANALYST_CATEGORIES, defaultAttributes, extraDisplayGroups, formGroups, mentalFields } from "./dataAnalyst";

test("exposes the 3 data analyst categories, Judging Player Data first", () => {
  expect(DATA_ANALYST_CATEGORIES).toEqual(["Judging Player Data", "Judging Team Data", "Presenting Data"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(mentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = formGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(defaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(extraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(defaultAttributes).every((value) => value === 4)).toBe(true);
});

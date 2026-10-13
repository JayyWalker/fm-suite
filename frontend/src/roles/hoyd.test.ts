import { expect, test } from "vitest";
import { HOYD_CATEGORIES, defaultAttributes, extraDisplayGroups, formGroups, mentalFields } from "./hoyd";

test("exposes the 3 HoYD categories, Working with Youngsters first", () => {
  expect(HOYD_CATEGORIES).toEqual(["Working with Youngsters", "Current Ability Judging", "Potential Judging"]);
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

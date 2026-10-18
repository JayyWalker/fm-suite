import { expect, test } from "vitest";
import { HOYD_CATEGORIES, hoydDefaultAttributes, hoydExtraDisplayGroups, hoydFormGroups, hoydMentalFields } from "./hoyd";

test("exposes the 3 HoYD categories, Working with Youngsters first", () => {
  expect(HOYD_CATEGORIES).toEqual(["Working with Youngsters", "Current Ability Judging", "Potential Judging"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(hoydMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = hoydFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(hoydDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(hoydExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(hoydDefaultAttributes).every((value) => value === 4)).toBe(true);
});

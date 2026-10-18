import { expect, test } from "vitest";
import { SPORTS_SCIENCE_CATEGORIES, sportsScienceDefaultAttributes, sportsScienceExtraDisplayGroups, sportsScienceFormGroups, sportsScienceMentalFields } from "./sportsScience";

test("exposes the single Fitness category", () => {
  expect(SPORTS_SCIENCE_CATEGORIES).toEqual(["Fitness"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(sportsScienceMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = sportsScienceFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(sportsScienceDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(sportsScienceExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(sportsScienceDefaultAttributes).every((value) => value === 4)).toBe(true);
});

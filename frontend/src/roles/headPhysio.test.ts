import { expect, test } from "vitest";
import { HEAD_PHYSIO_CATEGORIES, headPhysioDefaultAttributes, headPhysioExtraDisplayGroups, headPhysioFormGroups, headPhysioMentalFields } from "./headPhysio";

test("exposes the 2 head physio categories, Physiotherapy first", () => {
  expect(HEAD_PHYSIO_CATEGORIES).toEqual(["Physiotherapy", "Judging Player Condition"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(headPhysioMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = headPhysioFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(headPhysioDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(headPhysioExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(headPhysioDefaultAttributes).every((value) => value === 4)).toBe(true);
});

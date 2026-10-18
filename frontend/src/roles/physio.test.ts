import { expect, test } from "vitest";
import { PHYSIO_CATEGORIES, physioDefaultAttributes, physioExtraDisplayGroups, physioFormGroups, physioMentalFields } from "./physio";

test("exposes the single Physiotherapy category", () => {
  expect(PHYSIO_CATEGORIES).toEqual(["Physiotherapy"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(physioMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = physioFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(physioDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(physioExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(physioDefaultAttributes).every((value) => value === 4)).toBe(true);
});

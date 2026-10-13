import { expect, test } from "vitest";
import {
  TECHNICAL_DIRECTOR_CATEGORIES,
  defaultAttributes,
  extraDisplayGroups,
  formGroups,
  mentalFields,
} from "./technicalDirector";

test("exposes the 2 technical director categories, Negotiating first", () => {
  expect(TECHNICAL_DIRECTOR_CATEGORIES).toEqual(["Negotiating", "Judging Staff Ability"]);
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

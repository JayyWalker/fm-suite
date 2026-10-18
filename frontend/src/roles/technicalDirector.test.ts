import { expect, test } from "vitest";
import {
  TECHNICAL_DIRECTOR_CATEGORIES,
  technicalDirectorDefaultAttributes,
  technicalDirectorExtraDisplayGroups,
  technicalDirectorFormGroups,
  technicalDirectorMentalFields,
} from "./technicalDirector";

test("exposes the 2 technical director categories, Negotiating first", () => {
  expect(TECHNICAL_DIRECTOR_CATEGORIES).toEqual(["Negotiating", "Judging Staff Ability"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(technicalDirectorMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = technicalDirectorFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(technicalDirectorDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(technicalDirectorExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(technicalDirectorDefaultAttributes).every((value) => value === 4)).toBe(true);
});

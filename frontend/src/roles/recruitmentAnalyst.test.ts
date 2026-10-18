import { expect, test } from "vitest";
import {
  RECRUITMENT_ANALYST_CATEGORIES,
  recruitmentAnalystDefaultAttributes,
  recruitmentAnalystExtraDisplayGroups,
  recruitmentAnalystFormGroups,
  recruitmentAnalystMentalFields,
} from "./recruitmentAnalyst";

test("exposes the 2 recruitment analyst categories, Analysing Data first", () => {
  expect(RECRUITMENT_ANALYST_CATEGORIES).toEqual(["Analysing Data", "Judging Player Ability"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(recruitmentAnalystMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = recruitmentAnalystFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(recruitmentAnalystDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(recruitmentAnalystExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(recruitmentAnalystDefaultAttributes).every((value) => value === 4)).toBe(true);
});

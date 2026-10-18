import { expect, test } from "vitest";
import { LOAN_MANAGER_CATEGORIES, loanManagerDefaultAttributes, loanManagerExtraDisplayGroups, loanManagerFormGroups, loanManagerMentalFields } from "./loanManager";

test("exposes the 3 loan manager categories, Analysing Data first", () => {
  expect(LOAN_MANAGER_CATEGORIES).toEqual(["Analysing Data", "Judging Player Ability", "Judging Player Potential"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(loanManagerMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = loanManagerFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(loanManagerDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(loanManagerExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(loanManagerDefaultAttributes).every((value) => value === 4)).toBe(true);
});

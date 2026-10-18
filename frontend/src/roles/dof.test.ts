import { expect, test } from "vitest";
import { DOF_CATEGORIES, dofDefaultAttributes, dofExtraDisplayGroups, dofFormGroups, dofMentalFields } from "./dof";

test("exposes the 3 DoF categories, Negotiating first", () => {
  expect(DOF_CATEGORIES).toEqual(["Negotiating", "Current Ability Judging", "Potential Judging"]);
});

test("mental fields are determination, adaptability, and man management", () => {
  expect(dofMentalFields).toEqual(["determination", "adaptability", "manManagement"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = dofFormGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(dofDefaultAttributes).sort());
});

test("has no extra display groups", () => {
  expect(dofExtraDisplayGroups).toHaveLength(0);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(dofDefaultAttributes).every((value) => value === 4)).toBe(true);
});

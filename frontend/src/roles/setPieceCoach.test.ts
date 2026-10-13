import { expect, test } from "vitest";
import { SET_PIECE_COACH_CATEGORIES, defaultAttributes, extraDisplayGroups, formGroups, mentalFields } from "./setPieceCoach";

test("exposes the single Set Pieces category", () => {
  expect(SET_PIECE_COACH_CATEGORIES).toEqual(["Set Pieces"]);
});

test("mental fields are determination, authority, and motivating", () => {
  expect(mentalFields).toEqual(["determination", "authority", "motivating"]);
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

import { expect, test } from "vitest";
import { SCOUT_CATEGORIES, defaultAttributes, extraDisplayGroups, formGroups, mentalFields } from "./scout";

test("exposes the 2 scout categories, Current Ability Judging first", () => {
  expect(SCOUT_CATEGORIES).toEqual(["Current Ability Judging", "Potential Judging"]);
});

test("mental fields are determination and adaptability", () => {
  expect(mentalFields).toEqual(["determination", "adaptability"]);
});

test("form groups cover every attribute exactly once", () => {
  const allKeys = formGroups.flatMap((group) => group.fields.map((field) => field.key));
  expect(allKeys.sort()).toEqual(Object.keys(defaultAttributes).sort());
});

test("regional knowledge is its own extra display group covering all 19 regions", () => {
  expect(extraDisplayGroups).toHaveLength(1);
  expect(extraDisplayGroups[0].title).toBe("Regional Knowledge");
  expect(extraDisplayGroups[0].fields).toHaveLength(19);
});

test("default attributes are all Average (4)", () => {
  expect(Object.values(defaultAttributes).every((value) => value === 4)).toBe(true);
});

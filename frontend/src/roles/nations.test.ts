import { expect, test } from "vitest";
import { NATIONS } from "./nations";

test("nation list is non-empty and has no duplicates", () => {
  expect(NATIONS.length).toBeGreaterThan(100);
  expect(new Set(NATIONS).size).toBe(NATIONS.length);
});

test("includes the UK home nations instead of a single United Kingdom entry", () => {
  expect(NATIONS).toContain("England");
  expect(NATIONS).toContain("Scotland");
  expect(NATIONS).toContain("Wales");
  expect(NATIONS).toContain("Northern Ireland");
  expect(NATIONS).not.toContain("United Kingdom");
});

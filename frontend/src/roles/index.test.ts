import { expect, test } from "vitest";
import { STAFF_ROLES, ROLES } from "./index";

test("exactly coach and scout are registered as staff roles", () => {
  expect(STAFF_ROLES).toEqual(["coach", "scout"]);
});

test("each role definition exposes its label, categories, and form groups", () => {
  expect(ROLES.coach.label).toBe("Coach");
  expect(ROLES.coach.categories).toContain("Attacking");
  expect(ROLES.scout.label).toBe("Scout");
  expect(ROLES.scout.categories).toContain("Potential Judging");
  expect(ROLES.scout.extraDisplayGroups).toHaveLength(1);
  expect(ROLES.coach.extraDisplayGroups).toHaveLength(0);
});

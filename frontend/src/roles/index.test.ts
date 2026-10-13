import { expect, test } from "vitest";
import { STAFF_ROLES, ROLES } from "./index";

test("exactly coach, scout, physio, and hoyd are registered as staff roles", () => {
  expect(STAFF_ROLES).toEqual(["coach", "scout", "physio", "hoyd"]);
});

test("each role definition exposes its label, categories, and form groups", () => {
  expect(ROLES.coach.label).toBe("Coach");
  expect(ROLES.coach.categories).toContain("Attacking");
  expect(ROLES.scout.label).toBe("Scout");
  expect(ROLES.scout.categories).toContain("Potential Judging");
  expect(ROLES.scout.extraDisplayGroups).toHaveLength(1);
  expect(ROLES.coach.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.physio.label).toBe("Physio");
  expect(ROLES.physio.categories).toEqual(["Physiotherapy"]);
  expect(ROLES.physio.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.hoyd.label).toBe("Head of Youth Development");
  expect(ROLES.hoyd.categories).toEqual(["Working with Youngsters", "Current Ability Judging", "Potential Judging"]);
  expect(ROLES.hoyd.extraDisplayGroups).toHaveLength(0);
});

import { expect, test } from "vitest";
import { ROLES, STAFF_ROLES } from "./index";

test("exactly coach, scout, physio, hoyd, and dof are registered as staff roles", () => {
  expect(STAFF_ROLES).toEqual(["coach", "scout", "physio", "hoyd", "dof"]);
});

test("the coach role definition rates coach attributes", () => {
  const attrs = {
    authority: 8,
    determination: 8,
    motivating: 8,
    attacking: 8,
    defending: 1,
    fitness: 1,
    goalkeeping: 1,
    possession: 1,
    setPieces: 1,
    tactical: 1,
    technical: 1,
    tacticalKnowledge: 1,
  };

  const result = ROLES.coach.rate(attrs);

  // mental average (determination/authority/motivating) = 8, primary (attacking) = 8
  // combinedScore(8, 8) = 8 -> scoreToStars(8) = 5
  expect(result.categories.Attacking).toBe(5);
  expect(ROLES.coach.categories).toContain("Attacking");
});

test("the scout role definition rates scout attributes", () => {
  const attrs = {
    jpa: 8,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
  };

  const result = ROLES.scout.rate(attrs);

  expect(result.categories["Current Ability Judging"]).toBe(4);
  expect(ROLES.scout.categories).toContain("Potential Judging");
});

test("each role exposes its own attributes JSON schema", () => {
  expect(ROLES.coach.attributesSchema).toHaveProperty("required");
  expect(ROLES.scout.attributesSchema).toHaveProperty("required");
  expect(ROLES.physio.attributesSchema).toHaveProperty("required");
  expect(ROLES.hoyd.attributesSchema).toHaveProperty("required");
  expect(ROLES.dof.attributesSchema).toHaveProperty("required");
  expect(ROLES.coach.attributesSchema).not.toBe(ROLES.scout.attributesSchema);
});

test("the physio role definition rates physio attributes", () => {
  const attrs = {
    physiotherapy: 8,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
  };

  const result = ROLES.physio.rate(attrs);

  // mental average (determination/adaptability/manManagement) = 1, primary (physiotherapy) = 8
  // combinedScore(8, 1) = 5.9 -> scoreToStars(5.9) = 4
  expect(result.categories.Physiotherapy).toBe(4);
  expect(ROLES.physio.categories).toEqual(["Physiotherapy"]);
});

test("the hoyd role definition rates hoyd attributes", () => {
  const attrs = {
    workingWithYoungsters: 8,
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
  };

  const result = ROLES.hoyd.rate(attrs);

  // mental average (determination/adaptability/manManagement) = 1, primary (workingWithYoungsters) = 8
  // combinedScore(8, 1) = 5.9 -> scoreToStars(5.9) = 4
  expect(result.categories["Working with Youngsters"]).toBe(4);
  expect(ROLES.hoyd.categories).toEqual(["Working with Youngsters", "Current Ability Judging", "Potential Judging"]);
});

test("the dof role definition rates dof attributes", () => {
  const attrs = {
    negotiating: 8,
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
  };

  const result = ROLES.dof.rate(attrs);

  // mental average (determination/adaptability/manManagement) = 1, primary (negotiating) = 8
  // combinedScore(8, 1) = 5.9 -> scoreToStars(5.9) = 4
  expect(result.categories["Negotiating"]).toBe(4);
  expect(ROLES.dof.categories).toEqual(["Negotiating", "Current Ability Judging", "Potential Judging"]);
});

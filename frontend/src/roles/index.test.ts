import { expect, test } from "vitest";
import { STAFF_ROLES, ROLES } from "./index";

test("exactly all 15 expected staff roles are registered", () => {
  expect(STAFF_ROLES).toEqual([
    "coach",
    "scout",
    "physio",
    "hoyd",
    "dof",
    "dataAnalyst",
    "sportsScientist",
    "headOfSportsScience",
    "headPhysio",
    "setPieceCoach",
    "performanceAnalyst",
    "headPerformanceAnalyst",
    "recruitmentAnalyst",
    "technicalDirector",
    "loanManager",
  ]);
});

test("each role definition exposes its label, categories, and form groups", () => {
  expect(ROLES.coach.label).toBe("Coach");
  expect(ROLES.coach.categories).toContain("Attacking");
  expect(ROLES.scout.label).toBe("Scout");
  expect(ROLES.scout.categories).toContain("Potential Judging");
  expect(ROLES.scout.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.coach.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.physio.label).toBe("Physio");
  expect(ROLES.physio.categories).toEqual(["Physiotherapy"]);
  expect(ROLES.physio.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.hoyd.label).toBe("Head of Youth Development");
  expect(ROLES.hoyd.categories).toEqual(["Working with Youngsters", "Current Ability Judging", "Potential Judging"]);
  expect(ROLES.hoyd.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.dof.label).toBe("Director of Football");
  expect(ROLES.dof.categories).toEqual(["Negotiating", "Current Ability Judging", "Potential Judging"]);
  expect(ROLES.dof.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.dataAnalyst.label).toBe("Data Analyst");
  expect(ROLES.dataAnalyst.categories).toEqual(["Judging Player Data", "Judging Team Data", "Presenting Data"]);
  expect(ROLES.dataAnalyst.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.sportsScientist.label).toBe("Sports Scientist");
  expect(ROLES.sportsScientist.categories).toEqual(["Fitness"]);
  expect(ROLES.headOfSportsScience.label).toBe("Head of Sports Science");
  expect(ROLES.headOfSportsScience.categories).toEqual(["Fitness"]);
  expect(ROLES.sportsScientist.formGroups).toBe(ROLES.headOfSportsScience.formGroups);
  expect(ROLES.headPhysio.label).toBe("Head Physio");
  expect(ROLES.headPhysio.categories).toEqual(["Physiotherapy", "Judging Player Condition"]);
  expect(ROLES.headPhysio.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.setPieceCoach.label).toBe("Set Piece Coach");
  expect(ROLES.setPieceCoach.categories).toEqual(["Set Pieces"]);
  expect(ROLES.setPieceCoach.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.performanceAnalyst.label).toBe("Performance Analyst");
  expect(ROLES.performanceAnalyst.categories).toEqual([
    "Analysing Data",
    "Judging Player Ability",
    "Tactical Knowledge",
  ]);
  expect(ROLES.headPerformanceAnalyst.label).toBe("Head Performance Analyst");
  expect(ROLES.headPerformanceAnalyst.categories).toEqual([
    "Analysing Data",
    "Judging Player Ability",
    "Tactical Knowledge",
  ]);
  expect(ROLES.performanceAnalyst.formGroups).toBe(ROLES.headPerformanceAnalyst.formGroups);
  expect(ROLES.recruitmentAnalyst.label).toBe("Recruitment Analyst");
  expect(ROLES.recruitmentAnalyst.categories).toEqual(["Analysing Data", "Judging Player Ability"]);
  expect(ROLES.recruitmentAnalyst.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.technicalDirector.label).toBe("Technical Director");
  expect(ROLES.technicalDirector.categories).toEqual(["Negotiating", "Judging Staff Ability"]);
  expect(ROLES.technicalDirector.extraDisplayGroups).toHaveLength(0);
  expect(ROLES.loanManager.label).toBe("Loan Manager");
  expect(ROLES.loanManager.categories).toEqual([
    "Analysing Data",
    "Judging Player Ability",
    "Judging Player Potential",
  ]);
  expect(ROLES.loanManager.extraDisplayGroups).toHaveLength(0);
});

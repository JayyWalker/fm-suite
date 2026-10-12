import { describe, expect, test } from "vitest";
import { rateStaff, type StaffAttributes } from "./scoring";

function attrs(overrides: Partial<StaffAttributes> = {}): StaffAttributes {
  return {
    authority: 1,
    determination: 1,
    motivating: 1,
    attacking: 1,
    defending: 1,
    fitness: 1,
    goalkeeping: 1,
    possession: 1,
    setPieces: 1,
    tactical: 1,
    technical: 1,
    tacticalKnowledge: 1,
    ...overrides,
  };
}

describe("rateStaff", () => {
  test("a coach who is Elite everywhere scores 5 stars in every category", () => {
    const allElite = attrs({
      authority: 8,
      determination: 8,
      motivating: 8,
      attacking: 8,
      defending: 8,
      fitness: 8,
      goalkeeping: 8,
      possession: 8,
      setPieces: 8,
      tactical: 8,
      technical: 8,
      tacticalKnowledge: 8,
    });

    const result = rateStaff(allElite);

    expect(result.categories.Attacking).toBe(5);
    expect(result.categories.Defending).toBe(5);
    expect(result.categories.Fitness).toBe(5);
    expect(result.categories.Goalkeeping).toBe(5);
    expect(result.categories.Possession).toBe(5);
    expect(result.categories["Set Pieces"]).toBe(5);
    expect(result.categories.Tactical).toBe(5);
  });

  test("a coach who is Unsuited everywhere scores 1 star in every category", () => {
    const result = rateStaff(attrs());

    expect(result.categories.Attacking).toBe(1);
    expect(result.categories.Tactical).toBe(1);
  });

  test("the matching attribute drives a category's score more than the holy trinity", () => {
    const eliteAttacker = attrs({ attacking: 8 });

    const result = rateStaff(eliteAttacker);

    expect(result.categories.Attacking).toBe(4);
    expect(result.categories.Defending).toBe(1);
    expect(result.bestFit).toBe("Attacking");
  });

  test("Tactical combines tactical, technical, and tactical knowledge", () => {
    const tacticalCoach = attrs({ tactical: 8, technical: 8, tacticalKnowledge: 8 });

    const result = rateStaff(tacticalCoach);

    expect(result.categories.Tactical).toBe(4);
  });

  test("ties for best fit are broken by category order, Attacking first", () => {
    const tied = attrs({ attacking: 6, defending: 6 });

    const result = rateStaff(tied);

    expect(result.bestFit).toBe("Attacking");
  });
});

import { combinedScore, scoreToStars } from "./scoring";

describe("combinedScore", () => {
  test("weights the primary attribute more heavily than the mental average", () => {
    expect(combinedScore(8, 1)).toBeCloseTo(5.9);
    expect(combinedScore(1, 8)).toBeCloseTo(3.1);
  });

  test("an equal primary and mental average returns that same value", () => {
    expect(combinedScore(5, 5)).toBeCloseTo(5);
  });
});

describe("scoreToStars", () => {
  test("maps the lowest possible score to 1 star", () => {
    expect(scoreToStars(1)).toBe(1);
  });

  test("maps the highest possible score to 5 stars", () => {
    expect(scoreToStars(8)).toBe(5);
  });

  test("rounds and clamps mid-range scores", () => {
    expect(scoreToStars(5.9)).toBe(4);
    expect(scoreToStars(3.1)).toBe(2);
  });
});

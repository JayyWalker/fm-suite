import { describe, expect, test } from "vitest";
import { rateCoach, type CoachAttributes } from "./coach";

function attrs(overrides: Partial<CoachAttributes> = {}): CoachAttributes {
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

describe("rateCoach", () => {
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

    const result = rateCoach(allElite);

    expect(result.categories.Attacking).toBe(5);
    expect(result.categories.Tactical).toBe(5);
  });

  test("a coach who is Unsuited everywhere scores 1 star in every category", () => {
    const result = rateCoach(attrs());

    expect(result.categories.Attacking).toBe(1);
    expect(result.categories.Tactical).toBe(1);
  });

  test("the matching attribute drives a category's score more than the mental average", () => {
    const eliteAttacker = attrs({ attacking: 8 });

    const result = rateCoach(eliteAttacker);

    expect(result.categories.Attacking).toBe(4);
    expect(result.categories.Defending).toBe(1);
    expect(result.bestFit).toBe("Attacking");
  });

  test("Tactical combines tactical, technical, and tactical knowledge", () => {
    const tacticalCoach = attrs({ tactical: 8, technical: 8, tacticalKnowledge: 8 });

    const result = rateCoach(tacticalCoach);

    expect(result.categories.Tactical).toBe(4);
  });

  test("ties for best fit are broken by category order, Attacking first", () => {
    const tied = attrs({ attacking: 6, defending: 6 });

    const result = rateCoach(tied);

    expect(result.bestFit).toBe("Attacking");
  });
});

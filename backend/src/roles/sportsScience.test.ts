import { describe, expect, test } from "vitest";
import { rateSportsScience, type SportsScienceAttributes } from "./sportsScience";

function attrs(overrides: Partial<SportsScienceAttributes> = {}): SportsScienceAttributes {
  return {
    fitness: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateSportsScience", () => {
  test("Elite in every scored attribute scores 5 stars", () => {
    const result = rateSportsScience(attrs({ fitness: 8, determination: 8, adaptability: 8, manManagement: 8 }));

    expect(result.categories["Fitness"]).toBe(5);
  });

  test("Unsuited in every scored attribute scores 1 star", () => {
    const result = rateSportsScience(attrs());

    expect(result.categories["Fitness"]).toBe(1);
  });

  test("fitness drives the score more than the mental average", () => {
    const result = rateSportsScience(attrs({ fitness: 8 }));

    // mental average (determination/adaptability/manManagement) = 1, primary (fitness) = 8
    // combinedScore(8, 1) = 5.9 -> scoreToStars(5.9) = 4
    expect(result.categories["Fitness"]).toBe(4);
  });

  test("Fitness is always the best fit, with only one category", () => {
    const result = rateSportsScience(attrs());

    expect(result.bestFit).toBe("Fitness");
  });
});

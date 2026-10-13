import { describe, expect, test } from "vitest";
import { ratePhysio, type PhysioAttributes } from "./physio";

function attrs(overrides: Partial<PhysioAttributes> = {}): PhysioAttributes {
  return {
    physiotherapy: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("ratePhysio", () => {
  test("a physio who is Elite in every scored attribute scores 5 stars", () => {
    const result = ratePhysio(attrs({ physiotherapy: 8, determination: 8, adaptability: 8, manManagement: 8 }));

    expect(result.categories["Physiotherapy"]).toBe(5);
  });

  test("a physio who is Unsuited in every scored attribute scores 1 star", () => {
    const result = ratePhysio(attrs());

    expect(result.categories["Physiotherapy"]).toBe(1);
  });

  test("physiotherapy drives the score more than the mental average", () => {
    const result = ratePhysio(attrs({ physiotherapy: 8 }));

    // mental average (determination/adaptability/manManagement) = 1, primary (physiotherapy) = 8
    // combinedScore(8, 1) = 0.7*8 + 0.3*1 = 5.9 -> scoreToStars(5.9) = 4
    expect(result.categories["Physiotherapy"]).toBe(4);
  });

  test("Physiotherapy is always the best fit, with only one category", () => {
    const result = ratePhysio(attrs());

    expect(result.bestFit).toBe("Physiotherapy");
  });
});

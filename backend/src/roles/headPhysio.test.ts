import { describe, expect, test } from "vitest";
import { rateHeadPhysio, type HeadPhysioAttributes } from "./headPhysio";

function attrs(overrides: Partial<HeadPhysioAttributes> = {}): HeadPhysioAttributes {
  return {
    physiotherapy: 1,
    judgingPlayerCondition: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateHeadPhysio", () => {
  test("Elite in every scored attribute scores 5 stars in both categories", () => {
    const result = rateHeadPhysio(
      attrs({ physiotherapy: 8, judgingPlayerCondition: 8, determination: 8, adaptability: 8, manManagement: 8 }),
    );

    expect(result.categories["Physiotherapy"]).toBe(5);
    expect(result.categories["Judging Player Condition"]).toBe(5);
  });

  test("Unsuited in every scored attribute scores 1 star in both categories", () => {
    const result = rateHeadPhysio(attrs());

    expect(result.categories["Physiotherapy"]).toBe(1);
    expect(result.categories["Judging Player Condition"]).toBe(1);
  });

  test("Physiotherapy drives its own category independently of Judging Player Condition", () => {
    const result = rateHeadPhysio(attrs({ physiotherapy: 8 }));

    expect(result.categories["Physiotherapy"]).toBe(4);
    expect(result.categories["Judging Player Condition"]).toBe(1);
    expect(result.bestFit).toBe("Physiotherapy");
  });

  test("Judging Player Condition drives its own category independently of Physiotherapy", () => {
    const result = rateHeadPhysio(attrs({ judgingPlayerCondition: 8 }));

    expect(result.categories["Judging Player Condition"]).toBe(4);
    expect(result.categories["Physiotherapy"]).toBe(1);
    expect(result.bestFit).toBe("Judging Player Condition");
  });

  test("ties for best fit are broken toward Physiotherapy", () => {
    const result = rateHeadPhysio(attrs({ physiotherapy: 6, judgingPlayerCondition: 6 }));

    expect(result.bestFit).toBe("Physiotherapy");
  });
});

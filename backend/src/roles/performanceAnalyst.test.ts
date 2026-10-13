import { describe, expect, test } from "vitest";
import { ratePerformanceAnalyst, type PerformanceAnalystAttributes } from "./performanceAnalyst";

function attrs(overrides: Partial<PerformanceAnalystAttributes> = {}): PerformanceAnalystAttributes {
  return {
    analysingData: 1,
    jpa: 1,
    tacticalKnowledge: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("ratePerformanceAnalyst", () => {
  test("Elite in every scored attribute scores 5 stars in all three categories", () => {
    const result = ratePerformanceAnalyst(
      attrs({
        analysingData: 8,
        jpa: 8,
        tacticalKnowledge: 8,
        determination: 8,
        adaptability: 8,
        manManagement: 8,
      }),
    );

    expect(result.categories["Analysing Data"]).toBe(5);
    expect(result.categories["Judging Player Ability"]).toBe(5);
    expect(result.categories["Tactical Knowledge"]).toBe(5);
  });

  test("Unsuited in every scored attribute scores 1 star in all three categories", () => {
    const result = ratePerformanceAnalyst(attrs());

    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.categories["Judging Player Ability"]).toBe(1);
    expect(result.categories["Tactical Knowledge"]).toBe(1);
  });

  test("Analysing Data drives its own category independently of the other two", () => {
    const result = ratePerformanceAnalyst(attrs({ analysingData: 8 }));

    expect(result.categories["Analysing Data"]).toBe(4);
    expect(result.categories["Judging Player Ability"]).toBe(1);
    expect(result.categories["Tactical Knowledge"]).toBe(1);
    expect(result.bestFit).toBe("Analysing Data");
  });

  test("Judging Player Ability drives its own category independently of the other two", () => {
    const result = ratePerformanceAnalyst(attrs({ jpa: 8 }));

    expect(result.categories["Judging Player Ability"]).toBe(4);
    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.categories["Tactical Knowledge"]).toBe(1);
    expect(result.bestFit).toBe("Judging Player Ability");
  });

  test("Tactical Knowledge drives its own category independently of the other two", () => {
    const result = ratePerformanceAnalyst(attrs({ tacticalKnowledge: 8 }));

    expect(result.categories["Tactical Knowledge"]).toBe(4);
    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.categories["Judging Player Ability"]).toBe(1);
    expect(result.bestFit).toBe("Tactical Knowledge");
  });

  test("ties for best fit are broken toward Analysing Data, then Judging Player Ability", () => {
    const allTied = ratePerformanceAnalyst(attrs({ analysingData: 6, jpa: 6, tacticalKnowledge: 6 }));
    expect(allTied.bestFit).toBe("Analysing Data");

    const jpaTacticalTied = ratePerformanceAnalyst(attrs({ jpa: 6, tacticalKnowledge: 6 }));
    expect(jpaTacticalTied.bestFit).toBe("Judging Player Ability");
  });
});

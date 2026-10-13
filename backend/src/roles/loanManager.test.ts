import { describe, expect, test } from "vitest";
import { rateLoanManager, type LoanManagerAttributes } from "./loanManager";

function attrs(overrides: Partial<LoanManagerAttributes> = {}): LoanManagerAttributes {
  return {
    analysingData: 1,
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateLoanManager", () => {
  test("Elite in every scored attribute scores 5 stars in all three categories", () => {
    const result = rateLoanManager(
      attrs({ analysingData: 8, jpa: 8, jpp: 8, determination: 8, adaptability: 8, manManagement: 8 }),
    );

    expect(result.categories["Analysing Data"]).toBe(5);
    expect(result.categories["Judging Player Ability"]).toBe(5);
    expect(result.categories["Judging Player Potential"]).toBe(5);
  });

  test("Unsuited in every scored attribute scores 1 star in all three categories", () => {
    const result = rateLoanManager(attrs());

    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.categories["Judging Player Ability"]).toBe(1);
    expect(result.categories["Judging Player Potential"]).toBe(1);
  });

  test("Analysing Data drives its own category independently of the other two", () => {
    const result = rateLoanManager(attrs({ analysingData: 8 }));

    expect(result.categories["Analysing Data"]).toBe(4);
    expect(result.categories["Judging Player Ability"]).toBe(1);
    expect(result.categories["Judging Player Potential"]).toBe(1);
    expect(result.bestFit).toBe("Analysing Data");
  });

  test("Judging Player Ability drives its own category independently of the other two", () => {
    const result = rateLoanManager(attrs({ jpa: 8 }));

    expect(result.categories["Judging Player Ability"]).toBe(4);
    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.categories["Judging Player Potential"]).toBe(1);
    expect(result.bestFit).toBe("Judging Player Ability");
  });

  test("Judging Player Potential drives its own category independently of the other two", () => {
    const result = rateLoanManager(attrs({ jpp: 8 }));

    expect(result.categories["Judging Player Potential"]).toBe(4);
    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.categories["Judging Player Ability"]).toBe(1);
    expect(result.bestFit).toBe("Judging Player Potential");
  });

  test("ties for best fit are broken toward Analysing Data, then Judging Player Ability", () => {
    const allTied = rateLoanManager(attrs({ analysingData: 6, jpa: 6, jpp: 6 }));
    expect(allTied.bestFit).toBe("Analysing Data");

    const jpaJppTied = rateLoanManager(attrs({ jpa: 6, jpp: 6 }));
    expect(jpaJppTied.bestFit).toBe("Judging Player Ability");
  });
});

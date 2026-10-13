import { describe, expect, test } from "vitest";
import { rateRecruitmentAnalyst, type RecruitmentAnalystAttributes } from "./recruitmentAnalyst";

function attrs(overrides: Partial<RecruitmentAnalystAttributes> = {}): RecruitmentAnalystAttributes {
  return {
    analysingData: 1,
    jpa: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateRecruitmentAnalyst", () => {
  test("Elite in every scored attribute scores 5 stars in both categories", () => {
    const result = rateRecruitmentAnalyst(
      attrs({ analysingData: 8, jpa: 8, determination: 8, adaptability: 8, manManagement: 8 }),
    );

    expect(result.categories["Analysing Data"]).toBe(5);
    expect(result.categories["Judging Player Ability"]).toBe(5);
  });

  test("Unsuited in every scored attribute scores 1 star in both categories", () => {
    const result = rateRecruitmentAnalyst(attrs());

    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.categories["Judging Player Ability"]).toBe(1);
  });

  test("Analysing Data drives its own category independently of Judging Player Ability", () => {
    const result = rateRecruitmentAnalyst(attrs({ analysingData: 8 }));

    expect(result.categories["Analysing Data"]).toBe(4);
    expect(result.categories["Judging Player Ability"]).toBe(1);
    expect(result.bestFit).toBe("Analysing Data");
  });

  test("Judging Player Ability drives its own category independently of Analysing Data", () => {
    const result = rateRecruitmentAnalyst(attrs({ jpa: 8 }));

    expect(result.categories["Judging Player Ability"]).toBe(4);
    expect(result.categories["Analysing Data"]).toBe(1);
    expect(result.bestFit).toBe("Judging Player Ability");
  });

  test("ties for best fit are broken toward Analysing Data", () => {
    const result = rateRecruitmentAnalyst(attrs({ analysingData: 6, jpa: 6 }));

    expect(result.bestFit).toBe("Analysing Data");
  });
});

import { describe, expect, test } from "vitest";
import { rateTechnicalDirector, type TechnicalDirectorAttributes } from "./technicalDirector";

function attrs(overrides: Partial<TechnicalDirectorAttributes> = {}): TechnicalDirectorAttributes {
  return {
    negotiating: 1,
    judgingStaffAbility: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateTechnicalDirector", () => {
  test("Elite in every scored attribute scores 5 stars in both categories", () => {
    const result = rateTechnicalDirector(
      attrs({ negotiating: 8, judgingStaffAbility: 8, determination: 8, adaptability: 8, manManagement: 8 }),
    );

    expect(result.categories["Negotiating"]).toBe(5);
    expect(result.categories["Judging Staff Ability"]).toBe(5);
  });

  test("Unsuited in every scored attribute scores 1 star in both categories", () => {
    const result = rateTechnicalDirector(attrs());

    expect(result.categories["Negotiating"]).toBe(1);
    expect(result.categories["Judging Staff Ability"]).toBe(1);
  });

  test("Negotiating drives its own category independently of Judging Staff Ability", () => {
    const result = rateTechnicalDirector(attrs({ negotiating: 8 }));

    expect(result.categories["Negotiating"]).toBe(4);
    expect(result.categories["Judging Staff Ability"]).toBe(1);
    expect(result.bestFit).toBe("Negotiating");
  });

  test("Judging Staff Ability drives its own category independently of Negotiating", () => {
    const result = rateTechnicalDirector(attrs({ judgingStaffAbility: 8 }));

    expect(result.categories["Judging Staff Ability"]).toBe(4);
    expect(result.categories["Negotiating"]).toBe(1);
    expect(result.bestFit).toBe("Judging Staff Ability");
  });

  test("ties for best fit are broken toward Negotiating", () => {
    const result = rateTechnicalDirector(attrs({ negotiating: 6, judgingStaffAbility: 6 }));

    expect(result.bestFit).toBe("Negotiating");
  });
});

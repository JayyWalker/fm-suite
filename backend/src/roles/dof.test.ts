import { describe, expect, test } from "vitest";
import { rateDof, type DofAttributes } from "./dof";

function attrs(overrides: Partial<DofAttributes> = {}): DofAttributes {
  return {
    negotiating: 1,
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateDof", () => {
  test("a DoF who is Elite in every scored attribute scores 5 stars in all three categories", () => {
    const result = rateDof(
      attrs({ negotiating: 8, jpa: 8, jpp: 8, determination: 8, adaptability: 8, manManagement: 8 }),
    );

    expect(result.categories["Negotiating"]).toBe(5);
    expect(result.categories["Current Ability Judging"]).toBe(5);
    expect(result.categories["Potential Judging"]).toBe(5);
  });

  test("a DoF who is Unsuited in every scored attribute scores 1 star in all three categories", () => {
    const result = rateDof(attrs());

    expect(result.categories["Negotiating"]).toBe(1);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
  });

  test("Negotiating drives its own category independently of JPA/JPP", () => {
    const result = rateDof(attrs({ negotiating: 8 }));

    expect(result.categories["Negotiating"]).toBe(4);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
    expect(result.bestFit).toBe("Negotiating");
  });

  test("JPA drives Current Ability Judging independently of JPP and Negotiating", () => {
    const result = rateDof(attrs({ jpa: 8 }));

    expect(result.categories["Current Ability Judging"]).toBe(4);
    expect(result.categories["Negotiating"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
    expect(result.bestFit).toBe("Current Ability Judging");
  });

  test("JPP drives Potential Judging independently of JPA and Negotiating", () => {
    const result = rateDof(attrs({ jpp: 8 }));

    expect(result.categories["Potential Judging"]).toBe(4);
    expect(result.categories["Negotiating"]).toBe(1);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.bestFit).toBe("Potential Judging");
  });

  test("ties for best fit are broken toward Negotiating, then Current Ability Judging", () => {
    const allTied = rateDof(attrs({ negotiating: 6, jpa: 6, jpp: 6 }));
    expect(allTied.bestFit).toBe("Negotiating");

    const jpaJppTied = rateDof(attrs({ jpa: 6, jpp: 6 }));
    expect(jpaJppTied.bestFit).toBe("Current Ability Judging");
  });
});

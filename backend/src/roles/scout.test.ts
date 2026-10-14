import { describe, expect, test } from "vitest";
import { rateScout, type ScoutAttributes } from "./scout";

function attrs(overrides: Partial<ScoutAttributes> = {}): ScoutAttributes {
  return {
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    nationKnowledge: [],
    ...overrides,
  };
}

describe("rateScout", () => {
  test("a scout who is Elite in every scored attribute scores 5 stars in both categories", () => {
    const result = rateScout(attrs({ jpa: 8, jpp: 8, determination: 8, adaptability: 8 }));

    expect(result.categories["Current Ability Judging"]).toBe(5);
    expect(result.categories["Potential Judging"]).toBe(5);
  });

  test("a scout who is Unsuited in every scored attribute scores 1 star in both categories", () => {
    const result = rateScout(attrs());

    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
  });

  test("JPA drives Current Ability Judging more than the mental average, independently of JPP", () => {
    const result = rateScout(attrs({ jpa: 8 }));

    expect(result.categories["Current Ability Judging"]).toBe(4);
    expect(result.categories["Potential Judging"]).toBe(1);
    expect(result.bestFit).toBe("Current Ability Judging");
  });

  test("JPP drives Potential Judging independently of JPA", () => {
    const result = rateScout(attrs({ jpp: 8 }));

    expect(result.categories["Potential Judging"]).toBe(4);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.bestFit).toBe("Potential Judging");
  });

  test("ties for best fit are broken toward Current Ability Judging", () => {
    const result = rateScout(attrs({ jpa: 6, jpp: 6 }));

    expect(result.bestFit).toBe("Current Ability Judging");
  });

  test("nation knowledge does not affect either category's score", () => {
    const withKnowledge = rateScout(attrs({ nationKnowledge: [{ nation: "England", tier: 7 }] }));
    const withoutKnowledge = rateScout(attrs({ nationKnowledge: [] }));

    expect(withKnowledge.categories["Current Ability Judging"]).toBe(withoutKnowledge.categories["Current Ability Judging"]);
    expect(withKnowledge.categories["Potential Judging"]).toBe(withoutKnowledge.categories["Potential Judging"]);
  });
});

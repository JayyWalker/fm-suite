import { describe, expect, test } from "vitest";
import { rateHoyd, type HoydAttributes } from "./hoyd";

function attrs(overrides: Partial<HoydAttributes> = {}): HoydAttributes {
  return {
    workingWithYoungsters: 1,
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateHoyd", () => {
  test("a HoYD who is Elite in every scored attribute scores 5 stars in all three categories", () => {
    const result = rateHoyd(
      attrs({ workingWithYoungsters: 8, jpa: 8, jpp: 8, determination: 8, adaptability: 8, manManagement: 8 }),
    );

    expect(result.categories["Working with Youngsters"]).toBe(5);
    expect(result.categories["Current Ability Judging"]).toBe(5);
    expect(result.categories["Potential Judging"]).toBe(5);
  });

  test("a HoYD who is Unsuited in every scored attribute scores 1 star in all three categories", () => {
    const result = rateHoyd(attrs());

    expect(result.categories["Working with Youngsters"]).toBe(1);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
  });

  test("Working with Youngsters drives its own category independently of JPA/JPP", () => {
    const result = rateHoyd(attrs({ workingWithYoungsters: 8 }));

    expect(result.categories["Working with Youngsters"]).toBe(4);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
    expect(result.bestFit).toBe("Working with Youngsters");
  });

  test("JPA drives Current Ability Judging independently of JPP and Working with Youngsters", () => {
    const result = rateHoyd(attrs({ jpa: 8 }));

    expect(result.categories["Current Ability Judging"]).toBe(4);
    expect(result.categories["Working with Youngsters"]).toBe(1);
    expect(result.categories["Potential Judging"]).toBe(1);
    expect(result.bestFit).toBe("Current Ability Judging");
  });

  test("JPP drives Potential Judging independently of JPA and Working with Youngsters", () => {
    const result = rateHoyd(attrs({ jpp: 8 }));

    expect(result.categories["Potential Judging"]).toBe(4);
    expect(result.categories["Working with Youngsters"]).toBe(1);
    expect(result.categories["Current Ability Judging"]).toBe(1);
    expect(result.bestFit).toBe("Potential Judging");
  });

  test("ties for best fit are broken toward Working with Youngsters, then Current Ability Judging", () => {
    const allTied = rateHoyd(attrs({ workingWithYoungsters: 6, jpa: 6, jpp: 6 }));
    expect(allTied.bestFit).toBe("Working with Youngsters");

    const jpaJppTied = rateHoyd(attrs({ jpa: 6, jpp: 6 }));
    expect(jpaJppTied.bestFit).toBe("Current Ability Judging");
  });
});

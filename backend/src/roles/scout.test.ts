import { describe, expect, test } from "vitest";
import { rateScout, type ScoutAttributes } from "./scout";

function attrs(overrides: Partial<ScoutAttributes> = {}): ScoutAttributes {
  return {
    jpa: 1,
    jpp: 1,
    determination: 1,
    adaptability: 1,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
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

  test("regional knowledge does not affect either category's score", () => {
    const highRegion = rateScout(attrs({ westernEurope: 8, oceania: 8 }));
    const lowRegion = rateScout(attrs());

    expect(highRegion.categories["Current Ability Judging"]).toBe(lowRegion.categories["Current Ability Judging"]);
    expect(highRegion.categories["Potential Judging"]).toBe(lowRegion.categories["Potential Judging"]);
  });
});

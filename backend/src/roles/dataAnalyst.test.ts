import { describe, expect, test } from "vitest";
import { rateDataAnalyst, type DataAnalystAttributes } from "./dataAnalyst";

function attrs(overrides: Partial<DataAnalystAttributes> = {}): DataAnalystAttributes {
  return {
    judgingPlayerData: 1,
    judgingTeamData: 1,
    presentingData: 1,
    determination: 1,
    adaptability: 1,
    manManagement: 1,
    ...overrides,
  };
}

describe("rateDataAnalyst", () => {
  test("a data analyst who is Elite in every scored attribute scores 5 stars in all three categories", () => {
    const result = rateDataAnalyst(
      attrs({
        judgingPlayerData: 8,
        judgingTeamData: 8,
        presentingData: 8,
        determination: 8,
        adaptability: 8,
        manManagement: 8,
      }),
    );

    expect(result.categories["Judging Player Data"]).toBe(5);
    expect(result.categories["Judging Team Data"]).toBe(5);
    expect(result.categories["Presenting Data"]).toBe(5);
  });

  test("a data analyst who is Unsuited in every scored attribute scores 1 star in all three categories", () => {
    const result = rateDataAnalyst(attrs());

    expect(result.categories["Judging Player Data"]).toBe(1);
    expect(result.categories["Judging Team Data"]).toBe(1);
    expect(result.categories["Presenting Data"]).toBe(1);
  });

  test("Judging Player Data drives its own category independently of the other two", () => {
    const result = rateDataAnalyst(attrs({ judgingPlayerData: 8 }));

    expect(result.categories["Judging Player Data"]).toBe(4);
    expect(result.categories["Judging Team Data"]).toBe(1);
    expect(result.categories["Presenting Data"]).toBe(1);
    expect(result.bestFit).toBe("Judging Player Data");
  });

  test("Judging Team Data drives its own category independently of the other two", () => {
    const result = rateDataAnalyst(attrs({ judgingTeamData: 8 }));

    expect(result.categories["Judging Team Data"]).toBe(4);
    expect(result.categories["Judging Player Data"]).toBe(1);
    expect(result.categories["Presenting Data"]).toBe(1);
    expect(result.bestFit).toBe("Judging Team Data");
  });

  test("Presenting Data drives its own category independently of the other two", () => {
    const result = rateDataAnalyst(attrs({ presentingData: 8 }));

    expect(result.categories["Presenting Data"]).toBe(4);
    expect(result.categories["Judging Player Data"]).toBe(1);
    expect(result.categories["Judging Team Data"]).toBe(1);
    expect(result.bestFit).toBe("Presenting Data");
  });

  test("ties for best fit are broken toward Judging Player Data, then Judging Team Data", () => {
    const allTied = rateDataAnalyst(attrs({ judgingPlayerData: 6, judgingTeamData: 6, presentingData: 6 }));
    expect(allTied.bestFit).toBe("Judging Player Data");

    const teamPresentingTied = rateDataAnalyst(attrs({ judgingTeamData: 6, presentingData: 6 }));
    expect(teamPresentingTied.bestFit).toBe("Judging Team Data");
  });
});

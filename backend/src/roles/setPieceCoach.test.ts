import { describe, expect, test } from "vitest";
import { rateSetPieceCoach, type SetPieceCoachAttributes } from "./setPieceCoach";

function attrs(overrides: Partial<SetPieceCoachAttributes> = {}): SetPieceCoachAttributes {
  return {
    setPieces: 1,
    determination: 1,
    authority: 1,
    motivating: 1,
    ...overrides,
  };
}

describe("rateSetPieceCoach", () => {
  test("Elite in every scored attribute scores 5 stars", () => {
    const result = rateSetPieceCoach(attrs({ setPieces: 8, determination: 8, authority: 8, motivating: 8 }));

    expect(result.categories["Set Pieces"]).toBe(5);
  });

  test("Unsuited in every scored attribute scores 1 star", () => {
    const result = rateSetPieceCoach(attrs());

    expect(result.categories["Set Pieces"]).toBe(1);
  });

  test("setPieces drives the score more than the mental average", () => {
    const result = rateSetPieceCoach(attrs({ setPieces: 8 }));

    // mental average (determination/authority/motivating) = 1, primary (setPieces) = 8
    // combinedScore(8, 1) = 5.9 -> scoreToStars(5.9) = 4
    expect(result.categories["Set Pieces"]).toBe(4);
  });

  test("Set Pieces is always the best fit, with only one category", () => {
    const result = rateSetPieceCoach(attrs());

    expect(result.bestFit).toBe("Set Pieces");
  });
});

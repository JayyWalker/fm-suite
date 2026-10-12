import { describe, expect, test } from "vitest";
import { combinedScore, scoreToStars } from "./scoring";

describe("combinedScore", () => {
  test("weights the primary attribute more heavily than the mental average", () => {
    expect(combinedScore(8, 1)).toBeCloseTo(5.9);
    expect(combinedScore(1, 8)).toBeCloseTo(3.1);
  });

  test("an equal primary and mental average returns that same value", () => {
    expect(combinedScore(5, 5)).toBeCloseTo(5);
  });
});

describe("scoreToStars", () => {
  test("maps the lowest possible score to 1 star", () => {
    expect(scoreToStars(1)).toBe(1);
  });

  test("maps the highest possible score to 5 stars", () => {
    expect(scoreToStars(8)).toBe(5);
  });

  test("rounds and clamps mid-range scores", () => {
    expect(scoreToStars(5.9)).toBe(4);
    expect(scoreToStars(3.1)).toBe(2);
  });
});

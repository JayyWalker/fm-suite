import { describe, expect, test } from "vitest";
import { findBestMatch, levenshteinDistance } from "./fuzzyMatch";

describe("levenshteinDistance", () => {
  test("is 0 for identical strings, case-insensitively", () => {
    expect(levenshteinDistance("Determination", "determination")).toBe(0);
  });

  test("counts single-character edits", () => {
    expect(levenshteinDistance("cat", "cot")).toBe(1);
    expect(levenshteinDistance("cat", "cats")).toBe(1);
  });
});

describe("findBestMatch", () => {
  test("returns the exact candidate on an exact match", () => {
    expect(findBestMatch("Determination", ["Determination", "Adaptability"])).toBe("Determination");
  });

  test("returns the closest candidate when the query has OCR noise", () => {
    expect(findBestMatch("Deternination", ["Determination", "Adaptability"])).toBe("Determination");
  });

  test("returns null when nothing is close enough", () => {
    expect(findBestMatch("Goalkeeping", ["Determination", "Adaptability"])).toBeNull();
  });

  test("returns null for an empty candidate list", () => {
    expect(findBestMatch("Determination", [])).toBeNull();
  });
});

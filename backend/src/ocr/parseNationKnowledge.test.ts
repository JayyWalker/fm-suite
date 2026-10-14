import { describe, expect, test } from "vitest";
import { parseNationKnowledge } from "./parseNationKnowledge";

function line(text: string, confidence = 95) {
  return { text, confidence };
}

describe("parseNationKnowledge", () => {
  test("matches nation and tier read cleanly", () => {
    const result = parseNationKnowledge([line("Germany     Complete"), line("Austria     Exceptional")]);

    expect(result.nationEntries).toEqual(
      expect.arrayContaining([
        { nation: "Germany", tier: 7 },
        { nation: "Austria", tier: 6 },
      ]),
    );
  });

  test("tolerates OCR noise in the nation name", () => {
    const result = parseNationKnowledge([line("Gennany     Complete")]);

    expect(result.nationEntries).toEqual([{ nation: "Germany", tier: 7 }]);
  });

  test("a line with no wide gap is skipped entirely", () => {
    const result = parseNationKnowledge([line("Scouting Knowledge")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });

  test("a nation that doesn't fuzzy-match any known nation is unmatched by its raw text", () => {
    const result = parseNationKnowledge([line("Zzyzxlandia     Complete")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toContain("Zzyzxlandia");
  });

  test("a matched nation with an unrecognized tier word is unmatched by the matched nation name", () => {
    const result = parseNationKnowledge([line("Germany     Fantastic")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toContain("Germany");
  });

  test("a confident nation+tier match below the confidence threshold is lowConfidence, not an entry", () => {
    const result = parseNationKnowledge([line("Germany     Complete", 40)]);

    expect(result.nationEntries).toEqual([]);
    expect(result.lowConfidence).toContain("Germany");
  });

  test("separates the ability scale's 'Elite' from this vocabulary (not a valid knowledge tier)", () => {
    const result = parseNationKnowledge([line("Germany     Elite")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toContain("Germany");
  });
});

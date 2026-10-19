import { describe, expect, test } from "vitest";
import { parseNationKnowledge } from "./parseNationKnowledge";
import { MEDICAL_TAB_OCR_LINES, SCOUTING_TAB_OCR_LINES } from "./realScreenshotFixtures";

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

  test("a line with no knowledge tier word on it is skipped entirely", () => {
    const result = parseNationKnowledge([line("Scouting Knowledge")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });

  test("a nation that doesn't fuzzy-match any known nation is unmatched by its raw text", () => {
    const result = parseNationKnowledge([line("Zzyzxlandia     Complete")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toContain("Zzyzxlandia");
  });

  test("a nation whose tier word isn't recognized yields no entry, never a guessed tier", () => {
    const result = parseNationKnowledge([line("Germany     Fantastic")]);

    expect(result.nationEntries).toEqual([]);
    // Nothing anchors this line to the nation panel — "Germany Fantastic" is
    // indistinguishable from any other line that happens to name a country
    // (club/nationality headers do), so it is reported as nothing at all.
    expect(result.unmatched).toEqual([]);
  });

  test("a nation+tier match below the confidence threshold is still an entry, flagged as lowConfidence", () => {
    const result = parseNationKnowledge([line("Germany     Complete", 40)]);

    expect(result.nationEntries).toEqual([{ nation: "Germany", tier: 7 }]);
    expect(result.lowConfidence).toContain("Germany");
  });

  test("separates the ability scale's 'Elite' from this vocabulary (not a valid knowledge tier)", () => {
    const result = parseNationKnowledge([line("Germany     Elite")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });

  test("an ability word shared with the knowledge scale is not reported as a missed nation row", () => {
    // "Very Good" is on both scales, so an attributes row on an unrelated
    // panel must not produce a warning about an unreadable nation.
    const result = parseNationKnowledge([line("Judging Player Ability Very Good")]);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });

  test("recovers a nation row sharing its OCR line with an attributes row", () => {
    const result = parseNationKnowledge([line("RS 8 Determination Very Good 2 Brazil 5% Extensive")]);

    expect(result.nationEntries).toEqual([{ nation: "Brazil", tier: 5 }]);
  });
});

describe("parseNationKnowledge on real captured OCR output", () => {
  test("reads the nation knowledge row off a real FM26 Scouting tab screenshot", () => {
    const result = parseNationKnowledge(SCOUTING_TAB_OCR_LINES);

    // The nation row is interleaved with the mental-attributes column on the
    // same OCR line: "RS 8 Determination Very Good 2 England 5% Complete".
    expect(result.nationEntries).toEqual([{ nation: "England", tier: 7 }]);
  });

  test("does not invent nation entries from the rest of a real screenshot", () => {
    const result = parseNationKnowledge(SCOUTING_TAB_OCR_LINES);

    // "England" also appears in the header (club/nationality) line, and the
    // attributes columns are full of "Very Good" / "Good" ability words.
    expect(result.nationEntries).toHaveLength(1);
    expect(result.unmatched).toEqual([]);
    expect(result.lowConfidence).toEqual([]);
  });

  test("finds nothing on a real screenshot with no nation panel, despite a nationality header", () => {
    // The Medical tab screenshot's header line reads
    // "~ s Ss Man Utd [#8 Portugal Contract Reputation".
    const result = parseNationKnowledge(MEDICAL_TAB_OCR_LINES);

    expect(result.nationEntries).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });
});

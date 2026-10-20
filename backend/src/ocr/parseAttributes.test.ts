import { describe, expect, test } from "vitest";
import { parseAttributes } from "./parseAttributes";
import { MEDICAL_TAB_OCR_LINES, SCOUTING_TAB_OCR_LINES } from "./realScreenshotFixtures";

function line(text: string, confidence = 95) {
  return { text, confidence };
}

describe("parseAttributes", () => {
  test("matches a label and value read cleanly", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Elite"), line("Determination     Good")]);

    expect(result.matched.physiotherapy).toBe(8);
    expect(result.matched.determination).toBe(5);
  });

  test("tolerates OCR noise in the label text", () => {
    const result = parseAttributes("physio", [line("Physiotherapv     Elite")]);

    expect(result.matched.physiotherapy).toBe(8);
  });

  test("tolerates OCR noise in the value text", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Ellte")]);

    expect(result.matched.physiotherapy).toBe(8);
  });

  test("an attribute with no matching line at all is unmatched", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Elite")]);

    expect(result.unmatched).toContain("Adaptability");
  });

  test("a label match whose value isn't a real vocabulary word is unmatched, never guessed", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Fantastic")]);

    expect(result.matched.physiotherapy).toBeUndefined();
    expect(result.unmatched).toContain("Physiotherapy");
  });

  test("a label+value match below the confidence threshold is still matched, flagged as lowConfidence", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Elite", 40)]);

    expect(result.matched.physiotherapy).toBe(8);
    expect(result.lowConfidence).toContain("Physiotherapy");
  });

  test("a screenshot from the wrong role/tab leaves everything unmatched", () => {
    const result = parseAttributes("coach", [line("Analysing Data     Elite"), line("Judging Player Ability     Good")]);

    expect(Object.keys(result.matched)).toHaveLength(0);
    expect(result.unmatched).toEqual(
      expect.arrayContaining(["Determination", "Authority", "Motivating", "Attacking", "Defending"]),
    );
  });

  test("scout's attribute parsing covers only jpa, jpp, determination, adaptability (not nation knowledge)", () => {
    const result = parseAttributes("scout", [
      line("Judging Player Ability     Elite"),
      line("Judging Player Potential     Good"),
      line("Determination     Good"),
      line("Adaptability     Good"),
    ]);

    expect(result.matched).toEqual({ jpa: 8, jpp: 5, determination: 5, adaptability: 5 });
    expect(result.unmatched).toEqual([]);
  });
});

describe("parseAttributes on real captured OCR output", () => {
  test("reads the physio attributes off a real FM26 Medical tab screenshot", () => {
    const result = parseAttributes("physio", MEDICAL_TAB_OCR_LINES);

    // "Physiotherapy Average Adaptability Good" is one OCR line carrying two
    // side-by-side panel pairs, with ordinary single spaces between them.
    expect(result.matched.physiotherapy).toBe(4); // Average
    expect(result.matched.adaptability).toBe(5); // Good
    expect(result.matched.determination).toBe(6); // Very Good
  });

  test("does not invent values from the unrelated panels of a real Medical tab screenshot", () => {
    const result = parseAttributes("physio", MEDICAL_TAB_OCR_LINES);

    // Authority / Motivating / Negotiating / Judging ... are all on screen but
    // are not physio attributes, so nothing may leak into the physio result.
    expect(Object.keys(result.matched).sort()).toEqual(
      ["adaptability", "determination", "manManagement", "physiotherapy"].sort(),
    );
  });

  test("reads a Sports Scientist's own key attribute, which FM26 labels 'Sports Science' on screen", () => {
    const result = parseAttributes("sportsScientist", MEDICAL_TAB_OCR_LINES);

    // The screen shows "Sports Science Very Good" — not "Fitness" — even
    // though this app's internal field for it is named `fitness`.
    expect(result.matched.fitness).toBe(6); // Very Good
    expect(result.unmatched).not.toContain("Fitness");
  });

  test("reads the scout attributes off a real FM26 Scouting tab screenshot", () => {
    const result = parseAttributes("scout", SCOUTING_TAB_OCR_LINES);

    expect(result.matched.jpa).toBe(6); // Very Good
    expect(result.matched.jpp).toBe(6); // Very Good
    expect(result.matched.determination).toBe(6); // Very Good, on a line shared with a nation row
    // Adaptability was only legible on a badly-read line ("laptability
    // utstanding", confidence 58) — still filled in so the form isn't left
    // blank, but flagged so the user knows to double-check it.
    expect(result.lowConfidence).toEqual(["Adaptability"]);
    expect(result.matched.adaptability).toBe(7); // Outstanding
  });

  test("reads the coach-shaped mental attributes off the same real Scouting tab screenshot", () => {
    const result = parseAttributes("coach", SCOUTING_TAB_OCR_LINES);

    expect(result.matched.authority).toBe(1); // Unsuited
    expect(result.matched.motivating).toBe(1); // Unsuited
    expect(result.matched.determination).toBe(6); // Very Good
    expect(result.matched.tacticalKnowledge).toBe(3); // Competent
    // The coaching attributes simply aren't on this tab.
    expect(result.unmatched).toEqual(
      expect.arrayContaining(["Attacking", "Defending", "Goalkeeping", "Possession"]),
    );
  });

  test("prefers the first reading of a label over a later look-alike label on a real screenshot", () => {
    const result = parseAttributes("scout", SCOUTING_TAB_OCR_LINES);

    // "Judging Staff Ability Reasonable" is close enough to "Judging Player
    // Ability" to fuzzy-match it, but the real row was read earlier.
    expect(result.matched.jpa).not.toBe(2);
  });
});

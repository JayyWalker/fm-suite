import { describe, expect, test } from "vitest";
import { parseAttributes } from "./parseAttributes";

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

  test("a confident label+value match below the confidence threshold is lowConfidence, not matched", () => {
    const result = parseAttributes("physio", [line("Physiotherapy     Elite", 40)]);

    expect(result.matched.physiotherapy).toBeUndefined();
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

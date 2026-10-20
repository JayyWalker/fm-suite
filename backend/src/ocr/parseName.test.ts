import { describe, expect, test } from "vitest";
import { parseName } from "./parseName";
import {
  MEDICAL_TAB_OCR_LINES,
  SCOUTING_TAB_OCR_LINES,
  COACH_MEDICAL_TAB_OCR_LINES,
  COACHING_TAB_OCR_LINES,
} from "./realScreenshotFixtures";

function line(text: string, confidence = 90) {
  return { text, confidence };
}

describe("parseName", () => {
  test("reads the name off a line holding 'Name <noise>: <id>)'", () => {
    const result = parseName([line("Guido Seerden (o: 65036223)")]);

    expect(result).toEqual({ name: "Guido Seerden", lowConfidence: false });
  });

  test("tolerates a different noise token in front of the colon", () => {
    const result = parseName([line("Daniel Behlau ap: 92006543) I")]);

    expect(result.name).toBe("Daniel Behlau");
  });

  test("flags the name as low-confidence when the line's OCR confidence is low", () => {
    const result = parseName([line("Filipe Sousa qo: 55041575)", 59)]);

    expect(result).toEqual({ name: "Filipe Sousa", lowConfidence: true });
  });

  test("does not flag low-confidence when the line reads at or above the threshold", () => {
    const result = parseName([line("Filipe Sousa qo: 55041575)", 60)]);

    expect(result.lowConfidence).toBe(false);
  });

  test("ignores lines with a colon but no digits following it", () => {
    const result = parseName([line("Preferred Jobs: Managerial Coaching Scouting")]);

    expect(result).toEqual({ name: null, lowConfidence: false });
  });

  test("ignores a colon+digits line with nothing usable before the colon", () => {
    const result = parseName([line("qo: 55041575)")]);

    expect(result).toEqual({ name: null, lowConfidence: false });
  });

  test("skips a colon+digits match that resolves to a single word, since real names are never one word", () => {
    // Real capture: a stray "Ula (D: 812003" line (unrelated UI noise) sits
    // above the real name line, which lacks a colon in this capture. A
    // single-word result is confidently wrong more often than it's a real
    // one-word name, so it's rejected rather than silently imported.
    const result = parseName([
      line("Ula (D: 812003", 75),
      line(". Edorta Murua « ) ASPIRE = Spain Contract Reputation", 76),
    ]);

    expect(result).toEqual({ name: null, lowConfidence: false });
  });

  test("finds nothing at all when no line matches the ID-marker pattern", () => {
    const result = parseName([
      line("PS s G Man Utd [#8 Portugal Contract Reputation"),
      line("Medical Attributes Ability Mental Attributes Ability"),
      line("Physiotherapy Average Adaptability Good"),
    ]);

    expect(result).toEqual({ name: null, lowConfidence: false });
  });

  test("reads the name off a real FM26 Medical tab screenshot capture", () => {
    const result = parseName(MEDICAL_TAB_OCR_LINES);

    expect(result).toEqual({ name: "Filipe Sousa", lowConfidence: false });
  });

  test("reads the name off a real screenshot even when the capture is badly OCR'd", () => {
    // "Ian" OCR's as "lan" (capital I misread as lowercase l) at confidence
    // 23 — still filled in so the form isn't left blank, flagged for review.
    const result = parseName(SCOUTING_TAB_OCR_LINES);

    expect(result).toEqual({ name: "lan Marshall", lowConfidence: true });
  });

  test("reads the name off a real Coach-on-the-Medical-tab screenshot capture", () => {
    const result = parseName(COACH_MEDICAL_TAB_OCR_LINES);

    expect(result).toEqual({ name: "Guido Seerden", lowConfidence: false });
  });

  test("reads the name off a real Coaching tab screenshot capture", () => {
    const result = parseName(COACHING_TAB_OCR_LINES);

    expect(result).toEqual({ name: "Daniel Behlau", lowConfidence: false });
  });
});

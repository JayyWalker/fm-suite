import { describe, expect, test } from "vitest";
import { extractLinePairs } from "./linePairs";
import { ABILITY_WORDS } from "./abilityVocabulary";
import { NATION_KNOWLEDGE_WORDS } from "./nationKnowledgeVocabulary";
import { NATIONS } from "./nations";

const PHYSIO_LABELS = ["Physiotherapy", "Determination", "Adaptability", "Man Management"];

function abilityPairs(text: string, labels: string[] = PHYSIO_LABELS) {
  return extractLinePairs(text, ABILITY_WORDS, labels).pairs;
}

describe("extractLinePairs", () => {
  test("pairs a label with the vocabulary word that follows it, with single spacing", () => {
    expect(abilityPairs("Physiotherapy Average")).toEqual([{ candidate: "Physiotherapy", value: "Average" }]);
  });

  test("still works when the OCR happened to leave a wide gap", () => {
    expect(abilityPairs("Physiotherapy     Average")).toEqual([{ candidate: "Physiotherapy", value: "Average" }]);
  });

  test("recovers both pairs from one line holding two side-by-side panel rows", () => {
    expect(abilityPairs("Physiotherapy Average Adaptability Good")).toEqual([
      { candidate: "Physiotherapy", value: "Average" },
      { candidate: "Adaptability", value: "Good" },
    ]);
  });

  test("prefers the longer vocabulary phrase so 'Very Good' is never read as 'Good'", () => {
    expect(abilityPairs("Determination Very Good")).toEqual([{ candidate: "Determination", value: "Very Good" }]);
  });

  test("matches multi-word labels, not just the token next to the value", () => {
    expect(abilityPairs("Judging Player Ability Elite", ["Judging Player Ability"])).toEqual([
      { candidate: "Judging Player Ability", value: "Elite" },
    ]);
  });

  test("tolerates OCR noise in both the label and the vocabulary word", () => {
    expect(abilityPairs("Physiotherapv Ellte")).toEqual([{ candidate: "Physiotherapy", value: "Elite" }]);
  });

  test("ignores debris tokens between the columns", () => {
    expect(extractLinePairs("2 England 5% Complete", NATION_KNOWLEDGE_WORDS, NATIONS).pairs).toEqual([
      { candidate: "England", value: "Complete" },
    ]);
  });

  test("does not let a previous value leak into the next pair's label", () => {
    const { pairs } = extractLinePairs(
      "RS 8 Determination Very Good 2 England 5% Complete",
      NATION_KNOWLEDGE_WORDS,
      NATIONS,
    );

    expect(pairs).toEqual([{ candidate: "England", value: "Complete" }]);
  });

  test("ignores a trailing noise token after the real candidate", () => {
    // Real OCR capture: "22 England Zs Complete" — "Zs" is noise sitting
    // between the real candidate and the vocabulary hit.
    expect(extractLinePairs("22 England Zs Complete", NATION_KNOWLEDGE_WORDS, NATIONS).pairs).toEqual([
      { candidate: "England", value: "Complete" },
    ]);
  });

  test("reports a vocabulary word with no plausible candidate as an orphan, never a guess", () => {
    const { pairs, orphanValues } = extractLinePairs("Negotiating Good", ABILITY_WORDS, PHYSIO_LABELS);

    expect(pairs).toEqual([]);
    expect(orphanValues).toEqual([{ value: "Good", precedingText: "Negotiating" }]);
  });

  test("returns nothing at all for a line with no vocabulary word on it", () => {
    expect(extractLinePairs("Scouting Knowledge", NATION_KNOWLEDGE_WORDS, NATIONS)).toEqual({
      pairs: [],
      orphanValues: [],
    });
  });
});

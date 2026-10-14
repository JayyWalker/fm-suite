import { expect, test } from "vitest";
import { ABILITY_WORDS, abilityWordToValue } from "./abilityVocabulary";

test("exposes exactly the 8 ability words in order", () => {
  expect(ABILITY_WORDS).toEqual([
    "Unsuited",
    "Reasonable",
    "Competent",
    "Average",
    "Good",
    "Very Good",
    "Outstanding",
    "Elite",
  ]);
});

test("maps each word to its 1-8 value, case-insensitively", () => {
  expect(abilityWordToValue("Unsuited")).toBe(1);
  expect(abilityWordToValue("very good")).toBe(6);
  expect(abilityWordToValue("ELITE")).toBe(8);
});

test("returns null for a word that isn't in the vocabulary", () => {
  expect(abilityWordToValue("Complete")).toBeNull();
});

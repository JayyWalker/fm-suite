import { expect, test } from "vitest";
import { NATION_KNOWLEDGE_WORDS, knowledgeWordToValue } from "./nationKnowledgeVocabulary";

test("exposes exactly the 7 knowledge words in order", () => {
  expect(NATION_KNOWLEDGE_WORDS).toEqual(["None", "Minimal", "Good", "Very Good", "Extensive", "Exceptional", "Complete"]);
});

test("maps each word to its 1-7 value, case-insensitively", () => {
  expect(knowledgeWordToValue("None")).toBe(1);
  expect(knowledgeWordToValue("exceptional")).toBe(6);
  expect(knowledgeWordToValue("COMPLETE")).toBe(7);
});

test("returns null for a word that isn't in this vocabulary (e.g. the ability scale's 'Elite')", () => {
  expect(knowledgeWordToValue("Elite")).toBeNull();
});

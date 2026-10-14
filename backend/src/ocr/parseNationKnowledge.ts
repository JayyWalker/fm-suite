import type { OcrLine } from "./runOcr";
import { extractLinePairs } from "./linePairs";
import { ABILITY_WORDS } from "./abilityVocabulary";
import { NATION_KNOWLEDGE_WORDS, knowledgeWordToValue } from "./nationKnowledgeVocabulary";
import { NATIONS } from "./nations";

export interface ParseNationKnowledgeResult {
  nationEntries: { nation: string; tier: number }[];
  unmatched: string[];
  lowConfidence: string[];
}

const LOW_CONFIDENCE_THRESHOLD = 60;

/**
 * "Good" and "Very Good" exist on both the ability scale and the knowledge
 * scale, so seeing one of those with no nation in front of it just means we
 * read an attributes row. The knowledge-only words can't be explained that way:
 * those really are nation rows we failed to read, so they're worth reporting.
 */
const KNOWLEDGE_ONLY_WORDS = NATION_KNOWLEDGE_WORDS.filter(
  (word) => !ABILITY_WORDS.some((ability) => ability.toLowerCase() === word.toLowerCase()),
);

export function parseNationKnowledge(lines: OcrLine[]): ParseNationKnowledgeResult {
  const nationEntries: { nation: string; tier: number }[] = [];
  const unmatched: string[] = [];
  const lowConfidence: string[] = [];

  for (const line of lines) {
    const { pairs, orphanValues } = extractLinePairs(line.text, NATION_KNOWLEDGE_WORDS, NATIONS);

    for (const pair of pairs) {
      if (line.confidence < LOW_CONFIDENCE_THRESHOLD) {
        lowConfidence.push(pair.candidate);
        continue;
      }
      nationEntries.push({ nation: pair.candidate, tier: knowledgeWordToValue(pair.value)! });
    }

    for (const orphan of orphanValues) {
      if (!KNOWLEDGE_ONLY_WORDS.includes(orphan.value)) continue;
      unmatched.push(orphan.precedingText);
    }
  }

  return { nationEntries, unmatched, lowConfidence };
}

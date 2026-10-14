import type { OcrLine } from "./runOcr";
import { findBestMatch, splitTwoColumnLine } from "./fuzzyMatch";
import { NATION_KNOWLEDGE_WORDS, knowledgeWordToValue } from "./nationKnowledgeVocabulary";
import { NATIONS } from "./nations";

export interface ParseNationKnowledgeResult {
  nationEntries: { nation: string; tier: number }[];
  unmatched: string[];
  lowConfidence: string[];
}

const LOW_CONFIDENCE_THRESHOLD = 60;

export function parseNationKnowledge(lines: OcrLine[]): ParseNationKnowledgeResult {
  const nationEntries: { nation: string; tier: number }[] = [];
  const unmatched: string[] = [];
  const lowConfidence: string[] = [];

  for (const line of lines) {
    const split = splitTwoColumnLine(line.text);
    if (!split) continue;

    const nationMatch = findBestMatch(split.left, NATIONS);
    if (!nationMatch) {
      unmatched.push(split.left);
      continue;
    }

    const tierMatch = findBestMatch(split.right, NATION_KNOWLEDGE_WORDS);
    if (!tierMatch) {
      unmatched.push(nationMatch);
      continue;
    }

    if (line.confidence < LOW_CONFIDENCE_THRESHOLD) {
      lowConfidence.push(nationMatch);
      continue;
    }

    nationEntries.push({ nation: nationMatch, tier: knowledgeWordToValue(tierMatch)! });
  }

  return { nationEntries, unmatched, lowConfidence };
}

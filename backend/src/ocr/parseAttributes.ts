import type { StaffRole } from "../roles/index";
import type { OcrLine } from "./runOcr";
import { findBestMatch, splitTwoColumnLine } from "./fuzzyMatch";
import { ABILITY_WORDS, abilityWordToValue } from "./abilityVocabulary";
import { ATTRIBUTE_LABELS } from "./attributeLabels";

export interface ParseAttributesResult {
  matched: Record<string, number>;
  unmatched: string[];
  lowConfidence: string[];
}

const LOW_CONFIDENCE_THRESHOLD = 60;

export function parseAttributes(role: StaffRole, lines: OcrLine[]): ParseAttributesResult {
  const labels = ATTRIBUTE_LABELS[role];
  const matched: Record<string, number> = {};
  const unmatched: string[] = [];
  const lowConfidence: string[] = [];

  for (const [key, label] of Object.entries(labels)) {
    const matchedLine = findLineForLabel(label, lines);
    if (!matchedLine) {
      unmatched.push(label);
      continue;
    }

    const split = splitTwoColumnLine(matchedLine.text);
    const valueMatch = split ? findBestMatch(split.right, ABILITY_WORDS) : null;
    if (!valueMatch) {
      unmatched.push(label);
      continue;
    }

    if (matchedLine.confidence < LOW_CONFIDENCE_THRESHOLD) {
      lowConfidence.push(label);
      continue;
    }

    matched[key] = abilityWordToValue(valueMatch)!;
  }

  return { matched, unmatched, lowConfidence };
}

function findLineForLabel(label: string, lines: OcrLine[]): OcrLine | null {
  for (const line of lines) {
    const split = splitTwoColumnLine(line.text);
    const left = split ? split.left : line.text;
    if (findBestMatch(left, [label])) {
      return line;
    }
  }
  return null;
}

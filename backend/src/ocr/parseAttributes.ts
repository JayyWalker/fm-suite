import type { StaffRole } from "../roles/index";
import type { OcrLine } from "./runOcr";
import { extractLinePairs } from "./linePairs";
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
  const labelEntries = Object.entries(labels);
  const labelValues = labelEntries.map(([, label]) => label);

  const matched: Record<string, number> = {};
  const lowConfidence: string[] = [];
  const unmatched: string[] = [];
  const resolved = new Set<string>();

  for (const line of lines) {
    const { pairs } = extractLinePairs(line.text, ABILITY_WORDS, labelValues);
    for (const pair of pairs) {
      // First reading of a label wins: a later line can hold a label that only
      // looks similar (e.g. "Judging Staff Ability" vs "Judging Player Ability").
      if (resolved.has(pair.candidate)) continue;
      resolved.add(pair.candidate);

      if (line.confidence < LOW_CONFIDENCE_THRESHOLD) {
        lowConfidence.push(pair.candidate);
        continue;
      }

      const key = labelEntries.find(([, label]) => label === pair.candidate)![0];
      matched[key] = abilityWordToValue(pair.value)!;
    }
  }

  for (const [, label] of labelEntries) {
    if (!resolved.has(label)) unmatched.push(label);
  }

  return { matched, unmatched, lowConfidence };
}

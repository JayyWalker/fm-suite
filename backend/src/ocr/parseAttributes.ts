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
      // KNOWN ISSUE: first reading of a label wins, which can import the
      // wrong value for roles with a near-duplicate label (e.g.
      // technicalDirector's judgingStaffAbility), and can also let a
      // low-confidence reading permanently block a later better one.
      // See docs/KNOWN_ISSUES.md.
      if (resolved.has(pair.candidate)) continue;
      resolved.add(pair.candidate);

      const key = labelEntries.find(([, label]) => label === pair.candidate)![0];
      matched[key] = abilityWordToValue(pair.value)!;

      if (line.confidence < LOW_CONFIDENCE_THRESHOLD) {
        lowConfidence.push(pair.candidate);
      }
    }
  }

  for (const [, label] of labelEntries) {
    if (!resolved.has(label)) unmatched.push(label);
  }

  return { matched, unmatched, lowConfidence };
}

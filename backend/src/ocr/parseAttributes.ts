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
      // KNOWN ISSUE: first reading of a label wins, which is the wrong tie-break
      // for roles whose label set has a near-duplicate rendered earlier on the
      // same FM26 screen. Confirmed concretely for technicalDirector: "Judging
      // Player Ability" (rendered first, for every role) is within fuzzy-match
      // distance of "Judging Staff Ability", so technicalDirector's
      // judgingStaffAbility silently imports JPA's value instead, at high
      // confidence, with no unmatched/lowConfidence warning. Verified fix:
      // prefer the lowest-distance match per label instead of the first one
      // seen (requires surfacing match distance from extractLinePairs). See
      // docs/superpowers/specs/2026-10-14-screenshot-ocr-input-design.md's
      // "Known Issues" section for full details.
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

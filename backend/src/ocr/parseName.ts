import type { OcrLine } from "./runOcr";

export interface ParseNameResult {
  name: string | null;
  lowConfidence: boolean;
}

const LOW_CONFIDENCE_THRESHOLD = 60;

/**
 * FM26's staff profile header renders as "<Name> <id-marker>: <digits>)",
 * e.g. "Filipe Sousa qo: 55041575)" — the id-marker itself is OCR noise
 * ("qo:", "(o:", "ap:", ...) that varies by capture, so it's identified by
 * position (the word right before the colon) rather than matched literally.
 * Fails safe to `null` rather than guessing on a layout it doesn't
 * recognize — see docs/KNOWN_ISSUES.md.
 */
export function parseName(lines: OcrLine[]): ParseNameResult {
  for (const line of lines) {
    const colonIndex = line.text.indexOf(":");
    if (colonIndex === -1) continue;

    const after = line.text.slice(colonIndex + 1);
    if (!/^\s*\d{4,}/.test(after)) continue;

    const words = line.text.slice(0, colonIndex).trim().split(/\s+/);
    const name = words.slice(0, -1).join(" ");
    // A real staff name is always at least two words; a single-word result
    // means this line is unrelated OCR noise that happened to match the
    // id-marker shape, not the actual name header.
    if (!name.includes(" ")) continue;

    return { name, lowConfidence: line.confidence < LOW_CONFIDENCE_THRESHOLD };
  }

  return { name: null, lowConfidence: false };
}

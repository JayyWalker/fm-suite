import { findBestMatch, levenshteinDistance } from "./fuzzyMatch";

export interface LinePair {
  /** The candidate (attribute label / nation) matched in front of the value. */
  candidate: string;
  /** The vocabulary word (ability / knowledge tier) that anchored the pair. */
  value: string;
}

/** How many tokens before a vocabulary word may form the label/nation. */
const MAX_CANDIDATE_TOKENS = 4;

function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter((token) => token.length > 0);
}

function wordCount(phrase: string): number {
  return phrase.trim().split(/\s+/).length;
}

interface ScoredMatch {
  match: string;
  distance: number;
  length: number;
}

/**
 * Matches the longest run of tokens starting at `start` against `vocabulary`.
 * Longer phrases win ties so that "Very Good" is never read as "Good".
 */
function matchVocabularyAt(tokens: string[], start: number, vocabulary: string[], maxPhraseTokens: number): ScoredMatch | null {
  let best: ScoredMatch | null = null;

  for (let length = 1; length <= maxPhraseTokens && start + length <= tokens.length; length++) {
    const phrase = tokens.slice(start, start + length).join(" ");
    const match = findBestMatch(phrase, vocabulary);
    if (!match) continue;
    const distance = levenshteinDistance(phrase, match);
    if (!best || distance < best.distance || (distance === best.distance && length > best.length)) {
      best = { match, distance, length };
    }
  }

  return best;
}

/**
 * Matches the tokens immediately before a vocabulary hit against `candidates`,
 * trying the closest 1..MAX_CANDIDATE_TOKENS tokens and keeping the best fit.
 * Tokens with no letters (bullets, percentages, stray digits) are dropped so
 * that OCR debris between columns does not hide the label.
 */
function matchCandidateBefore(region: string[], candidates: string[]): ScoredMatch | null {
  const words = region.filter((token) => /[A-Za-z]/.test(token));
  let best: ScoredMatch | null = null;

  for (let length = 1; length <= MAX_CANDIDATE_TOKENS && length <= words.length; length++) {
    const phrase = words.slice(words.length - length).join(" ");
    const match = findBestMatch(phrase, candidates);
    if (!match) continue;
    const distance = levenshteinDistance(phrase, match);
    if (!best || distance < best.distance || (distance === best.distance && length > best.length)) {
      best = { match, distance, length };
    }
  }

  return best;
}

export interface ExtractedLine {
  pairs: LinePair[];
  /**
   * Vocabulary hits that had no plausible candidate in front of them, with the
   * raw text that preceded them. Callers decide whether that is worth
   * reporting — it is never turned into a guessed pair.
   */
  orphanValues: { value: string; precedingText: string }[];
}

/**
 * Pulls every `candidate` + `value` pair out of a single OCR line.
 *
 * tesseract.js collapses inter-word spacing to single spaces, so column
 * boundaries are invisible in the text. Instead of splitting on whitespace, we
 * anchor on the small closed vocabulary (ability words / knowledge tiers) and
 * read backwards from each hit. A line can therefore yield several pairs, which
 * is what FM26's side-by-side panels produce.
 */
export function extractLinePairs(text: string, vocabulary: string[], candidates: string[]): ExtractedLine {
  const tokens = tokenize(text);
  const maxPhraseTokens = vocabulary.reduce((max, word) => Math.max(max, wordCount(word)), 1);

  const pairs: LinePair[] = [];
  const orphanValues: { value: string; precedingText: string }[] = [];

  let regionStart = 0;
  let index = 0;

  while (index < tokens.length) {
    const hit = matchVocabularyAt(tokens, index, vocabulary, maxPhraseTokens);
    if (!hit) {
      index++;
      continue;
    }

    const region = tokens.slice(regionStart, index);
    const candidate = matchCandidateBefore(region, candidates);
    if (candidate) {
      pairs.push({ candidate: candidate.match, value: hit.match });
    } else if (region.length > 0) {
      orphanValues.push({ value: hit.match, precedingText: region.join(" ") });
    }

    index += hit.length;
    regionStart = index;
  }

  return { pairs, orphanValues };
}

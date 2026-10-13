// This weighting between a role's primary attribute and its mental modifier
// average (combinedScore below), and the linear 1-8 -> 1-5 star mapping
// (scoreToStars below), are this project's own approximation of FM26
// mechanics — for coaching and now scouting alike. Neither FM nor
// fmscout.com's rating calculators publicly disclose their real formula.
// These numbers are a reasonable starting guess, not a derived or verified
// value, and are expected to be retuned later against observed in-game
// results.
export function scoreToStars(score: number): number {
  const stars = Math.round(1 + ((score - 1) * 4) / 7);
  return Math.min(5, Math.max(1, stars));
}

// Every role's rate() function (see backend/src/roles/) calls this directly
// rather than redefining its own weights.
const SHARED_PRIMARY_WEIGHT = 0.7;
const SHARED_MENTAL_WEIGHT = 0.3;

export function combinedScore(primary: number, mentalAverage: number): number {
  return SHARED_PRIMARY_WEIGHT * primary + SHARED_MENTAL_WEIGHT * mentalAverage;
}

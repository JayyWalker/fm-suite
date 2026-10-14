export function levenshteinDistance(a: string, b: string): number {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  const rows = lowerA.length + 1;
  const cols = lowerB.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = lowerA[i - 1] === lowerB[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[rows - 1][cols - 1];
}

export function findBestMatch(query: string, candidates: string[]): string | null {
  let best: { candidate: string; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(query, candidate);
    if (!best || distance < best.distance) {
      best = { candidate, distance };
    }
  }

  if (!best) return null;

  const threshold = Math.max(1, Math.floor(best.candidate.length * 0.3));
  return best.distance <= threshold ? best.candidate : null;
}

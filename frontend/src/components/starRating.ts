// Mirrors backend/src/scoring.ts's scoreToStars 1-8 -> 1-5 linear mapping.
// Keep these two in sync if that formula is ever retuned.
export function rawAttributeToStars(value: number): number {
  const stars = Math.round(1 + ((value - 1) * 4) / 7);
  return Math.min(5, Math.max(1, stars));
}

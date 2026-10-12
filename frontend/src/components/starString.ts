export function starString(stars: number): string {
  const filled = "★".repeat(stars);
  const empty = "☆".repeat(5 - stars);
  return filled + empty;
}

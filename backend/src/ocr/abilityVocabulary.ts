export const ABILITY_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "Unsuited" },
  { value: 2, label: "Reasonable" },
  { value: 3, label: "Competent" },
  { value: 4, label: "Average" },
  { value: 5, label: "Good" },
  { value: 6, label: "Very Good" },
  { value: 7, label: "Outstanding" },
  { value: 8, label: "Elite" },
];

export const ABILITY_WORDS: string[] = ABILITY_LEVELS.map((level) => level.label);

export function abilityWordToValue(word: string): number | null {
  const found = ABILITY_LEVELS.find((level) => level.label.toLowerCase() === word.toLowerCase());
  return found ? found.value : null;
}

export const NATION_KNOWLEDGE_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "None" },
  { value: 2, label: "Minimal" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Extensive" },
  { value: 6, label: "Exceptional" },
  { value: 7, label: "Complete" },
];

export const NATION_KNOWLEDGE_WORDS: string[] = NATION_KNOWLEDGE_LEVELS.map((level) => level.label);

export function knowledgeWordToValue(word: string): number | null {
  const found = NATION_KNOWLEDGE_LEVELS.find((level) => level.label.toLowerCase() === word.toLowerCase());
  return found ? found.value : null;
}

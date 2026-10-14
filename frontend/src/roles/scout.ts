import type { AttributeGroup } from "./index";

export interface NationKnowledgeEntry {
  nation: string;
  tier: number;
}

export interface ScoutAttributes {
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  nationKnowledge: NationKnowledgeEntry[];
}

export type ScoutCategory = "Current Ability Judging" | "Potential Judging";

export const SCOUT_CATEGORIES: ScoutCategory[] = ["Current Ability Judging", "Potential Judging"];

export const mentalFields: (keyof ScoutAttributes)[] = ["determination", "adaptability"];

export const NATION_KNOWLEDGE_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "None" },
  { value: 2, label: "Minimal" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Extensive" },
  { value: 6, label: "Exceptional" },
  { value: 7, label: "Complete" },
];

export const formGroups: AttributeGroup[] = [
  {
    title: "Judging ability",
    fields: [
      { key: "jpa", label: "Judging Player Ability" },
      { key: "jpp", label: "Judging Player Potential" },
    ],
  },
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "adaptability", label: "Adaptability" },
    ],
  },
];

export const extraDisplayGroups: AttributeGroup[] = [];

export const defaultAttributes: Record<string, number> = {
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
};

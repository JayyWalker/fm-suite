import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type ScoutCategory = "Current Ability Judging" | "Potential Judging";

export const SCOUT_CATEGORIES: ScoutCategory[] = ["Current Ability Judging", "Potential Judging"];

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

function mentalAverage(attrs: ScoutAttributes): number {
  return (attrs.determination + attrs.adaptability) / 2;
}

function primaryAttributeFor(category: ScoutCategory, attrs: ScoutAttributes): number {
  switch (category) {
    case "Current Ability Judging":
      return attrs.jpa;
    case "Potential Judging":
      return attrs.jpp;
  }
}

export function rateScout(attrs: ScoutAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<ScoutCategory, number>> = {};
  for (const category of SCOUT_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: ScoutCategory = SCOUT_CATEGORIES[0];
  for (const category of SCOUT_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of SCOUT_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const nationKnowledgeSchema = {
  type: "array" as const,
  items: {
    type: "object" as const,
    required: ["nation", "tier"],
    properties: {
      nation: { type: "string" as const, minLength: 1 },
      tier: { type: "integer" as const, minimum: 1, maximum: 7 },
    },
    additionalProperties: false as const,
  },
};

const baseScoutSchema = buildAttributesSchema(["jpa", "jpp", "determination", "adaptability"]);

export const scoutAttributesSchema = {
  ...baseScoutSchema,
  required: [...baseScoutSchema.required, "nationKnowledge"],
  properties: { ...baseScoutSchema.properties, nationKnowledge: nationKnowledgeSchema },
};

import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type PerformanceAnalystCategory = "Analysing Data" | "Judging Player Ability" | "Tactical Knowledge";

export const PERFORMANCE_ANALYST_CATEGORIES: PerformanceAnalystCategory[] = [
  "Analysing Data",
  "Judging Player Ability",
  "Tactical Knowledge",
];

export interface PerformanceAnalystAttributes {
  analysingData: number;
  jpa: number;
  tacticalKnowledge: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: PerformanceAnalystAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: PerformanceAnalystCategory, attrs: PerformanceAnalystAttributes): number {
  switch (category) {
    case "Analysing Data":
      return attrs.analysingData;
    case "Judging Player Ability":
      return attrs.jpa;
    case "Tactical Knowledge":
      return attrs.tacticalKnowledge;
  }
}

export function ratePerformanceAnalyst(attrs: PerformanceAnalystAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<PerformanceAnalystCategory, number>> = {};
  for (const category of PERFORMANCE_ANALYST_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: PerformanceAnalystCategory = PERFORMANCE_ANALYST_CATEGORIES[0];
  for (const category of PERFORMANCE_ANALYST_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of PERFORMANCE_ANALYST_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const performanceAnalystAttributesSchema = {
  type: "object",
  required: ["analysingData", "jpa", "tacticalKnowledge", "determination", "adaptability", "manManagement"],
  properties: {
    analysingData: attributeSchema,
    jpa: attributeSchema,
    tacticalKnowledge: attributeSchema,
    determination: attributeSchema,
    adaptability: attributeSchema,
    manManagement: attributeSchema,
  },
  additionalProperties: false,
};

import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type DofCategory = "Negotiating" | "Current Ability Judging" | "Potential Judging";

export const DOF_CATEGORIES: DofCategory[] = ["Negotiating", "Current Ability Judging", "Potential Judging"];

export interface DofAttributes {
  negotiating: number;
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: DofAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: DofCategory, attrs: DofAttributes): number {
  switch (category) {
    case "Negotiating":
      return attrs.negotiating;
    case "Current Ability Judging":
      return attrs.jpa;
    case "Potential Judging":
      return attrs.jpp;
  }
}

export function rateDof(attrs: DofAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<DofCategory, number>> = {};
  for (const category of DOF_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: DofCategory = DOF_CATEGORIES[0];
  for (const category of DOF_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of DOF_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const dofAttributesSchema = {
  type: "object",
  required: ["negotiating", "jpa", "jpp", "determination", "adaptability", "manManagement"],
  properties: {
    negotiating: attributeSchema,
    jpa: attributeSchema,
    jpp: attributeSchema,
    determination: attributeSchema,
    adaptability: attributeSchema,
    manManagement: attributeSchema,
  },
  additionalProperties: false,
};

import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type TechnicalDirectorCategory = "Negotiating" | "Judging Staff Ability";

export const TECHNICAL_DIRECTOR_CATEGORIES: TechnicalDirectorCategory[] = ["Negotiating", "Judging Staff Ability"];

export interface TechnicalDirectorAttributes {
  negotiating: number;
  judgingStaffAbility: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: TechnicalDirectorAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: TechnicalDirectorCategory, attrs: TechnicalDirectorAttributes): number {
  switch (category) {
    case "Negotiating":
      return attrs.negotiating;
    case "Judging Staff Ability":
      return attrs.judgingStaffAbility;
  }
}

export function rateTechnicalDirector(attrs: TechnicalDirectorAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<TechnicalDirectorCategory, number>> = {};
  for (const category of TECHNICAL_DIRECTOR_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: TechnicalDirectorCategory = TECHNICAL_DIRECTOR_CATEGORIES[0];
  for (const category of TECHNICAL_DIRECTOR_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of TECHNICAL_DIRECTOR_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const technicalDirectorAttributesSchema = {
  type: "object",
  required: ["negotiating", "judgingStaffAbility", "determination", "adaptability", "manManagement"],
  properties: {
    negotiating: attributeSchema,
    judgingStaffAbility: attributeSchema,
    determination: attributeSchema,
    adaptability: attributeSchema,
    manManagement: attributeSchema,
  },
  additionalProperties: false,
};

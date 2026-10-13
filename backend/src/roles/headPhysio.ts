import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type HeadPhysioCategory = "Physiotherapy" | "Judging Player Condition";

export const HEAD_PHYSIO_CATEGORIES: HeadPhysioCategory[] = ["Physiotherapy", "Judging Player Condition"];

export interface HeadPhysioAttributes {
  physiotherapy: number;
  judgingPlayerCondition: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: HeadPhysioAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: HeadPhysioCategory, attrs: HeadPhysioAttributes): number {
  switch (category) {
    case "Physiotherapy":
      return attrs.physiotherapy;
    case "Judging Player Condition":
      return attrs.judgingPlayerCondition;
  }
}

export function rateHeadPhysio(attrs: HeadPhysioAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<HeadPhysioCategory, number>> = {};
  for (const category of HEAD_PHYSIO_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: HeadPhysioCategory = HEAD_PHYSIO_CATEGORIES[0];
  for (const category of HEAD_PHYSIO_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of HEAD_PHYSIO_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

export const headPhysioAttributesSchema = buildAttributesSchema([
  "physiotherapy",
  "judgingPlayerCondition",
  "determination",
  "adaptability",
  "manManagement",
]);

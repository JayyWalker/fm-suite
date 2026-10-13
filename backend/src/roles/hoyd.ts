import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type HoydCategory = "Working with Youngsters" | "Current Ability Judging" | "Potential Judging";

export const HOYD_CATEGORIES: HoydCategory[] = [
  "Working with Youngsters",
  "Current Ability Judging",
  "Potential Judging",
];

export interface HoydAttributes {
  workingWithYoungsters: number;
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: HoydAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: HoydCategory, attrs: HoydAttributes): number {
  switch (category) {
    case "Working with Youngsters":
      return attrs.workingWithYoungsters;
    case "Current Ability Judging":
      return attrs.jpa;
    case "Potential Judging":
      return attrs.jpp;
  }
}

export function rateHoyd(attrs: HoydAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<HoydCategory, number>> = {};
  for (const category of HOYD_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: HoydCategory = HOYD_CATEGORIES[0];
  for (const category of HOYD_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of HOYD_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

export const hoydAttributesSchema = buildAttributesSchema([
  "workingWithYoungsters",
  "jpa",
  "jpp",
  "determination",
  "adaptability",
  "manManagement",
]);

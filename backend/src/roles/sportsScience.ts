import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type SportsScienceCategory = "Fitness";

export const SPORTS_SCIENCE_CATEGORIES: SportsScienceCategory[] = ["Fitness"];

export interface SportsScienceAttributes {
  fitness: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: SportsScienceAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

export function rateSportsScience(attrs: SportsScienceAttributes): StaffRatings {
  const stars = scoreToStars(combinedScore(attrs.fitness, mentalAverage(attrs)));

  return {
    categories: { Fitness: stars },
    bestFit: "Fitness",
  };
}

export const sportsScienceAttributesSchema = buildAttributesSchema([
  "fitness",
  "determination",
  "adaptability",
  "manManagement",
]);

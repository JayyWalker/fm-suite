import { combinedScore, scoreToStars } from "../scoring";
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

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const sportsScienceAttributesSchema = {
  type: "object",
  required: ["fitness", "determination", "adaptability", "manManagement"],
  properties: {
    fitness: attributeSchema,
    determination: attributeSchema,
    adaptability: attributeSchema,
    manManagement: attributeSchema,
  },
  additionalProperties: false,
};

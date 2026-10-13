import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type PhysioCategory = "Physiotherapy";

export const PHYSIO_CATEGORIES: PhysioCategory[] = ["Physiotherapy"];

export interface PhysioAttributes {
  physiotherapy: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: PhysioAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

export function ratePhysio(attrs: PhysioAttributes): StaffRatings {
  const stars = scoreToStars(combinedScore(attrs.physiotherapy, mentalAverage(attrs)));

  return {
    categories: { Physiotherapy: stars },
    bestFit: "Physiotherapy",
  };
}

export const physioAttributesSchema = buildAttributesSchema([
  "physiotherapy",
  "determination",
  "adaptability",
  "manManagement",
]);

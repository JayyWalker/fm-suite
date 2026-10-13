import { combinedScore, scoreToStars } from "../scoring";
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

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const physioAttributesSchema = {
  type: "object",
  required: ["physiotherapy", "determination", "adaptability", "manManagement"],
  properties: {
    physiotherapy: attributeSchema,
    determination: attributeSchema,
    adaptability: attributeSchema,
    manManagement: attributeSchema,
  },
  additionalProperties: false,
};

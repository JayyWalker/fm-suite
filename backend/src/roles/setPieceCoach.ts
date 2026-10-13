import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type SetPieceCoachCategory = "Set Pieces";

export const SET_PIECE_COACH_CATEGORIES: SetPieceCoachCategory[] = ["Set Pieces"];

export interface SetPieceCoachAttributes {
  setPieces: number;
  determination: number;
  authority: number;
  motivating: number;
}

function mentalAverage(attrs: SetPieceCoachAttributes): number {
  return (attrs.determination + attrs.authority + attrs.motivating) / 3;
}

export function rateSetPieceCoach(attrs: SetPieceCoachAttributes): StaffRatings {
  const stars = scoreToStars(combinedScore(attrs.setPieces, mentalAverage(attrs)));

  return {
    categories: { "Set Pieces": stars },
    bestFit: "Set Pieces",
  };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const setPieceCoachAttributesSchema = {
  type: "object",
  required: ["setPieces", "determination", "authority", "motivating"],
  properties: {
    setPieces: attributeSchema,
    determination: attributeSchema,
    authority: attributeSchema,
    motivating: attributeSchema,
  },
  additionalProperties: false,
};

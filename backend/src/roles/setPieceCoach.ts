import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
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

export const setPieceCoachAttributesSchema = buildAttributesSchema([
  "setPieces",
  "determination",
  "authority",
  "motivating",
]);

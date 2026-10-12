import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type CoachCategory =
  | "Attacking"
  | "Defending"
  | "Fitness"
  | "Goalkeeping"
  | "Possession"
  | "Set Pieces"
  | "Tactical";

export const COACH_CATEGORIES: CoachCategory[] = [
  "Attacking",
  "Defending",
  "Fitness",
  "Goalkeeping",
  "Possession",
  "Set Pieces",
  "Tactical",
];

export interface CoachAttributes {
  authority: number;
  determination: number;
  motivating: number;
  attacking: number;
  defending: number;
  fitness: number;
  goalkeeping: number;
  possession: number;
  setPieces: number;
  tactical: number;
  technical: number;
  tacticalKnowledge: number;
}

function mentalAverage(attrs: CoachAttributes): number {
  return (attrs.determination + attrs.authority + attrs.motivating) / 3;
}

function primaryAttributeFor(category: CoachCategory, attrs: CoachAttributes): number {
  switch (category) {
    case "Attacking":
      return attrs.attacking;
    case "Defending":
      return attrs.defending;
    case "Fitness":
      return attrs.fitness;
    case "Goalkeeping":
      return attrs.goalkeeping;
    case "Possession":
      return attrs.possession;
    case "Set Pieces":
      return attrs.setPieces;
    case "Tactical":
      return (attrs.tactical + attrs.technical + attrs.tacticalKnowledge) / 3;
  }
}

export function rateCoach(attrs: CoachAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<CoachCategory, number>> = {};
  for (const category of COACH_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: CoachCategory = COACH_CATEGORIES[0];
  for (const category of COACH_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of COACH_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const coachAttributesSchema = {
  type: "object",
  required: [
    "authority",
    "determination",
    "motivating",
    "attacking",
    "defending",
    "fitness",
    "goalkeeping",
    "possession",
    "setPieces",
    "tactical",
    "technical",
    "tacticalKnowledge",
  ],
  properties: {
    authority: attributeSchema,
    determination: attributeSchema,
    motivating: attributeSchema,
    attacking: attributeSchema,
    defending: attributeSchema,
    fitness: attributeSchema,
    goalkeeping: attributeSchema,
    possession: attributeSchema,
    setPieces: attributeSchema,
    tactical: attributeSchema,
    technical: attributeSchema,
    tacticalKnowledge: attributeSchema,
  },
  additionalProperties: false,
};

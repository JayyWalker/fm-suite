import type { AttributeGroup } from "./index";

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

export const coachMentalFields: (keyof CoachAttributes)[] = ["determination", "authority", "motivating"];

export const coachFormGroups: AttributeGroup[] = [
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "authority", label: "Authority" },
      { key: "motivating", label: "Motivating" },
    ],
  },
  {
    title: "Coaching attributes",
    fields: [
      { key: "attacking", label: "Attacking" },
      { key: "defending", label: "Defending" },
      { key: "fitness", label: "Fitness" },
      { key: "goalkeeping", label: "Goalkeeping" },
      { key: "possession", label: "Possession" },
      { key: "setPieces", label: "Set Pieces" },
      { key: "tactical", label: "Tactical" },
      { key: "technical", label: "Technical" },
    ],
  },
  {
    title: "Knowledge",
    fields: [{ key: "tacticalKnowledge", label: "Tactical Knowledge" }],
  },
];

export const coachExtraDisplayGroups: AttributeGroup[] = [];

export const coachDefaultAttributes: CoachAttributes = {
  authority: 4,
  determination: 4,
  motivating: 4,
  attacking: 4,
  defending: 4,
  fitness: 4,
  goalkeeping: 4,
  possession: 4,
  setPieces: 4,
  tactical: 4,
  technical: 4,
  tacticalKnowledge: 4,
};

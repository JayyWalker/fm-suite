import type { AttributeGroup } from "./index";

export interface SetPieceCoachAttributes {
  setPieces: number;
  determination: number;
  authority: number;
  motivating: number;
}

export type SetPieceCoachCategory = "Set Pieces";

export const SET_PIECE_COACH_CATEGORIES: SetPieceCoachCategory[] = ["Set Pieces"];

export const mentalFields: (keyof SetPieceCoachAttributes)[] = ["determination", "authority", "motivating"];

export const formGroups: AttributeGroup[] = [
  {
    title: "Coaching attributes",
    fields: [{ key: "setPieces", label: "Set Pieces" }],
  },
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "authority", label: "Authority" },
      { key: "motivating", label: "Motivating" },
    ],
  },
];

export const extraDisplayGroups: AttributeGroup[] = [];

export const defaultAttributes: SetPieceCoachAttributes = {
  setPieces: 4,
  determination: 4,
  authority: 4,
  motivating: 4,
};

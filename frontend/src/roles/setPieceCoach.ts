import type { AttributeGroup } from "./index";

export interface SetPieceCoachAttributes {
  setPieces: number;
  determination: number;
  authority: number;
  motivating: number;
}

export type SetPieceCoachCategory = "Set Pieces";

export const SET_PIECE_COACH_CATEGORIES: SetPieceCoachCategory[] = ["Set Pieces"];

export const setPieceCoachMentalFields: (keyof SetPieceCoachAttributes)[] = ["determination", "authority", "motivating"];

export const setPieceCoachFormGroups: AttributeGroup[] = [
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

export const setPieceCoachExtraDisplayGroups: AttributeGroup[] = [];

export const setPieceCoachDefaultAttributes: SetPieceCoachAttributes = {
  setPieces: 4,
  determination: 4,
  authority: 4,
  motivating: 4,
};

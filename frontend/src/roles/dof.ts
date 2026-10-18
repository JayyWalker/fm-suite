import type { AttributeGroup } from "./index";

export interface DofAttributes {
  negotiating: number;
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type DofCategory = "Negotiating" | "Current Ability Judging" | "Potential Judging";

export const DOF_CATEGORIES: DofCategory[] = ["Negotiating", "Current Ability Judging", "Potential Judging"];

export const dofMentalFields: (keyof DofAttributes)[] = ["determination", "adaptability", "manManagement"];

export const dofFormGroups: AttributeGroup[] = [
  {
    title: "Football operations",
    fields: [
      { key: "negotiating", label: "Negotiating" },
      { key: "jpa", label: "Judging Player Ability" },
      { key: "jpp", label: "Judging Player Potential" },
    ],
  },
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "adaptability", label: "Adaptability" },
      { key: "manManagement", label: "Man Management" },
    ],
  },
];

export const dofExtraDisplayGroups: AttributeGroup[] = [];

export const dofDefaultAttributes: DofAttributes = {
  negotiating: 4,
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

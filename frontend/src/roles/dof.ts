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

export const mentalFields: (keyof DofAttributes)[] = ["determination", "adaptability", "manManagement"];

export const formGroups: AttributeGroup[] = [
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

export const extraDisplayGroups: AttributeGroup[] = [];

export const defaultAttributes: DofAttributes = {
  negotiating: 4,
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

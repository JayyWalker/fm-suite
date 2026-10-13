import type { AttributeGroup } from "./index";

export interface TechnicalDirectorAttributes {
  negotiating: number;
  judgingStaffAbility: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type TechnicalDirectorCategory = "Negotiating" | "Judging Staff Ability";

export const TECHNICAL_DIRECTOR_CATEGORIES: TechnicalDirectorCategory[] = ["Negotiating", "Judging Staff Ability"];

export const mentalFields: (keyof TechnicalDirectorAttributes)[] = ["determination", "adaptability", "manManagement"];

export const formGroups: AttributeGroup[] = [
  {
    title: "Staff management",
    fields: [
      { key: "negotiating", label: "Negotiating" },
      { key: "judgingStaffAbility", label: "Judging Staff Ability" },
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

export const defaultAttributes: TechnicalDirectorAttributes = {
  negotiating: 4,
  judgingStaffAbility: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

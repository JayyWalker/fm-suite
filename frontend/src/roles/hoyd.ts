import type { AttributeGroup } from "./index";

export interface HoydAttributes {
  workingWithYoungsters: number;
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type HoydCategory = "Working with Youngsters" | "Current Ability Judging" | "Potential Judging";

export const HOYD_CATEGORIES: HoydCategory[] = [
  "Working with Youngsters",
  "Current Ability Judging",
  "Potential Judging",
];

export const hoydMentalFields: (keyof HoydAttributes)[] = ["determination", "adaptability", "manManagement"];

export const hoydFormGroups: AttributeGroup[] = [
  {
    title: "Youth development ability",
    fields: [
      { key: "workingWithYoungsters", label: "Working with Youngsters" },
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

export const hoydExtraDisplayGroups: AttributeGroup[] = [];

export const hoydDefaultAttributes: HoydAttributes = {
  workingWithYoungsters: 4,
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

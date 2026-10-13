import type { AttributeGroup } from "./index";

export interface SportsScienceAttributes {
  fitness: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type SportsScienceCategory = "Fitness";

export const SPORTS_SCIENCE_CATEGORIES: SportsScienceCategory[] = ["Fitness"];

export const mentalFields: (keyof SportsScienceAttributes)[] = ["determination", "adaptability", "manManagement"];

export const formGroups: AttributeGroup[] = [
  {
    title: "Fitness ability",
    fields: [{ key: "fitness", label: "Fitness" }],
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

export const defaultAttributes: SportsScienceAttributes = {
  fitness: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

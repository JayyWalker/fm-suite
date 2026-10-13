import type { AttributeGroup } from "./index";

export interface PhysioAttributes {
  physiotherapy: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type PhysioCategory = "Physiotherapy";

export const PHYSIO_CATEGORIES: PhysioCategory[] = ["Physiotherapy"];

export const mentalFields: (keyof PhysioAttributes)[] = ["determination", "adaptability", "manManagement"];

export const formGroups: AttributeGroup[] = [
  {
    title: "Medical ability",
    fields: [{ key: "physiotherapy", label: "Physiotherapy" }],
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

export const defaultAttributes: PhysioAttributes = {
  physiotherapy: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

import type { AttributeGroup } from "./index";

export interface HeadPhysioAttributes {
  physiotherapy: number;
  judgingPlayerCondition: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type HeadPhysioCategory = "Physiotherapy" | "Judging Player Condition";

export const HEAD_PHYSIO_CATEGORIES: HeadPhysioCategory[] = ["Physiotherapy", "Judging Player Condition"];

export const headPhysioMentalFields: (keyof HeadPhysioAttributes)[] = ["determination", "adaptability", "manManagement"];

export const headPhysioFormGroups: AttributeGroup[] = [
  {
    title: "Medical ability",
    fields: [
      { key: "physiotherapy", label: "Physiotherapy" },
      { key: "judgingPlayerCondition", label: "Judging Player Condition" },
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

export const headPhysioExtraDisplayGroups: AttributeGroup[] = [];

export const headPhysioDefaultAttributes: HeadPhysioAttributes = {
  physiotherapy: 4,
  judgingPlayerCondition: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

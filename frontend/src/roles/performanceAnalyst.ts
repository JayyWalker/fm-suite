import type { AttributeGroup } from "./index";

export interface PerformanceAnalystAttributes {
  analysingData: number;
  jpa: number;
  tacticalKnowledge: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type PerformanceAnalystCategory = "Analysing Data" | "Judging Player Ability" | "Tactical Knowledge";

export const PERFORMANCE_ANALYST_CATEGORIES: PerformanceAnalystCategory[] = [
  "Analysing Data",
  "Judging Player Ability",
  "Tactical Knowledge",
];

export const performanceAnalystMentalFields: (keyof PerformanceAnalystAttributes)[] = ["determination", "adaptability", "manManagement"];

export const performanceAnalystFormGroups: AttributeGroup[] = [
  {
    title: "Analysis ability",
    fields: [
      { key: "analysingData", label: "Analysing Data" },
      { key: "jpa", label: "Judging Player Ability" },
      { key: "tacticalKnowledge", label: "Tactical Knowledge" },
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

export const performanceAnalystExtraDisplayGroups: AttributeGroup[] = [];

export const performanceAnalystDefaultAttributes: PerformanceAnalystAttributes = {
  analysingData: 4,
  jpa: 4,
  tacticalKnowledge: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

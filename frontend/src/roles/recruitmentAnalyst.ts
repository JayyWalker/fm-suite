import type { AttributeGroup } from "./index";

export interface RecruitmentAnalystAttributes {
  analysingData: number;
  jpa: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type RecruitmentAnalystCategory = "Analysing Data" | "Judging Player Ability";

export const RECRUITMENT_ANALYST_CATEGORIES: RecruitmentAnalystCategory[] = [
  "Analysing Data",
  "Judging Player Ability",
];

export const recruitmentAnalystMentalFields: (keyof RecruitmentAnalystAttributes)[] = ["determination", "adaptability", "manManagement"];

export const recruitmentAnalystFormGroups: AttributeGroup[] = [
  {
    title: "Analysis ability",
    fields: [
      { key: "analysingData", label: "Analysing Data" },
      { key: "jpa", label: "Judging Player Ability" },
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

export const recruitmentAnalystExtraDisplayGroups: AttributeGroup[] = [];

export const recruitmentAnalystDefaultAttributes: RecruitmentAnalystAttributes = {
  analysingData: 4,
  jpa: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

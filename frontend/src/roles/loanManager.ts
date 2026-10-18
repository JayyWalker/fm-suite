import type { AttributeGroup } from "./index";

export interface LoanManagerAttributes {
  analysingData: number;
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type LoanManagerCategory = "Analysing Data" | "Judging Player Ability" | "Judging Player Potential";

export const LOAN_MANAGER_CATEGORIES: LoanManagerCategory[] = [
  "Analysing Data",
  "Judging Player Ability",
  "Judging Player Potential",
];

export const loanManagerMentalFields: (keyof LoanManagerAttributes)[] = ["determination", "adaptability", "manManagement"];

export const loanManagerFormGroups: AttributeGroup[] = [
  {
    title: "Loan assessment",
    fields: [
      { key: "analysingData", label: "Analysing Data" },
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

export const loanManagerExtraDisplayGroups: AttributeGroup[] = [];

export const loanManagerDefaultAttributes: LoanManagerAttributes = {
  analysingData: 4,
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

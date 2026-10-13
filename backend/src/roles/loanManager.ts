import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type LoanManagerCategory = "Analysing Data" | "Judging Player Ability" | "Judging Player Potential";

export const LOAN_MANAGER_CATEGORIES: LoanManagerCategory[] = [
  "Analysing Data",
  "Judging Player Ability",
  "Judging Player Potential",
];

export interface LoanManagerAttributes {
  analysingData: number;
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: LoanManagerAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: LoanManagerCategory, attrs: LoanManagerAttributes): number {
  switch (category) {
    case "Analysing Data":
      return attrs.analysingData;
    case "Judging Player Ability":
      return attrs.jpa;
    case "Judging Player Potential":
      return attrs.jpp;
  }
}

export function rateLoanManager(attrs: LoanManagerAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<LoanManagerCategory, number>> = {};
  for (const category of LOAN_MANAGER_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: LoanManagerCategory = LOAN_MANAGER_CATEGORIES[0];
  for (const category of LOAN_MANAGER_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of LOAN_MANAGER_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

export const loanManagerAttributesSchema = buildAttributesSchema([
  "analysingData",
  "jpa",
  "jpp",
  "determination",
  "adaptability",
  "manManagement",
]);

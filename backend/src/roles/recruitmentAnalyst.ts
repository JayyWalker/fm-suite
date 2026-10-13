import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type RecruitmentAnalystCategory = "Analysing Data" | "Judging Player Ability";

export const RECRUITMENT_ANALYST_CATEGORIES: RecruitmentAnalystCategory[] = [
  "Analysing Data",
  "Judging Player Ability",
];

export interface RecruitmentAnalystAttributes {
  analysingData: number;
  jpa: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: RecruitmentAnalystAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: RecruitmentAnalystCategory, attrs: RecruitmentAnalystAttributes): number {
  switch (category) {
    case "Analysing Data":
      return attrs.analysingData;
    case "Judging Player Ability":
      return attrs.jpa;
  }
}

export function rateRecruitmentAnalyst(attrs: RecruitmentAnalystAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<RecruitmentAnalystCategory, number>> = {};
  for (const category of RECRUITMENT_ANALYST_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: RecruitmentAnalystCategory = RECRUITMENT_ANALYST_CATEGORIES[0];
  for (const category of RECRUITMENT_ANALYST_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of RECRUITMENT_ANALYST_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

export const recruitmentAnalystAttributesSchema = buildAttributesSchema([
  "analysingData",
  "jpa",
  "determination",
  "adaptability",
  "manManagement",
]);

import { combinedScore, scoreToStars } from "../scoring";
import { buildAttributesSchema } from "./buildAttributesSchema";
import type { StaffRatings } from "./index";

export type DataAnalystCategory = "Judging Player Data" | "Judging Team Data" | "Presenting Data";

export const DATA_ANALYST_CATEGORIES: DataAnalystCategory[] = [
  "Judging Player Data",
  "Judging Team Data",
  "Presenting Data",
];

export interface DataAnalystAttributes {
  judgingPlayerData: number;
  judgingTeamData: number;
  presentingData: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

function mentalAverage(attrs: DataAnalystAttributes): number {
  return (attrs.determination + attrs.adaptability + attrs.manManagement) / 3;
}

function primaryAttributeFor(category: DataAnalystCategory, attrs: DataAnalystAttributes): number {
  switch (category) {
    case "Judging Player Data":
      return attrs.judgingPlayerData;
    case "Judging Team Data":
      return attrs.judgingTeamData;
    case "Presenting Data":
      return attrs.presentingData;
  }
}

export function rateDataAnalyst(attrs: DataAnalystAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<DataAnalystCategory, number>> = {};
  for (const category of DATA_ANALYST_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: DataAnalystCategory = DATA_ANALYST_CATEGORIES[0];
  for (const category of DATA_ANALYST_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of DATA_ANALYST_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

export const dataAnalystAttributesSchema = buildAttributesSchema([
  "judgingPlayerData",
  "judgingTeamData",
  "presentingData",
  "determination",
  "adaptability",
  "manManagement",
]);

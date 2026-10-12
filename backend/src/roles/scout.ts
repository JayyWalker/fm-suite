import { combinedScore, scoreToStars } from "../scoring";
import type { StaffRatings } from "./index";

export type ScoutCategory = "Current Ability Judging" | "Potential Judging";

export const SCOUT_CATEGORIES: ScoutCategory[] = ["Current Ability Judging", "Potential Judging"];

export interface ScoutAttributes {
  jpa: number;
  jpp: number;
  determination: number;
  adaptability: number;
  westernEurope: number;
  centralEurope: number;
  ukAndIreland: number;
  southernEurope: number;
  southEasternEurope: number;
  northEasternEurope: number;
  northernEurope: number;
  easternEurope: number;
  southAmericaNorth: number;
  southAmericaSouth: number;
  northAmerica: number;
  westernAfrica: number;
  centralAfrica: number;
  southernAfrica: number;
  northAfrica: number;
  middleEast: number;
  eastAsia: number;
  southEastAsia: number;
  oceania: number;
}

function mentalAverage(attrs: ScoutAttributes): number {
  return (attrs.determination + attrs.adaptability) / 2;
}

function primaryAttributeFor(category: ScoutCategory, attrs: ScoutAttributes): number {
  switch (category) {
    case "Current Ability Judging":
      return attrs.jpa;
    case "Potential Judging":
      return attrs.jpp;
  }
}

export function rateScout(attrs: ScoutAttributes): StaffRatings {
  const mental = mentalAverage(attrs);
  const rawScores: Partial<Record<ScoutCategory, number>> = {};
  for (const category of SCOUT_CATEGORIES) {
    rawScores[category] = combinedScore(primaryAttributeFor(category, attrs), mental);
  }

  let bestFit: ScoutCategory = SCOUT_CATEGORIES[0];
  for (const category of SCOUT_CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Record<string, number> = {};
  for (const category of SCOUT_CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories, bestFit };
}

const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const scoutAttributesSchema = {
  type: "object",
  required: [
    "jpa",
    "jpp",
    "determination",
    "adaptability",
    "westernEurope",
    "centralEurope",
    "ukAndIreland",
    "southernEurope",
    "southEasternEurope",
    "northEasternEurope",
    "northernEurope",
    "easternEurope",
    "southAmericaNorth",
    "southAmericaSouth",
    "northAmerica",
    "westernAfrica",
    "centralAfrica",
    "southernAfrica",
    "northAfrica",
    "middleEast",
    "eastAsia",
    "southEastAsia",
    "oceania",
  ],
  properties: {
    jpa: attributeSchema,
    jpp: attributeSchema,
    determination: attributeSchema,
    adaptability: attributeSchema,
    westernEurope: attributeSchema,
    centralEurope: attributeSchema,
    ukAndIreland: attributeSchema,
    southernEurope: attributeSchema,
    southEasternEurope: attributeSchema,
    northEasternEurope: attributeSchema,
    northernEurope: attributeSchema,
    easternEurope: attributeSchema,
    southAmericaNorth: attributeSchema,
    southAmericaSouth: attributeSchema,
    northAmerica: attributeSchema,
    westernAfrica: attributeSchema,
    centralAfrica: attributeSchema,
    southernAfrica: attributeSchema,
    northAfrica: attributeSchema,
    middleEast: attributeSchema,
    eastAsia: attributeSchema,
    southEastAsia: attributeSchema,
    oceania: attributeSchema,
  },
  additionalProperties: false,
};

import type { AttributeGroup } from "./index";

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

export type ScoutCategory = "Current Ability Judging" | "Potential Judging";

export const SCOUT_CATEGORIES: ScoutCategory[] = ["Current Ability Judging", "Potential Judging"];

export const mentalFields: (keyof ScoutAttributes)[] = ["determination", "adaptability"];

const regionFields: { key: keyof ScoutAttributes; label: string }[] = [
  { key: "westernEurope", label: "Western Europe" },
  { key: "centralEurope", label: "Central Europe" },
  { key: "ukAndIreland", label: "UK and Ireland" },
  { key: "southernEurope", label: "Southern Europe" },
  { key: "southEasternEurope", label: "South Eastern Europe" },
  { key: "northEasternEurope", label: "North Eastern Europe" },
  { key: "northernEurope", label: "Northern Europe" },
  { key: "easternEurope", label: "Eastern Europe" },
  { key: "southAmericaNorth", label: "South America (North)" },
  { key: "southAmericaSouth", label: "South America (South)" },
  { key: "northAmerica", label: "North America" },
  { key: "westernAfrica", label: "Western Africa" },
  { key: "centralAfrica", label: "Central Africa" },
  { key: "southernAfrica", label: "Southern Africa" },
  { key: "northAfrica", label: "North Africa" },
  { key: "middleEast", label: "Middle East" },
  { key: "eastAsia", label: "East Asia" },
  { key: "southEastAsia", label: "South East Asia" },
  { key: "oceania", label: "Oceania" },
];

export const formGroups: AttributeGroup[] = [
  {
    title: "Judging ability",
    fields: [
      { key: "jpa", label: "Judging Player Ability" },
      { key: "jpp", label: "Judging Player Potential" },
    ],
  },
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "adaptability", label: "Adaptability" },
    ],
  },
  {
    title: "Regional knowledge",
    fields: regionFields,
  },
];

export const extraDisplayGroups: AttributeGroup[] = [{ title: "Regional Knowledge", fields: regionFields }];

export const defaultAttributes: ScoutAttributes = {
  jpa: 4,
  jpp: 4,
  determination: 4,
  adaptability: 4,
  westernEurope: 4,
  centralEurope: 4,
  ukAndIreland: 4,
  southernEurope: 4,
  southEasternEurope: 4,
  northEasternEurope: 4,
  northernEurope: 4,
  easternEurope: 4,
  southAmericaNorth: 4,
  southAmericaSouth: 4,
  northAmerica: 4,
  westernAfrica: 4,
  centralAfrica: 4,
  southernAfrica: 4,
  northAfrica: 4,
  middleEast: 4,
  eastAsia: 4,
  southEastAsia: 4,
  oceania: 4,
};

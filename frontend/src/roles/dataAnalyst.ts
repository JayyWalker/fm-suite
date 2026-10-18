import type { AttributeGroup } from "./index";

export interface DataAnalystAttributes {
  judgingPlayerData: number;
  judgingTeamData: number;
  presentingData: number;
  determination: number;
  adaptability: number;
  manManagement: number;
}

export type DataAnalystCategory = "Judging Player Data" | "Judging Team Data" | "Presenting Data";

export const DATA_ANALYST_CATEGORIES: DataAnalystCategory[] = [
  "Judging Player Data",
  "Judging Team Data",
  "Presenting Data",
];

export const dataAnalystMentalFields: (keyof DataAnalystAttributes)[] = ["determination", "adaptability", "manManagement"];

export const dataAnalystFormGroups: AttributeGroup[] = [
  {
    title: "Data analysis",
    fields: [
      { key: "judgingPlayerData", label: "Judging Player Data" },
      { key: "judgingTeamData", label: "Judging Team Data" },
      { key: "presentingData", label: "Presenting Data" },
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

export const dataAnalystExtraDisplayGroups: AttributeGroup[] = [];

export const dataAnalystDefaultAttributes: DataAnalystAttributes = {
  judgingPlayerData: 4,
  judgingTeamData: 4,
  presentingData: 4,
  determination: 4,
  adaptability: 4,
  manManagement: 4,
};

import {
  COACH_CATEGORIES,
  defaultAttributes as coachDefaultAttributes,
  extraDisplayGroups as coachExtraDisplayGroups,
  formGroups as coachFormGroups,
  mentalFields as coachMentalFields,
} from "./coach";
import {
  SCOUT_CATEGORIES,
  defaultAttributes as scoutDefaultAttributes,
  extraDisplayGroups as scoutExtraDisplayGroups,
  formGroups as scoutFormGroups,
  mentalFields as scoutMentalFields,
} from "./scout";

export type StaffRole = "coach" | "scout";

export const STAFF_ROLES: StaffRole[] = ["coach", "scout"];

export interface AttributeGroup {
  title: string;
  fields: { key: string; label: string }[];
}

export interface RoleUIDefinition {
  key: StaffRole;
  label: string;
  categories: string[];
  formGroups: AttributeGroup[];
  mentalFields: string[];
  extraDisplayGroups: AttributeGroup[];
  defaultAttributes: Record<string, number>;
}

export const ROLES: Record<StaffRole, RoleUIDefinition> = {
  coach: {
    key: "coach",
    label: "Coach",
    categories: COACH_CATEGORIES,
    formGroups: coachFormGroups,
    mentalFields: coachMentalFields,
    extraDisplayGroups: coachExtraDisplayGroups,
    defaultAttributes: coachDefaultAttributes as unknown as Record<string, number>,
  },
  scout: {
    key: "scout",
    label: "Scout",
    categories: SCOUT_CATEGORIES,
    formGroups: scoutFormGroups,
    mentalFields: scoutMentalFields,
    extraDisplayGroups: scoutExtraDisplayGroups,
    defaultAttributes: scoutDefaultAttributes as unknown as Record<string, number>,
  },
};

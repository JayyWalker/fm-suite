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
import {
  PHYSIO_CATEGORIES,
  defaultAttributes as physioDefaultAttributes,
  extraDisplayGroups as physioExtraDisplayGroups,
  formGroups as physioFormGroups,
  mentalFields as physioMentalFields,
} from "./physio";
import {
  HOYD_CATEGORIES,
  defaultAttributes as hoydDefaultAttributes,
  extraDisplayGroups as hoydExtraDisplayGroups,
  formGroups as hoydFormGroups,
  mentalFields as hoydMentalFields,
} from "./hoyd";
import {
  DOF_CATEGORIES,
  defaultAttributes as dofDefaultAttributes,
  extraDisplayGroups as dofExtraDisplayGroups,
  formGroups as dofFormGroups,
  mentalFields as dofMentalFields,
} from "./dof";

export type StaffRole = "coach" | "scout" | "physio" | "hoyd" | "dof";

export const STAFF_ROLES: StaffRole[] = ["coach", "scout", "physio", "hoyd", "dof"];

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
  physio: {
    key: "physio",
    label: "Physio",
    categories: PHYSIO_CATEGORIES,
    formGroups: physioFormGroups,
    mentalFields: physioMentalFields,
    extraDisplayGroups: physioExtraDisplayGroups,
    defaultAttributes: physioDefaultAttributes as unknown as Record<string, number>,
  },
  hoyd: {
    key: "hoyd",
    label: "Head of Youth Development",
    categories: HOYD_CATEGORIES,
    formGroups: hoydFormGroups,
    mentalFields: hoydMentalFields,
    extraDisplayGroups: hoydExtraDisplayGroups,
    defaultAttributes: hoydDefaultAttributes as unknown as Record<string, number>,
  },
  dof: {
    key: "dof",
    label: "Director of Football",
    categories: DOF_CATEGORIES,
    formGroups: dofFormGroups,
    mentalFields: dofMentalFields,
    extraDisplayGroups: dofExtraDisplayGroups,
    defaultAttributes: dofDefaultAttributes as unknown as Record<string, number>,
  },
};

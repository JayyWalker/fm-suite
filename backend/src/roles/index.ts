import { COACH_CATEGORIES, rateCoach, coachAttributesSchema, type CoachAttributes } from "./coach";
import { SCOUT_CATEGORIES, rateScout, scoutAttributesSchema, type ScoutAttributes } from "./scout";
import { PHYSIO_CATEGORIES, ratePhysio, physioAttributesSchema, type PhysioAttributes } from "./physio";

export type StaffRole = "coach" | "scout" | "physio";

export const STAFF_ROLES: StaffRole[] = ["coach", "scout", "physio"];

export interface StaffRatings {
  categories: Record<string, number>;
  bestFit: string;
}

export interface RoleDefinition {
  key: StaffRole;
  categories: string[];
  rate(attributes: Record<string, number>): StaffRatings;
  attributesSchema: object;
}

export const ROLES: Record<StaffRole, RoleDefinition> = {
  coach: {
    key: "coach",
    categories: COACH_CATEGORIES,
    rate: (attributes) => rateCoach(attributes as unknown as CoachAttributes),
    attributesSchema: coachAttributesSchema,
  },
  scout: {
    key: "scout",
    categories: SCOUT_CATEGORIES,
    rate: (attributes) => rateScout(attributes as unknown as ScoutAttributes),
    attributesSchema: scoutAttributesSchema,
  },
  physio: {
    key: "physio",
    categories: PHYSIO_CATEGORIES,
    rate: (attributes) => ratePhysio(attributes as unknown as PhysioAttributes),
    attributesSchema: physioAttributesSchema,
  },
};

export type StaffRole = "coach" | "scout";

export const STAFF_ROLES: StaffRole[] = ["coach", "scout"];

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

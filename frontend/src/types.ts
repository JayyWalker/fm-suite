import type { CoachAttributes } from "./roles/coach";
import type { ScoutAttributes } from "./roles/scout";
import type { PhysioAttributes } from "./roles/physio";
import type { HoydAttributes } from "./roles/hoyd";
import type { DofAttributes } from "./roles/dof";

export const ATTRIBUTE_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "Unsuited" },
  { value: 2, label: "Reasonable" },
  { value: 3, label: "Competent" },
  { value: 4, label: "Average" },
  { value: 5, label: "Good" },
  { value: 6, label: "Very Good" },
  { value: 7, label: "Outstanding" },
  { value: 8, label: "Elite" },
];

interface StaffCore {
  id: number;
  name: string;
  tags: string[];
  categories: Record<string, number>;
  bestFit: string;
  createdAt: string;
  updatedAt: string;
}

export type StaffMember =
  | (StaffCore & { role: "coach"; attributes: CoachAttributes })
  | (StaffCore & { role: "scout"; attributes: ScoutAttributes })
  | (StaffCore & { role: "physio"; attributes: PhysioAttributes })
  | (StaffCore & { role: "hoyd"; attributes: HoydAttributes })
  | (StaffCore & { role: "dof"; attributes: DofAttributes });

export type StaffInput =
  | { role: "coach"; name: string; tags: string[]; attributes: CoachAttributes }
  | { role: "scout"; name: string; tags: string[]; attributes: ScoutAttributes }
  | { role: "physio"; name: string; tags: string[]; attributes: PhysioAttributes }
  | { role: "hoyd"; name: string; tags: string[]; attributes: HoydAttributes }
  | { role: "dof"; name: string; tags: string[]; attributes: DofAttributes };

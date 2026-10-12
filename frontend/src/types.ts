export type Category =
  | "Attacking"
  | "Defending"
  | "Fitness"
  | "Goalkeeping"
  | "Possession"
  | "Set Pieces"
  | "Tactical";

export const CATEGORIES: Category[] = [
  "Attacking",
  "Defending",
  "Fitness",
  "Goalkeeping",
  "Possession",
  "Set Pieces",
  "Tactical",
];

export interface StaffAttributes {
  authority: number;
  determination: number;
  motivating: number;
  attacking: number;
  defending: number;
  fitness: number;
  goalkeeping: number;
  possession: number;
  setPieces: number;
  tactical: number;
  technical: number;
  tacticalKnowledge: number;
}

export interface StaffMember {
  id: number;
  name: string;
  tags: string[];
  attributes: StaffAttributes;
  categories: Record<Category, number>;
  bestFit: Category;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInput {
  name: string;
  tags: string[];
  attributes: StaffAttributes;
}

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

export const ATTRIBUTE_FIELDS: { key: keyof StaffAttributes; label: string }[] = [
  { key: "authority", label: "Authority" },
  { key: "determination", label: "Determination" },
  { key: "motivating", label: "Motivating" },
  { key: "attacking", label: "Attacking" },
  { key: "defending", label: "Defending" },
  { key: "fitness", label: "Fitness" },
  { key: "goalkeeping", label: "Goalkeeping" },
  { key: "possession", label: "Possession" },
  { key: "setPieces", label: "Set Pieces" },
  { key: "tactical", label: "Tactical" },
  { key: "technical", label: "Technical" },
  { key: "tacticalKnowledge", label: "Tactical Knowledge" },
];

export const HOLY_TRINITY_FIELDS: (keyof StaffAttributes)[] = ["determination", "authority", "motivating"];

export interface AttributeGroup {
  title: string;
  fields: { key: keyof StaffAttributes; label: string }[];
}

export const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    title: "Mental attributes",
    fields: [
      { key: "determination", label: "Determination" },
      { key: "authority", label: "Authority" },
      { key: "motivating", label: "Motivating" },
    ],
  },
  {
    title: "Coaching attributes",
    fields: [
      { key: "attacking", label: "Attacking" },
      { key: "defending", label: "Defending" },
      { key: "fitness", label: "Fitness" },
      { key: "goalkeeping", label: "Goalkeeping" },
      { key: "possession", label: "Possession" },
      { key: "setPieces", label: "Set Pieces" },
      { key: "tactical", label: "Tactical" },
      { key: "technical", label: "Technical" },
    ],
  },
  {
    title: "Knowledge",
    fields: [{ key: "tacticalKnowledge", label: "Tactical Knowledge" }],
  },
];

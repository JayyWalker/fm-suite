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

export interface StaffRatings {
  categories: Record<Category, number>;
  bestFit: Category;
}

// This weighting between a category's matching attribute and the "holy
// trinity" mental attributes, and the linear 1-8 -> 1-5 star mapping below,
// are this project's own approximation of FM26 coaching mechanics. Neither
// FM nor fmscout.com's coach rating calculator publicly discloses their
// real formula. These numbers are a reasonable starting guess, not a
// derived or verified value, and are expected to be retuned later against
// observed in-game results.
const PRIMARY_WEIGHT = 0.7;
const HOLY_TRINITY_WEIGHT = 0.3;

function holyTrinityAverage(attrs: StaffAttributes): number {
  return (attrs.determination + attrs.authority + attrs.motivating) / 3;
}

function primaryAttributeFor(category: Category, attrs: StaffAttributes): number {
  switch (category) {
    case "Attacking":
      return attrs.attacking;
    case "Defending":
      return attrs.defending;
    case "Fitness":
      return attrs.fitness;
    case "Goalkeeping":
      return attrs.goalkeeping;
    case "Possession":
      return attrs.possession;
    case "Set Pieces":
      return attrs.setPieces;
    case "Tactical":
      return (attrs.tactical + attrs.technical + attrs.tacticalKnowledge) / 3;
  }
}

function rawCategoryScore(category: Category, attrs: StaffAttributes): number {
  return (
    PRIMARY_WEIGHT * primaryAttributeFor(category, attrs) +
    HOLY_TRINITY_WEIGHT * holyTrinityAverage(attrs)
  );
}

export function scoreToStars(score: number): number {
  const stars = Math.round(1 + ((score - 1) * 4) / 7);
  return Math.min(5, Math.max(1, stars));
}

// This weighting between a role's primary attribute and its mental
// modifier average is this project's own approximation of FM26
// mechanics — see the disclaimer above scoreToStars for the full
// context. Every role's rate() function (see backend/src/roles/) calls
// this directly rather than redefining its own weights.
const SHARED_PRIMARY_WEIGHT = 0.7;
const SHARED_MENTAL_WEIGHT = 0.3;

export function combinedScore(primary: number, mentalAverage: number): number {
  return SHARED_PRIMARY_WEIGHT * primary + SHARED_MENTAL_WEIGHT * mentalAverage;
}

export function rateStaff(attrs: StaffAttributes): StaffRatings {
  const rawScores: Partial<Record<Category, number>> = {};
  for (const category of CATEGORIES) {
    rawScores[category] = rawCategoryScore(category, attrs);
  }

  let bestFit: Category = CATEGORIES[0];
  for (const category of CATEGORIES) {
    if (rawScores[category]! > rawScores[bestFit]!) {
      bestFit = category;
    }
  }

  const categories: Partial<Record<Category, number>> = {};
  for (const category of CATEGORIES) {
    categories[category] = scoreToStars(rawScores[category]!);
  }

  return { categories: categories as Record<Category, number>, bestFit };
}

import { COACH_CATEGORIES, rateCoach, coachAttributesSchema, type CoachAttributes } from "./coach";
import { SCOUT_CATEGORIES, rateScout, scoutAttributesSchema, type ScoutAttributes } from "./scout";
import { PHYSIO_CATEGORIES, ratePhysio, physioAttributesSchema, type PhysioAttributes } from "./physio";
import { HOYD_CATEGORIES, rateHoyd, hoydAttributesSchema, type HoydAttributes } from "./hoyd";
import { DOF_CATEGORIES, rateDof, dofAttributesSchema, type DofAttributes } from "./dof";
import {
  DATA_ANALYST_CATEGORIES,
  rateDataAnalyst,
  dataAnalystAttributesSchema,
  type DataAnalystAttributes,
} from "./dataAnalyst";
import {
  SPORTS_SCIENCE_CATEGORIES,
  rateSportsScience,
  sportsScienceAttributesSchema,
  type SportsScienceAttributes,
} from "./sportsScience";
import {
  HEAD_PHYSIO_CATEGORIES,
  rateHeadPhysio,
  headPhysioAttributesSchema,
  type HeadPhysioAttributes,
} from "./headPhysio";
import {
  SET_PIECE_COACH_CATEGORIES,
  rateSetPieceCoach,
  setPieceCoachAttributesSchema,
  type SetPieceCoachAttributes,
} from "./setPieceCoach";
import {
  PERFORMANCE_ANALYST_CATEGORIES,
  ratePerformanceAnalyst,
  performanceAnalystAttributesSchema,
  type PerformanceAnalystAttributes,
} from "./performanceAnalyst";
import {
  RECRUITMENT_ANALYST_CATEGORIES,
  rateRecruitmentAnalyst,
  recruitmentAnalystAttributesSchema,
  type RecruitmentAnalystAttributes,
} from "./recruitmentAnalyst";
import {
  TECHNICAL_DIRECTOR_CATEGORIES,
  rateTechnicalDirector,
  technicalDirectorAttributesSchema,
  type TechnicalDirectorAttributes,
} from "./technicalDirector";

export type StaffRole =
  | "coach"
  | "scout"
  | "physio"
  | "hoyd"
  | "dof"
  | "dataAnalyst"
  | "sportsScientist"
  | "headOfSportsScience"
  | "headPhysio"
  | "setPieceCoach"
  | "performanceAnalyst"
  | "headPerformanceAnalyst"
  | "recruitmentAnalyst"
  | "technicalDirector";

export const STAFF_ROLES: StaffRole[] = [
  "coach",
  "scout",
  "physio",
  "hoyd",
  "dof",
  "dataAnalyst",
  "sportsScientist",
  "headOfSportsScience",
  "headPhysio",
  "setPieceCoach",
  "performanceAnalyst",
  "headPerformanceAnalyst",
  "recruitmentAnalyst",
  "technicalDirector",
];

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
  hoyd: {
    key: "hoyd",
    categories: HOYD_CATEGORIES,
    rate: (attributes) => rateHoyd(attributes as unknown as HoydAttributes),
    attributesSchema: hoydAttributesSchema,
  },
  dof: {
    key: "dof",
    categories: DOF_CATEGORIES,
    rate: (attributes) => rateDof(attributes as unknown as DofAttributes),
    attributesSchema: dofAttributesSchema,
  },
  dataAnalyst: {
    key: "dataAnalyst",
    categories: DATA_ANALYST_CATEGORIES,
    rate: (attributes) => rateDataAnalyst(attributes as unknown as DataAnalystAttributes),
    attributesSchema: dataAnalystAttributesSchema,
  },
  sportsScientist: {
    key: "sportsScientist",
    categories: SPORTS_SCIENCE_CATEGORIES,
    rate: (attributes) => rateSportsScience(attributes as unknown as SportsScienceAttributes),
    attributesSchema: sportsScienceAttributesSchema,
  },
  headOfSportsScience: {
    key: "headOfSportsScience",
    categories: SPORTS_SCIENCE_CATEGORIES,
    rate: (attributes) => rateSportsScience(attributes as unknown as SportsScienceAttributes),
    attributesSchema: sportsScienceAttributesSchema,
  },
  headPhysio: {
    key: "headPhysio",
    categories: HEAD_PHYSIO_CATEGORIES,
    rate: (attributes) => rateHeadPhysio(attributes as unknown as HeadPhysioAttributes),
    attributesSchema: headPhysioAttributesSchema,
  },
  setPieceCoach: {
    key: "setPieceCoach",
    categories: SET_PIECE_COACH_CATEGORIES,
    rate: (attributes) => rateSetPieceCoach(attributes as unknown as SetPieceCoachAttributes),
    attributesSchema: setPieceCoachAttributesSchema,
  },
  performanceAnalyst: {
    key: "performanceAnalyst",
    categories: PERFORMANCE_ANALYST_CATEGORIES,
    rate: (attributes) => ratePerformanceAnalyst(attributes as unknown as PerformanceAnalystAttributes),
    attributesSchema: performanceAnalystAttributesSchema,
  },
  headPerformanceAnalyst: {
    key: "headPerformanceAnalyst",
    categories: PERFORMANCE_ANALYST_CATEGORIES,
    rate: (attributes) => ratePerformanceAnalyst(attributes as unknown as PerformanceAnalystAttributes),
    attributesSchema: performanceAnalystAttributesSchema,
  },
  recruitmentAnalyst: {
    key: "recruitmentAnalyst",
    categories: RECRUITMENT_ANALYST_CATEGORIES,
    rate: (attributes) => rateRecruitmentAnalyst(attributes as unknown as RecruitmentAnalystAttributes),
    attributesSchema: recruitmentAnalystAttributesSchema,
  },
  technicalDirector: {
    key: "technicalDirector",
    categories: TECHNICAL_DIRECTOR_CATEGORIES,
    rate: (attributes) => rateTechnicalDirector(attributes as unknown as TechnicalDirectorAttributes),
    attributesSchema: technicalDirectorAttributesSchema,
  },
};

import type { StaffRole } from "../roles/index";

// KNOWN ISSUE: "Man Management" below should say "People Management" to
// match what FM26 actually renders; it currently matches by coincidence.
// See docs/KNOWN_ISSUES.md.
export const ATTRIBUTE_LABELS: Record<StaffRole, Record<string, string>> = {
  coach: {
    determination: "Determination",
    authority: "Authority",
    motivating: "Motivating",
    attacking: "Attacking",
    defending: "Defending",
    fitness: "Fitness",
    goalkeeping: "Goalkeeping",
    possession: "Possession",
    setPieces: "Set Pieces",
    tactical: "Tactical",
    technical: "Technical",
    tacticalKnowledge: "Tactical Knowledge",
  },
  scout: {
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
  },
  physio: {
    physiotherapy: "Physiotherapy",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  hoyd: {
    workingWithYoungsters: "Working with Youngsters",
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  dof: {
    negotiating: "Negotiating",
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  dataAnalyst: {
    judgingPlayerData: "Judging Player Data",
    judgingTeamData: "Judging Team Data",
    presentingData: "Presenting Data",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  sportsScientist: {
    // FM26 labels this "Sports Science" on screen, not "Fitness" — this
    // app's internal field is named `fitness`, but the OCR label must match
    // what's actually printed, not the internal key name.
    fitness: "Sports Science",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  headOfSportsScience: {
    fitness: "Sports Science",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  headPhysio: {
    physiotherapy: "Physiotherapy",
    judgingPlayerCondition: "Judging Player Condition",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  setPieceCoach: {
    setPieces: "Set Pieces",
    determination: "Determination",
    authority: "Authority",
    motivating: "Motivating",
  },
  performanceAnalyst: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    tacticalKnowledge: "Tactical Knowledge",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  headPerformanceAnalyst: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    tacticalKnowledge: "Tactical Knowledge",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  recruitmentAnalyst: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  technicalDirector: {
    negotiating: "Negotiating",
    judgingStaffAbility: "Judging Staff Ability",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
  loanManager: {
    analysingData: "Analysing Data",
    jpa: "Judging Player Ability",
    jpp: "Judging Player Potential",
    determination: "Determination",
    adaptability: "Adaptability",
    manManagement: "Man Management",
  },
};

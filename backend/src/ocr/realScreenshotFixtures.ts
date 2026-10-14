import type { OcrLine } from "./runOcr";

/**
 * Real `runOcr` output captured from two FM26 staff-report screenshots, via
 * `preprocessImage` -> `runOcr` with tesseract.js@7.
 *
 * These are verbatim: tesseract normalises inter-word spacing to single spaces
 * regardless of the pixel gap in the source image, so none of these lines carry
 * the wide multi-space gaps that hand-written fixtures used to assume. FM26 also
 * renders side-by-side panels, so a single OCR line often carries two
 * label/value pairs (and, on the Scouting tab, a nation-knowledge row as well).
 */

/**
 * Filipe Sousa, Sports Scientist, Medical tab.
 *
 * On screen: Physiotherapy = Average, Sports Science = Very Good,
 * Adaptability = Good, Authority = Reasonable, Determination = Very Good,
 * Motivating = Very Good, People Management = Good, Judging Player Ability =
 * Average, Judging Player Potential = Average, Judging Staff Ability =
 * Competent, Negotiating = Good, Tactical Knowledge = Competent.
 */
export const MEDICAL_TAB_OCR_LINES: OcrLine[] = [
  { text: "StaffReport > Staff > Staff Report\n", confidence: 75 },
  { text: "Filipe Sousa qo: 55041575)\n", confidence: 74 },
  { text: "~ s Ss Man Utd [#8 Portugal Contract Reputation\n", confidence: 78 },
  { text: "ports Scientist © 7% Regional\n", confidence: 75 },
  { text: "i ? Sports Scientist No Caps £7.25K plw 30/6/2029 % Regiona\n", confidence: 54 },
  { text: "| [@ POR 33 years old (1/9/1991)\n", confidence: 48 },
  { text: "VJ\n", confidence: 8 },
  { text: "Overview Personal Career\n", confidence: 75 },
  { text: "_ 4 - —\n", confidence: 43 },
  { text: "N n N Personality\n", confidence: 18 },
  { text: "Sel Preferred Jobs Managerial Coaching Scouting\n", confidence: 94 },
  { text: "Ambitious\n", confidence: 86 },
  { text: "@® 5% Sports Scientist\n", confidence: 78 },
  { text: "Medical Attributes Ability Mental Attributes Ability\n", confidence: 95 },
  { text: "Q 5 physio\n\n", confidence: 29 },
  { text: "Physiotherapy Average Adaptability Good\n", confidence: 95 },
  { text: "| Sports Science Very Good Authority Reasonable\n", confidence: 94 },
  { text: "Determination Very Good\n", confidence: 96 },
  { text: "Motivating Very Good\n", confidence: 96 },
  { text: "People Management Good\n\n", confidence: 96 },
  { text: "Knowledge Ability\n", confidence: 96 },
  { text: "Judging Player Ability Average\n", confidence: 96 },
  { text: "Judging Player Potential Average\n", confidence: 96 },
  { text: "Judging Staff Ability Competent\n", confidence: 96 },
  { text: "Negotiating Good\n", confidence: 94 },
  { text: "Tactical Knowledge Competent\n\n", confidence: 96 },
  { text: "@ Key Attributes\n", confidence: 87 },
];

/**
 * Ian Marshall, Scout, Scouting tab (attributes panel plus the "Scouting
 * Knowledge" nation panel on the right-hand side of the same screenshot).
 *
 * On screen: Analysing Data = Unsuited, Adaptability = Outstanding,
 * Authority = Unsuited, Determination = Very Good, Motivating = Unsuited,
 * People Management = Reasonable, Judging Player Ability = Very Good,
 * Judging Player Potential = Very Good, Judging Staff Ability = Reasonable,
 * Negotiating = Unsuited, Tactical Knowledge = Competent,
 * and a single nation-knowledge row: England = Complete.
 */
export const SCOUTING_TAB_OCR_LINES: OcrLine[] = [
  { text: "lan Marshall (o: 28129574) - }\n", confidence: 39 },
  { text: "oN _— @ Leicester &B England [ET Reputation\n", confidence: 52 },
  { text: "cou an\n", confidence: 66 },
  { text: "4s Local\n", confidence: 71 },
  { text: "M Scout No@s £600 p/w 30/6/2028 =\n", confidence: 59 },
  { text: "p b SE ENG 67 years old (17/6/1958)\n", confidence: 57 },
  { text: ".\n", confidence: 0 },
  { text: ")\n", confidence: 0 },
  { text: "( Overview Personal Career\n", confidence: 78 },
  { text: "4 Ne PE —\n", confidence: 13 },
  { text: "&) Preferred Jobs Managerial Coaching Medical diy\n", confidence: 67 },
  { text: "Fairly Determined\n", confidence: 96 },
  { text: "®  5%scout\n", confidence: 28 },
  { text: "Scouting Attributes Ability Mental Attributes Ability Scouting Knowledge\n", confidence: 95 },
  { text: "QO 5% Director of Football\n", confidence: 72 },
  { text: "Analysing Dat Unsuited | Ac tabili Outstandi\n", confidence: 80 },
  { text: "O  & TechnicalDirector nalysing Data nsuite laptability utstanding Notion —\n", confidence: 58 },
  { text: "pa Authority Unsuited\n", confidence: 78 },
  { text: "OQ 5% Head of Youth Development .\n", confidence: 73 },
  { text: "RS 8 Determination Very Good 2 England 5% Complete\n", confidence: 60 },
  { text: "Q 5% Recruitment Analyst\n", confidence: 73 },
  { text: "~ Motivating Unsuited\n", confidence: 66 },
  { text: "Q 5k Performance Analyst\n", confidence: 63 },
  { text: "Ps People Management Reasonable\n", confidence: 80 },
  { text: "Q 5 Head Performance Analyst\n", confidence: 82 },
  { text: "Knowledge Ability\n", confidence: 96 },
  { text: "Judging Player Ability Very Good\n", confidence: 96 },
  { text: "Judging Player Potential Very Good\n", confidence: 96 },
  { text: "Judging Staff Ability Reasonable\n", confidence: 94 },
  { text: "Negotiating Unsuited\n", confidence: 93 },
  { text: "Tactical Knowledge Competent\n", confidence: 95 },
  { text: "@ Key Attributes\n", confidence: 83 },
];

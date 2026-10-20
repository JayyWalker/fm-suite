import type { OcrLine } from "./runOcr";

/**
 * Real `runOcr` output captured from FM26 staff-report screenshots, via
 * `preprocessImage` -> `runOcr` with tesseract.js@7. Source images live in
 * `backend/src/ocr/sample-screenshots/`.
 *
 * These are verbatim: tesseract normalises inter-word spacing to single spaces
 * regardless of the pixel gap in the source image, so none of these lines carry
 * the wide multi-space gaps that hand-written fixtures used to assume. FM26 also
 * renders side-by-side panels, so a single OCR line often carries two
 * label/value pairs (and, on the Scouting tab, a nation-knowledge row as well).
 *
 * Recaptured 2026-10-20 after `preprocessImage` dropped its contrast-stretch
 * step (it was measurably harmful — see the comment in `preprocessImage.ts`).
 * The two original fixtures below were re-run against the fixed pipeline;
 * exact text/confidence differs slightly from before.
 */

/**
 * Filipe Sousa, Sports Scientist, Medical tab.
 * Source: sample-screenshots/sports-scientist-filipe-sousa-medical.png
 *
 * On screen: Physiotherapy = Average, Sports Science = Very Good,
 * Adaptability = Good, Authority = Reasonable, Determination = Very Good,
 * Motivating = Very Good, People Management = Good, Judging Player Ability =
 * Average, Judging Player Potential = Average, Judging Staff Ability =
 * Competent, Negotiating = Good, Tactical Knowledge = Competent.
 */
export const MEDICAL_TAB_OCR_LINES: OcrLine[] = [
  { text: "StaffReport > Staff > StaffReport\n", confidence: 90 },
  { text: "Filipe Sousa qo: 55041575)\n", confidence: 76 },
  { text: "PS s G Man Utd [#8 Portugal Contract Reputation\n", confidence: 67 },
  { text: "ports Scientist © 7% Regional\n", confidence: 76 },
  { text: "i ? Sports Scientist No Caps £7.25K plw 30/6/2029 % Regiona\n", confidence: 56 },
  { text: "| [@ POR 33 years old (1/9/1991)\n", confidence: 46 },
  { text: "1\n", confidence: 37 },
  { text: "( Overview Personal Career\n", confidence: 83 },
  { text: "4 Ne J —\n", confidence: 16 },
  { text: "N n N Personality\n", confidence: 21 },
  { text: "Sel Preferred Jobs Managerial Coaching Scouting\n", confidence: 93 },
  { text: "Ambitious\n", confidence: 81 },
  { text: "@® 5% Sports Scientist\n", confidence: 80 },
  { text: "Medical Attributes Ability Mental Attributes Ability\n", confidence: 95 },
  { text: "QO Physio\n\n", confidence: 44 },
  { text: "Physiotherapy Average Adaptability Good\n", confidence: 95 },
  { text: "| Sports Science Very Good Authority Reasonable\n", confidence: 94 },
  { text: "Determination Very Good\n", confidence: 96 },
  { text: "Motivating Very Good\n", confidence: 96 },
  { text: "People Management Good\n\n", confidence: 96 },
  { text: "Knowledge Ability\n", confidence: 96 },
  { text: "Judging Player Ability Average\n", confidence: 95 },
  { text: "Judging Player Potential Average\n", confidence: 96 },
  { text: "Judging Staff Ability Competent\n", confidence: 96 },
  { text: "Negotiating Good\n", confidence: 94 },
  { text: "Tactical Knowledge Competent\n\n", confidence: 96 },
  { text: "@ Key Attributes\n", confidence: 86 },
];

/**
 * Ian Marshall, Scout, Scouting tab (attributes panel plus the "Scouting
 * Knowledge" nation panel on the right-hand side of the same screenshot).
 * Source: sample-screenshots/scout-ian-marshall-scouting.png
 *
 * On screen: Analysing Data = Unsuited, Adaptability = Outstanding,
 * Authority = Unsuited, Determination = Very Good, Motivating = Unsuited,
 * People Management = Reasonable, Judging Player Ability = Very Good,
 * Judging Player Potential = Very Good, Judging Staff Ability = Reasonable,
 * Negotiating = Unsuited, Tactical Knowledge = Competent,
 * and a single nation-knowledge row: England = Complete.
 */
export const SCOUTING_TAB_OCR_LINES: OcrLine[] = [
  { text: "lan Marshall oo: 28129574) . }\n", confidence: 23 },
  { text: "oo 5 @ Leicester &B England [ET Reputation\n", confidence: 57 },
  { text: "cout an\n", confidence: 69 },
  { text: "4s Local\n", confidence: 75 },
  { text: "v Scout Wo@as £600 p/w 30/6/2028 ws\n", confidence: 54 },
  { text: "b SS ENG 67 years old (17/6/1958)\n", confidence: 56 },
  { text: "\\ ]\n", confidence: 74 },
  { text: ")\n", confidence: 0 },
  { text: "( Overview Personal Career\n", confidence: 79 },
  { text: "4 Ne —\n", confidence: 12 },
  { text: "& Preferred Jobs Managerial Coaching Medical Rael\n", confidence: 65 },
  { text: "Fairly Determined\n", confidence: 96 },
  { text: "®  5%scout\n", confidence: 24 },
  { text: "Scouting Attributes Ability Mental Attributes Ability Scouting Knowledge\n", confidence: 95 },
  { text: "QO 5% Director of Football\n", confidence: 71 },
  { text: "Analysing Dat Unsuited | Ac tabili Outstandi\n", confidence: 79 },
  { text: "O 2 Technical Director nalysing Data nsuite laptability utstanding Notion eomtodon\n", confidence: 48 },
  { text: "pa Authority Unsuited\n", confidence: 78 },
  { text: "Q 5% Head of Youth Development .\n", confidence: 74 },
  { text: "~ . Determination Very Good 22 England Zs Complete\n", confidence: 59 },
  { text: "QO 5% Recruitment Analyst\n", confidence: 65 },
  { text: "~ Motivating Unsuited\n", confidence: 79 },
  { text: "QO £2 Performance Analyst\n", confidence: 64 },
  { text: "Ps People Management Reasonable\n", confidence: 84 },
  { text: "Q 5 Head Performance Analyst\n", confidence: 77 },
  { text: "Knowledge Ability\n", confidence: 96 },
  { text: "Judging Player Ability Very Good\n", confidence: 96 },
  { text: "Judging Player Potential Very Good\n", confidence: 96 },
  { text: "Judging Staff Ability Reasonable\n", confidence: 96 },
  { text: "Negotiating Unsuited\n", confidence: 93 },
  { text: "Tactical Knowledge Competent\n", confidence: 93 },
  { text: "@ Key Attributes\n", confidence: 83 },
];

/**
 * Guido Seerden, Coach, Medical tab (a Coach viewed on the Medical tab —
 * none of these attributes apply to the Coach role, but the name+ID header
 * is a clean, real example for name-parsing tests).
 * Source: sample-screenshots/coach-guido-seerden-medical.png
 */
export const COACH_MEDICAL_TAB_OCR_LINES: OcrLine[] = [
  { text: "Guido Seerden (o: 65036223)\n", confidence: 84 },
  { text: "A Roda JC == Netherlands Contract Reputation\n", confidence: 86 },
  { text: "Coach @ 4% Obscure\n", confidence: 65 },
  { text: "hd Reserves Assistant Manager No Caps £480 p/w 30/6/2026 “\n", confidence: 81 },
  { text: "5 = NED 37 years old (18/5/1988)\n", confidence: 77 },
  { text: ".\n", confidence: 0 },
  { text: ") A\n", confidence: 9 },
  { text: ") ( Overview Personal Career\n", confidence: 76 },
  { text: "4 = —\n", confidence: 30 },
  { text: "P lity\n", confidence: 83 },
  { text: "Sel Preferred Jobs Managerial Coaching Scouting ersondiity\n", confidence: 83 },
  { text: "Balanced\n", confidence: 96 },
  { text: "@® 5% Sports Scientist\n", confidence: 68 },
  { text: "Medical Attributes Ability Mental Attributes Ability\n", confidence: 95 },
  { text: "QO 5% Physio\n\n", confidence: 35 },
  { text: "Physiotherapy Average Adaptability Good\n", confidence: 95 },
  { text: "| Sports Science Reasonable Authority Outstanding\n", confidence: 93 },
  { text: "Determination Competent\n", confidence: 96 },
  { text: "Motivating Good\n", confidence: 96 },
  { text: "People Management Very Good\n\n", confidence: 96 },
  { text: "Knowledge Ability\n", confidence: 95 },
  { text: "Judging Player Ability Good\n", confidence: 95 },
  { text: "Judging Player Potential Good\n", confidence: 96 },
  { text: "Judging Staff Ability Average\n", confidence: 95 },
  { text: "Negotiating Reasonable\n", confidence: 95 },
  { text: "Tactical Knowledge Average\n\n", confidence: 94 },
  { text: "@ Key Attributes\n", confidence: 87 },
];

/**
 * Daniel Behlau, Fitness Coach, Coaching tab. "Fitness Coach" isn't a role
 * this app models, but the Coaching Attributes shown overlap with `coach`'s
 * label set, and the name+ID header is another clean real example.
 * Source: sample-screenshots/fitness-coach-daniel-behlau-coaching.png
 *
 * On screen: Attacking = Reasonable, Defending = Competent, Fitness =
 * Outstanding, Goalkeeping = Unsuited, Possession = Competent, Set Pieces =
 * Reasonable, Tactical = Competent, Technical = Competent, Authority = Good,
 * Determination = Good, Motivating = Good.
 */
export const COACHING_TAB_OCR_LINES: OcrLine[] = [
  { text: "Daniel Behlau ap: 92006543) I\n", confidence: 66 },
  { text: "A Fitness Coach B RB Leipzig w= Germany Contract Reputation\n", confidence: 72 },
  { text: "4% Regional\n", confidence: 75 },
  { text: "( ~ Fitness Coach No Caps £3.3K p/w 30/6/2027 us Reg\n", confidence: 69 },
  { text: "ls == GER 36 years old (24/8/1988)\n", confidence: 82 },
  { text: ") 3 Overview Personal Career\n", confidence: 61 },
  { text: "Sel Preferred Jobs Managerial Scouting Medical Coaching Info\n", confidence: 95 },
  { text: "(® 5% Fitness Coach Personality\n", confidence: 58 },
  { text: "Coaching Attributes Ability Mental Attributes Ability Erato]\n", confidence: 79 },
  { text: "QO 5% Loan Manager rofessional\n", confidence: 80 },
  { text: "QO 5% Assistant Manager Suscing zg Talis CR Spill Competent Preferred Formations\n", confidence: 54 },
  { text: "O couch Defending Competent Authority Good £ 4-2-31DM AM Wide\n", confidence: 79 },
  { text: "“uy Coacl\n", confidence: 30 },
  { text: "Py Fitness Outstanding Determination Good o 4-4-112DM\n", confidence: 71 },
  { text: "QO 5% Head of Youth Development\n", confidence: 83 },
  { text: "- . Goalkeeping Unsuited Motivating Good Tactical Style\n", confidence: 74 },
  { text: "QO 4% Goalkeeping Coach ——\n", confidence: 54 },
  { text: "—~ Possession Competent People Management Good ¥\n", confidence: 79 },
  { text: "Q 5% setPiece Coach ne\n", confidence: 58 },
  { text: "i Coaching Qualification\n", confidence: 88 },
  { text: "Set Pieces Reasonable Knowledge Ability . .\n", confidence: 59 },
  { text: "Continental Pro Licence\n", confidence: 95 },
  { text: "Tactical Competent Judging Player Ability Competent\n", confidence: 93 },
  { text: "5 Set Piece Tendencies\n", confidence: 75 },
  { text: "Technical Competent Judging Player Potential Competent\n", confidence: 86 },
  { text: "Working With Youngsters Very Good Judging Staff Ability Competent Delivery\n", confidence: 94 },
  { text: "Inswinging\n", confidence: 90 },
  { text: "Negotiating Good\n", confidence: 96 },
  { text: "Defending Posts\n", confidence: 95 },
  { text: "Tactical Knowledge Good\n", confidence: 96 },
  { text: "Near Post\n", confidence: 96 },
  { text: "Aim For\n", confidence: 96 },
  { text: "@ Key Attributes Near Post\n", confidence: 84 },
];

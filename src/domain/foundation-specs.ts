import { z } from "zod";

// ── Foundation page: mechanism & recognition (foundation.json) ──────────────

export const StatItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  detail: z.string(),
});

export const TimelineEntrySchema = z.object({
  year: z.string(),
  title: z.string(),
  text: z.string(),
});

export const OriginSchema = z.object({
  title: z.string(),
  intro: z.string(),
  timeline: z.array(TimelineEntrySchema),
});

export const AreasNoteSchema = z.object({
  title: z.string(),
  text: z.string(),
  link: z.string(),
});

export const MechanismStepSchema = z.object({
  step: z.string(),
  title: z.string(),
  text: z.string(),
});

export const FundCardSchema = z.object({
  name: z.string(),
  role: z.string(),
  fy: z.string(),
  allTime: z.string(),
  note: z.string(),
});

export const GrantTypeSchema = z.object({
  name: z.string(),
  size: z.string(),
  match: z.string(),
  text: z.string(),
});

export const MechanismSchema = z.object({
  title: z.string(),
  intro: z.string(),
  steps: z.array(MechanismStepSchema),
  funds: z.array(FundCardSchema),
  grantTypes: z.array(GrantTypeSchema),
  shareExample: z.string(),
});

export const PhfRowSchema = z.object({
  amount: z.string(),
  recognition: z.string(),
});

export const SocietySchema = z.object({
  name: z.string(),
  requirement: z.string(),
  note: z.string(),
});

export const AksCircleSchema = z.object({
  circle: z.string(),
  range: z.string(),
});

export const RecognitionSchema = z.object({
  title: z.string(),
  intro: z.string(),
  phfRows: z.array(PhfRowSchema),
  phfNote: z.string(),
  societies: z.array(SocietySchema),
  aksCircles: z.array(AksCircleSchema),
  aksNote: z.string(),
});

export const PointsEarningSchema = z.object({
  label: z.string(),
  text: z.string(),
});

export const ClubRecognitionItemSchema = z.object({
  name: z.string(),
  requirement: z.string(),
  note: z.string(),
});

export const PointsSchema = z.object({
  title: z.string(),
  intro: z.string(),
  earning: z.array(PointsEarningSchema),
  ownership: z.string(),
  transferRules: z.array(z.string()),
  strategy: z.object({
    title: z.string(),
    items: z.array(z.string()),
  }),
  recognitionAmount: z.string(),
  clubRecognition: z.object({
    title: z.string(),
    items: z.array(ClubRecognitionItemSchema),
  }),
});

export const FoundationPageDataSchema = z.object({
  pageTitle: z.string(),
  pageSubtitle: z.string(),
  stats: z.array(StatItemSchema).min(6),
  origin: OriginSchema,
  areasNote: AreasNoteSchema,
  mechanism: MechanismSchema,
  recognition: RecognitionSchema,
  points: PointsSchema,
});

export type FoundationPageData = z.infer<typeof FoundationPageDataSchema>;

export function parseFoundationPageData(raw: unknown): FoundationPageData {
  return FoundationPageDataSchema.parse(raw);
}

// ── Foundation page: impact & funders (foundation-impact.json) ──────────────

export const TopCountrySchema = z.object({
  rank: z.number(),
  country: z.string(),
  total: z.string(),
  perCapita: z.string(),
});

export const NamedDonorSchema = z.object({
  name: z.string(),
  detail: z.string(),
});

export const GivingClubRowSchema = z.object({
  rank: z.number(),
  club: z.string(),
  total: z.string().optional(),
  amount: z.string().optional(),
  chartered: z.string().optional(),
  own: z.boolean().optional(),
});

export const DistrictClubsSchema = z.object({
  title: z.string(),
  intro: z.string(),
  note: z.string(),
  rows: z.array(GivingClubRowSchema).length(5),
});

export const LastDanceSchema = z.object({
  title: z.string(),
  intro: z.string(),
  note: z.string(),
  rows: z.array(GivingClubRowSchema).length(20),
});

export const HeritageSchema = z.object({
  title: z.string(),
  intro: z.string(),
  note: z.string(),
  clubs: z.array(GivingClubRowSchema).length(14),
});

export const LegacyStorySchema = z.object({
  title: z.string(),
  text: z.string(),
});

export const FundersSchema = z.object({
  title: z.string(),
  globalIntro: z.string(),
  topCountries: z.array(TopCountrySchema),
  countriesNote: z.string(),
  gates: z.object({ title: z.string(), text: z.string() }),
  donorBase: z.object({ title: z.string(), text: z.string() }),
  districtTitle: z.string(),
  districtIntro: z.string(),
  districtNamed: z.array(NamedDonorSchema),
  districtClubs: DistrictClubsSchema,
  lastDance: LastDanceSchema,
  heritage: HeritageSchema,
  legacyStory: LegacyStorySchema,
  districtAggregate: z.array(z.string()),
});

export const PolioNumberSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const CaseBarSchema = z.object({
  year: z.string(),
  cases: z.string(),
});

export const PolioSchema = z.object({
  title: z.string(),
  intro: z.string(),
  numbers: z.array(PolioNumberSchema),
  caseBars: z.array(CaseBarSchema).min(3),
  caseNote: z.string(),
  kenyaTitle: z.string(),
  kenya: z.array(z.string()),
});

export const AchievementSchema = z.object({
  title: z.string(),
  year: z.string(),
  detail: z.string(),
});

export const ClubSchema = z.object({
  title: z.string(),
  intro: z.string(),
  items: z.array(z.string()),
});

export const SourceItemSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export const SourcesSchema = z.object({
  title: z.string(),
  intro: z.string(),
  items: z.array(SourceItemSchema),
});

export const FoundationImpactDataSchema = z.object({
  funders: FundersSchema,
  polio: PolioSchema,
  achievementsGlobal: z.array(AchievementSchema).length(15),
  achievementsDistrict: z.array(AchievementSchema).length(15),
  club: ClubSchema,
  sources: SourcesSchema,
});

export type FoundationImpactData = z.infer<typeof FoundationImpactDataSchema>;

export function parseFoundationImpactData(raw: unknown): FoundationImpactData {
  return FoundationImpactDataSchema.parse(raw);
}

import { z } from "zod";

// Zod schemas for the About page content structures
export const FourWayTestItemSchema = z.object({
  id: z.number(),
  question: z.string(),
  description: z.string(),
});

export const AvenueOfServiceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
});

export const AreaOfFocusItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
});

export const FoundationFactsSchema = z.object({
  totalContributed: z.string(),
  description: z.string(),
  peaceFellowshipYears: z.string(),
  peaceFellowsCount: z.string(),
  peaceFellowsCost: z.string(),
});

export const PolioEradicationSchema = z.object({
  topPriority: z.string(),
  casesDroppedPercentage: z.string(),
  challengeGoal: z.string(),
  gatesFoundationGrant: z.string(),
  partners: z.array(z.string()),
});

export const RotaryNumbersSchema = z.object({
  membersCount: z.string(),
  clubsCount: z.string(),
  interactCount: z.string(),
  rotaractCount: z.string(),
  rccCount: z.string(),
  districtsCount: z.string(),
  zonesCount: z.string(),
});

export const GlossaryInsightSchema = z.object({
  overview: z.string(),
  keyFacts: z.array(z.string()),
  whyItMatters: z.string(),
  districtConnection: z.string(),
  tip: z.string(),
});

export const GlossaryItemSchema = z.object({
  term: z.string(),
  definition: z.string(),
  icon: z.string().optional(),
  insight: GlossaryInsightSchema.optional(),
});

// The master schema for the About Page data ledger
export const AboutPageDataSchema = z.object({
  welcomeTitle: z.string(),
  welcomeMessage: z.string(),
  fourWayTestTitle: z.string(),
  fourWayTestIntro: z.string(),
  fourWayTest: z.array(FourWayTestItemSchema),
  avenuesOfServiceTitle: z.string(),
  avenuesOfServiceIntro: z.string(),
  avenuesOfService: z.array(AvenueOfServiceItemSchema),
  areasOfFocusTitle: z.string(),
  areasOfFocus: z.array(AreaOfFocusItemSchema),
  foundationFacts: FoundationFactsSchema,
  polioEradication: PolioEradicationSchema,
  numbers: RotaryNumbersSchema,
  glossaryTitle: z.string(),
  glossary: z.array(GlossaryItemSchema),
});

export type AboutPageData = z.infer<typeof AboutPageDataSchema>;

/**
 * Validates raw JSON content against the About Page specifications.
 * Ensures the value boundary is strictly upheld at the Edge.
 */
export function parseAboutPageData(raw: unknown): AboutPageData {
  return AboutPageDataSchema.parse(raw);
}

import { z } from "zod";

// Zod schemas for the RI History page components
export const MottoHistorySchema = z.object({
  sheldonMotto: z.string(),
  sheldonMottoDescription: z.string(),
  sheldonSpeech: z.string(),
  collinsMotto: z.string(),
  collinsStory: z.string(),
  formalization1950: z.string(),
  legislation1989: z.string(),
});

export const FourWayTestHistorySchema = z.object({
  creatorInfo: z.string(),
  detailedStory: z.array(z.string()),
});

export const BellHistorySchema = z.object({
  origin1922: z.string(),
  symbolism: z.string(),
  gavelSymbolism: z.string(),
});

export const HistoryImagesSchema = z.object({
  bannersImage: z.string(),
  bellImage: z.string(),
  mottoImage: z.string(),
});

// Master RI History schema
export const RiHistorySchema = z.object({
  pageTitle: z.string(),
  pageSubtitle: z.string(),
  mottosTitle: z.string(),
  mottos: MottoHistorySchema,
  fourWayTestHistoryTitle: z.string(),
  fourWayTest: FourWayTestHistorySchema,
  bellHistoryTitle: z.string(),
  bell: BellHistorySchema,
  images: HistoryImagesSchema,
});

export type RiHistory = z.infer<typeof RiHistorySchema>;

/**
 * Validates raw JSON content against the RI History schema.
 * Ensures the value boundary is strictly upheld at the Edge.
 */
export function parseRiHistory(raw: unknown): RiHistory {
  return RiHistorySchema.parse(raw);
}

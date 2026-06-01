import { z } from "zod";

// Zod schemas for the RCNS profile page structures
export const ClubHistorySchema = z.object({
  charterText: z.string(),
  notableMembersText: z.string(),
  districtsText: z.string(),
  successText: z.string(),
});

export const ClubAwardItemSchema = z.object({
  title: z.string(),
  period: z.string(),
  description: z.string(),
});

export const YouthProgramSchema = z.object({
  babyClubsText: z.string(),
  programsText: z.string(),
  rotaractText: z.string(),
  interactText: z.string(),
});

export const ClubMemberItemSchema = z.object({
  name: z.string(),
  role: z.string(), // "President", "President Elect", "Vice President", "IPP", "Active Member"
});

// Master RCNS Profile schema
export const RcnsProfileSchema = z.object({
  welcomeTitle: z.string(),
  charterBadge: z.string(),
  history: ClubHistorySchema,
  awardsTitle: z.string(),
  awards: z.array(ClubAwardItemSchema),
  newGenerationsTitle: z.string(),
  newGenerations: YouthProgramSchema,
  membersTitle: z.string(),
  members: z.array(ClubMemberItemSchema),
});

export type RcnsProfile = z.infer<typeof RcnsProfileSchema>;

/**
 * Validates raw JSON content against the RCNS profile schema.
 * Ensures the value boundary is strictly upheld at the Edge.
 */
export function parseRcnsProfile(raw: unknown): RcnsProfile {
  return RcnsProfileSchema.parse(raw);
}

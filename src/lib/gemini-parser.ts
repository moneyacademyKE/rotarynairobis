import { z } from "zod";

/**
 * Gemini Classification Spec
 * 
 * This schema represents the strict "Value" boundary of our vision analysis.
 * It enforces that every asset identified by the AI matches our internal 
 * category system before it can enter the Epochal database.
 */
export const ClassificationSchema = z.object({
  type: z.enum(["EVENT_POSTER", "BIRTHDAY", "EVENT_RECAP", "PHOTO"]),
  snippet: z.string().describe("A concise summary or caption of the asset content."),
});

export type Classification = z.infer<typeof ClassificationSchema>;

/**
 * Pure function to parse raw AI text into a validated Classification Value.
 * De-complects the "Analysis" (AI) from the "Entity" (State).
 */
export function parseGeminiResponse(rawText: string): Classification {
  try {
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);
    return ClassificationSchema.parse(parsed);
  } catch (e) {
    throw new Error(`Failed to parse AI response into valid Classification: ${e instanceof Error ? e.message : String(e)}`);
  }
}

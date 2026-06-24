import { z } from "zod";

/**
 * Gemini Classification Spec
 *
 * This schema represents the strict "Value" boundary of our vision analysis.
 * It enforces that every asset identified by the AI matches our internal
 * category system before it can enter the Epochal database.
 *
 * Primary path: the model is configured with `responseMimeType: "application/json"`
 * and `responseSchema`, so it emits clean JSON directly — no markdown fences.
 * The strip below is a defensive fallback only.
 */
export const ClassificationSchema = z.object({
  type: z.enum(["EVENT_POSTER", "BIRTHDAY", "EVENT_RECAP", "PHOTO"]),
  snippet: z.string().describe("A concise summary, event sentence, or scene description."),
});

export type Classification = z.infer<typeof ClassificationSchema>;

/**
 * Pure function to parse raw AI text into a validated Classification Value.
 * De-complects the "Analysis" (AI) from the "Entity" (State).
 *
 * With structured output enabled the model returns bare JSON.
 * The markdown strip handles any edge-case where a wrapper leaks through.
 */
export function parseGeminiResponse(rawText: string): Classification {
  try {
    // Primary: bare JSON from structured output mode.
    // Fallback: strip markdown fences in case of unexpected wrapping.
    const cleanText = rawText.replace(/```json\s*|```/g, "").trim();
    const parsed = JSON.parse(cleanText);
    return ClassificationSchema.parse(parsed);
  } catch (e) {
    throw new Error(
      `Failed to parse AI response into valid Classification: ${
        e instanceof Error ? e.message : String(e)
      }\nRaw text: ${rawText.slice(0, 200)}`
    );
  }
}

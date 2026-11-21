import { GoogleGenerativeAI } from "@google/generative-ai";
import { CLASSIFICATION_PROMPT, GENERATION_CONFIG } from "./classification-prompt";

/**
 * Classification client: main path (Inferhub, OpenAI-compatible) with the
 * original Google Gemini path kept as fallback. Both paths return raw text
 * that parseGeminiResponse validates — the Value boundary never changes.
 */

export const DEFAULT_MAIN_MODEL = "ag/gemini-3.8-flash-high";
export const DEFAULT_INFERSHUB_BASE_URL = "https://api.inferhub.dev/v1";
export const FALLBACK_MODEL = "gemini-3.1-flash-lite-preview";

/** OpenRouter Decisions API (System One): typed choice, no text generation. */
export const DEFAULT_OPENROUTER_MODEL = "perplexity/pplx-decider-v1.3:free";
export const OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
export const MEDIA_TYPES = ["EVENT_POSTER", "BIRTHDAY", "EVENT_RECAP", "PHOTO"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export interface ClassifyEnv {
  INFERSHUB_API_KEY?: string;
  INFERSHUB_BASE_URL?: string;
  CLASSIFY_MODEL_MAIN?: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
}

/** Single source of truth for the decision criteria (shared with the smoke tool). */
export const CLASSIFY_INSTRUCTIONS =
  "Classify this Rotary Club of Nairobi South image into EXACTLY ONE category. " +
  "If a designed graphic is the focal point, never choose PHOTO. " +
  "Poster vs recap: a FUTURE date means EVENT_POSTER, a PAST date means EVENT_RECAP. " +
  "BIRTHDAY celebrates a specific individual's personal milestone; EVENT_RECAP celebrates a club/group achievement. " +
  "If the image is too blurry/dark to read, choose PHOTO.";

export const CLASSIFY_CRITERIA: Record<MediaType, string> = {
  EVENT_POSTER:
    "Forward-looking graphic inviting/announcing an upcoming activity: Join us, Register, RSVP, a future date, speaker+topic, agenda, tickets.",
  BIRTHDAY:
    "Graphic celebrating a specific member's personal milestone: Happy Birthday, Many Happy Returns, a member name/photo with cake/balloons/confetti, or a personal anniversary tribute.",
  EVENT_RECAP:
    "Backward-looking graphic celebrating/reporting something already done: Thank you, Highlights, photo collages of a concluded event, award/certificate presentations, fundraising leaderboards, district rankings, results tables.",
  PHOTO:
    "Candid/documentary photography: real people talking, eating, working on a project, group shots, fellowship. No designed graphic dominates.",
};

const JSON_CONTRACT =
  '\n\nRespond with ONLY a JSON object of shape {"type": "EVENT_POSTER" | "BIRTHDAY" | "EVENT_RECAP" | "PHOTO", "snippet": "string"}. No markdown fences, no extra text.';

export async function classifyWithInferhub(
  env: ClassifyEnv,
  base64: string,
  mimeType: string,
): Promise<string> {
  const baseUrl = (env.INFERSHUB_BASE_URL ?? DEFAULT_INFERSHUB_BASE_URL).replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.INFERSHUB_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.CLASSIFY_MODEL_MAIN ?? DEFAULT_MAIN_MODEL,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: CLASSIFICATION_PROMPT + JSON_CONTRACT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = new Error(
      `inferhub classify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("inferhub classify returned empty content");
  return text;
}

export async function classifyWithGemini(
  env: ClassifyEnv,
  base64: string,
  mimeType: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: FALLBACK_MODEL,
    generationConfig: GENERATION_CONFIG,
  });
  const result = await model.generateContent([
    CLASSIFICATION_PROMPT,
    { inlineData: { data: base64, mimeType } },
  ]);
  return result.response.text();
}

/**
 * OpenRouter Decisions path: a typed `choice` question over the image.
 * Returns the winning category + calibrated confidence. No text is generated
 * (decision models don't write), so the snippet is supplied by the caller.
 */
export async function decideImageType(
  env: ClassifyEnv,
  base64: string,
  mimeType: string,
): Promise<{ type: MediaType; confidence: number }> {
  const res = await fetch(OPENROUTER_DECISIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
      state: [{ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }],
      questions: {
        category: {
          type: "choice",
          instructions: CLASSIFY_INSTRUCTIONS,
          criteria: CLASSIFY_CRITERIA,
        },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const err = new Error(
      `openrouter decisions HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    answers?: { category?: { choice?: string; confidence?: number } };
  };
  const choice = data.answers?.category?.choice;
  if (!choice || !(MEDIA_TYPES as readonly string[]).includes(choice)) {
    throw new Error(`openrouter decisions returned invalid choice: ${String(choice)}`);
  }
  return { type: choice as MediaType, confidence: Number(data.answers?.category?.confidence ?? 0) };
}

/**
 * OpenRouter main path. Emits the same {type, snippet} JSON the Value boundary
 * (parseGeminiResponse) already validates. The snippet comes from the post
 * caption (snippetHint) — decision models produce no text of their own.
 */
export async function classifyWithOpenRouter(
  env: ClassifyEnv,
  base64: string,
  mimeType: string,
  snippetHint?: string,
): Promise<string> {
  const { type } = await decideImageType(env, base64, mimeType);
  const hint = (snippetHint ?? "").trim();
  const snippet = hint ? hint.slice(0, 120) : "Rotary Club of Nairobi South fellowship event";
  return JSON.stringify({ type, snippet });
}

export async function classifyImage(
  base64: string,
  mimeType: string,
  env: ClassifyEnv,
  impls: {
    main: typeof classifyWithInferhub;
    fallback: typeof classifyWithGemini;
    openrouter?: typeof classifyWithOpenRouter;
  } = { main: classifyWithInferhub, fallback: classifyWithGemini },
  snippetHint?: string,
): Promise<string> {
  if (env.OPENROUTER_API_KEY) {
    try {
      return await (impls.openrouter ?? classifyWithOpenRouter)(env, base64, mimeType, snippetHint);
    } catch (e) {
      console.error("openrouter decide failed; falling back:", e);
    }
  }
  if (env.INFERSHUB_API_KEY) {
    try {
      return await impls.main(env, base64, mimeType);
    } catch (e) {
      console.error("inferhub classify failed; falling back to Gemini:", e);
    }
  }
  return impls.fallback(env, base64, mimeType);
}

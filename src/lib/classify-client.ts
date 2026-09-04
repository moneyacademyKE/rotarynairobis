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

export interface ClassifyEnv {
  INFERSHUB_API_KEY?: string;
  INFERSHUB_BASE_URL?: string;
  CLASSIFY_MODEL_MAIN?: string;
  GEMINI_API_KEY?: string;
}

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

export async function classifyImage(
  base64: string,
  mimeType: string,
  env: ClassifyEnv,
  impls: {
    main: typeof classifyWithInferhub;
    fallback: typeof classifyWithGemini;
  } = { main: classifyWithInferhub, fallback: classifyWithGemini },
): Promise<string> {
  if (env.INFERSHUB_API_KEY) {
    try {
      return await impls.main(env, base64, mimeType);
    } catch (e) {
      console.error("inferhub classify failed; falling back to Gemini:", e);
    }
  }
  return impls.fallback(env, base64, mimeType);
}

/**
 * Smoke tool: classify one RCNS photo through the OpenRouter Decisions API
 * (perplexity/pplx-decider-v1.3:free). Reads OPENROUTER_API_KEY from .env.sh
 * at runtime (never printed). Uses the SAME criteria/instructions as the
 * production adapter (src/lib/classify-client.ts) — no drift.
 *
 * Usage: bun local/smoke-openrouter.ts [photoPath]
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLASSIFY_INSTRUCTIONS,
  CLASSIFY_CRITERIA,
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_DECISIONS_URL,
} from "../src/lib/classify-client";
import { DEFAULT_LOCAL_ROOT } from "./kv";

const ENVF = join(DEFAULT_LOCAL_ROOT, ".env.sh");
const key = (readFileSync(ENVF, "utf8").match(/OPENROUTER_API_KEY='([^']+)'/) ?? [])[1];
if (!key) { console.error("no OPENROUTER_API_KEY in .env.sh"); process.exit(1); }

const MODEL = process.env.SMOKE_MODEL ?? DEFAULT_OPENROUTER_MODEL;
const photo = process.argv[2] ?? join(DEFAULT_LOCAL_ROOT, "media-cache", "telegram_AQADOhBrG2MpyFN-.jpg");
if (!existsSync(photo)) { console.error("photo missing: " + photo); process.exit(1); }
const base64 = Buffer.from(readFileSync(photo)).toString("base64");

const res = await fetch(OPENROUTER_DECISIONS_URL, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: MODEL,
    state: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } }],
    questions: { category: { type: "choice", instructions: CLASSIFY_INSTRUCTIONS, criteria: CLASSIFY_CRITERIA } },
  }),
  signal: AbortSignal.timeout(90_000),
});
const text = await res.text();
console.log("model:", MODEL, "| photo:", photo.split("/").pop(), "| HTTP", res.status);
if (!res.ok) { console.log(text.slice(0, 800)); process.exit(1); }
console.log("answer:", JSON.stringify(JSON.parse(text).answers?.category, null, 2).slice(0, 1200));
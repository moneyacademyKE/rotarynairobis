import {
  createQwikCity,
} from "@builder.io/qwik-city/middleware/cloudflare-pages";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { drizzle } from "drizzle-orm/d1";
import { media } from "./data/schema";
import { parseGeminiResponse } from "./lib/gemini-parser";

// Consolidating QwikCityPlatform into src/routes/layout.tsx to avoid empty interface errors and achieve architectural single-truth.

const qwikCityFetch = createQwikCity({ render, qwikCityPlan });

const fetch = async (request: Request, env: QwikCityPlatform["env"], ctx: ExecutionContext) => {
  const url = new URL(request.url);
  
  // Media Proxy Bridge: Serve photos from R2 bucket
  if (url.pathname.startsWith('/photos/')) {
    const fileName = url.pathname.replace('/photos/', '');
    const object = await env.PHOTOS.get(fileName);
    
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      
      return new Response(object.body, { headers });
    }
    
    return new Response('Media Not Found', { status: 404 });
  }

  return qwikCityFetch(request, env as any, ctx);
};


export const queue = async (batch: any, env: any) => {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
  const db = drizzle(env.DB);

  const PROMPT = `You are an elite AI visual classifier and metadata extractor for the Rotary Club of Nairobi South.
Analyze the provided image and classify it into one of four exclusive categories:

1. EVENT_POSTER: An upcoming event announcement flyer, calendar, or registration invite. Typically has a title, date, time, venue, or speaker.
2. BIRTHDAY: A graphic specifically celebrating a member's birthday or anniversary, explicitly mentioning "Birthday" or "Happy Birthday".
3. EVENT_RECAP: A retrospective graphic summarizing a past meeting, project, or event (e.g., photo collage, "Thank You", "Moments", "Highlights" banners). Not an upcoming invitation.
4. PHOTO: Raw, unedited, or non-designed photographic captures of people, fellowship meetings, projects, or actual activities. No heavy designed graphics overlay.

Extraction Rule for "snippet":
- If it is EVENT_POSTER: Generate a complete, natural event description sentence using the following fluid templates (do not truncate):
  - If there is a speaker and a topic: "The Rotary Club of <Club Name> will be hosting <Speaker Name> to present on '<Topic>' at <Venue> from <Time> on <DayOfWeek, Month Day, Year>."
  - If there is a speaker but no topic: "The Rotary Club of <Club Name> will be hosting <Speaker Name> at <Venue> from <Time> on <DayOfWeek, Month Day, Year>."
  - If there is no speaker but a topic (e.g., club assemblies, movie nights, fellowship meetings): "The Rotary Club of <Club Name> will be hosting the '<Topic>' event at <Venue> from <Time> on <DayOfWeek, Month Day, Year>."
  - If there is no speaker and no topic: "The Rotary Club of <Club Name> invites you to a fellowship gathering at <Venue> from <Time> on <DayOfWeek, Month Day, Year>."
  - Resolve the weekday prefix of the date (e.g. "Friday" for "February 20, 2026"). If a detail like venue is missing, use "our fellowship venue" or fallback to what is readable on the image. If time is missing, use "6:00 PM".
- If it is BIRTHDAY, EVENT_RECAP, or PHOTO: Write a concise text description or celebration message (max 120 chars).

You MUST return a strict, minified JSON object with no markdown block formatting:
{
  "type": "EVENT_POSTER" | "BIRTHDAY" | "EVENT_RECAP" | "PHOTO",
  "snippet": "concise text or description"
}`;

  for (const message of batch.messages) {
    const { fileName, imageUrl } = message.body;

    try {
      const res = await globalThis.fetch(imageUrl);
      if (!res.ok) throw new Error("Image not accessible");
      
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const chunks = [];
      for (let i = 0; i < bytes.length; i += 8192) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
      }
      const base64String = btoa(chunks.join(''));

      const result = await model.generateContent([
        PROMPT,
        { inlineData: { data: base64String, mimeType: "image/jpeg" } }
      ]);
      const rawText = result.response.text();
      const parsed = parseGeminiResponse(rawText);

      // 1. Persist to Epochal D1 Ledger (Strict TypeScript Drizzle)
      await db.insert(media).values({
        fileName: fileName,
        type: parsed.type,
        snippet: parsed.snippet,
        rawData: rawText
      });

      message.ack();
    } catch (e) {
      console.error("Queue Classification Error:", e);
      const attempts = message.attempts || 0;
      if (attempts > 3) {
        console.error(`Message for ${fileName} exceeded max retries (${attempts}). Acknowledging and dropping.`);
        message.ack();
      } else {
        const delaySeconds = Math.min(30 * Math.pow(2, attempts), 300);
        message.retry({ delaySeconds });
      }
    }
  }
};

export default {
  fetch,
  queue
};

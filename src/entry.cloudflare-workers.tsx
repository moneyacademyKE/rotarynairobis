import {
  createQwikCity,
} from "@builder.io/qwik-city/middleware/cloudflare-pages";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { drizzle } from "drizzle-orm/d1";
import { media } from "./data/schema";
import { parseGeminiResponse } from "./lib/gemini-parser";
import { indexPost } from "./lib/orama-engine";

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
- If the image contains text, extract the main heading, date, speaker, or celebration message (max 120 chars).
- If it is a PHOTO with no readable overlay text, describe the visual scene concisely (e.g., "Members planting trees", "Club assembly group photo") (max 120 chars).

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
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

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

      // 2. Index in Orama (Full-Text Search Boundary)
      await indexPost({
        id: fileName,
        text: parsed.snippet,
        account: "RCNS_SYSTEM", // Originator fact
        type: parsed.type,
        snippet: parsed.snippet
      });

      message.ack();
    } catch (e) {
      console.error("Queue Classification Error:", e);
      message.retry();
    }
  }
};

export default {
  fetch,
  queue
};

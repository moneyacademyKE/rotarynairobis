import {
  createQwikCity,
} from "@builder.io/qwik-city/middleware/cloudflare-pages";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { drizzle } from "drizzle-orm/d1";
import { media } from "./data/schema";
import { parseGeminiResponse } from "./lib/gemini-parser";
import { classifyImage } from "./lib/classify-client";

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
  const db = drizzle(env.DB);

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

      const rawText = await classifyImage(base64String, "image/jpeg", env);
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

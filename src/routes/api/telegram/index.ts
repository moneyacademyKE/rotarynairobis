import type { RequestHandler } from "@builder.io/qwik-city";
import { getFile, getDownloadUrl } from "../../../lib/telegram";

/**
 * Telegram Webhook Ingestion Endpoint (Rich Hickey "Epochal Time" Style)
 */
export const onPost: RequestHandler = async ({ request, platform, json }) => {
  const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  const env = platform.env as any;

  // 1. Security Boundary (Rich Hickey "Spec")
  if (env.TELEGRAM_SECRET_TOKEN && secretToken !== env.TELEGRAM_SECRET_TOKEN) {
    json(401, { error: "Unauthorized" });
    return;
  }

  try {
    const update = await request.json() as any;
    const updateId = update.update_id;

    if (!updateId) {
      json(400, { error: "Invalid update" });
      return;
    }

    // 2. Fact Accretion: Save raw update to ledger (Epochal Time)
    await env.DB.prepare(
      "INSERT OR IGNORE INTO telegram_raw_facts (update_id, raw_json) VALUES (?, ?)"
    ).bind(updateId, JSON.stringify(update)).run();

    // 3. Process Only Channel Posts (Ingestion Only)
    // We handle both new and edited channel posts as distinct facts.
    const message = update.channel_post || update.edited_channel_post;
    if (!message) {
      json(200, { status: "Not a channel post (Ignored)" });
      return;
    }

    const text = message.text || message.caption || "";
    const photos = message.photo;
    
    // As per user request: "no attribution needed"
    const account = null;

    let photosJson = "[]";

    // 4. Media Ingestion (R2 + Queue)
    if (photos && photos.length > 0) {
      const largestPhoto = photos[photos.length - 1];
      const file = await getFile(env.TELEGRAM_BOT_TOKEN, largestPhoto.file_id);
      
      if (file.file_path) {
        const downloadUrl = getDownloadUrl(env.TELEGRAM_BOT_TOKEN, file.file_path);
        const fileName = `telegram_${file.file_unique_id}.jpg`;
        
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const blob = await res.blob();
          await env.PHOTOS.put(fileName, blob, {
            customMetadata: { origin: "telegram", update_id: updateId.toString() }
          });
          
          photosJson = JSON.stringify([fileName]);

          // Push to AI Classification Queue (Gemini will set the category/tab)
          await env.CLASSIFY_QUEUE.send({
            fileName,
            imageUrl: `${new URL(request.url).origin}/photos/${fileName}`
          });
        }
      }
    }

    // 5. Fact Projection: Store message_id as entity identifier in posts_facts
    // New facts for the same message_id will be collapsed in the 'posts' View.
    await env.DB.prepare(
      "INSERT INTO posts (id, text, account, photos_json, hashtags_json) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      message.message_id, 
      text, 
      account, 
      photosJson, 
      "[]"
    ).run();

    json(200, { status: "Success", update_id: updateId });
  } catch (error: any) {
    console.error("Telegram Channel Ingestion Error:", error);
    json(500, { error: error.message });
  }
};

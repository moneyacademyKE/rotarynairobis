import type { RequestHandler } from "@builder.io/qwik-city";
import { getFile, getDownloadUrl } from "../../../lib/telegram";

/**
 * Read-only Webhook Diagnostics.
 *
 * This handler USED to heal: on a URL mismatch it called `setWebhook` with the
 * request's own origin, unauthenticated. The dormant worker is still reachable
 * at its workers.dev URL, so any stray GET — a monitor, a scanner, a curious
 * passer-by — could flip ingestion off the local poller and onto Cloudflare,
 * where nothing consumes it (audit 2026-11-21, finding 2). A GET that mutates
 * the ingestion path is the hazard; deleting the mutation is the fix, and the
 * local poller already resolves a real conflict by deleting the webhook (409
 * path in local/poller.ts).
 *
 * Diagnostics remain, behind the same secret Telegram itself posts with: fail
 * closed if the secret is unconfigured, 401 on a mismatch.
 */
export const onGet: RequestHandler = async ({ request, platform, json }) => {
  const env = platform.env as any;

  if (!env.TELEGRAM_SECRET_TOKEN) {
    json(500, { error: "TELEGRAM_SECRET_TOKEN not configured" });
    return;
  }
  const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secretToken !== env.TELEGRAM_SECRET_TOKEN) {
    json(401, { error: "Unauthorized" });
    return;
  }

  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    json(500, { error: "TELEGRAM_BOT_TOKEN is not configured in environment bindings" });
    return;
  }

  const requestUrl = new URL(request.url);
  const expectedWebhookUrl = `${requestUrl.origin}/api/telegram`;

  // Fetch current webhook info from Telegram
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const info = await infoRes.json() as any;

  // Reporting a mismatch is useful; acting on it belongs to an operator or to
  // the poller, which owns the webhook while the site runs locally.
  const alignment = info.ok && info.result.url === expectedWebhookUrl
    ? "aligned"
    : "not-aligned";

  // Diagnostics count is KV-cached (1h TTL): every uncached hit scans the
  // whole raw-facts table.
  let databaseFactsCount: number | null = null;
  const cachedCount = await env.CACHE?.get("telegram_raw_facts_count");
  if (cachedCount !== null && cachedCount !== undefined) {
    databaseFactsCount = Number(cachedCount);
  } else {
    databaseFactsCount = await env.DB.prepare("SELECT COUNT(*) as count FROM telegram_raw_facts").first("count");
    await env.CACHE?.put("telegram_raw_facts_count", String(databaseFactsCount), { expirationTtl: 3600 });
  }

  json(200, {
    status: "Healthy",
    webhook_alignment: alignment,
    expected_webhook_url: expectedWebhookUrl,
    telegram_webhook_info: info.result,
    database_facts_count: databaseFactsCount
  });
};

/**
 * Telegram Webhook Ingestion Endpoint (Rich Hickey "Epochal Time" Style)
 */
export const onPost: RequestHandler = async ({ request, platform, json }) => {
  const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  const env = platform.env as any;

  // 1. Security Boundary (Rich Hickey "Spec") — fail-closed
  if (!env.TELEGRAM_SECRET_TOKEN) {
    json(500, { error: "TELEGRAM_SECRET_TOKEN not configured" });
    return;
  }
  if (secretToken !== env.TELEGRAM_SECRET_TOKEN) {
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
        const fileName = `telegram_${file.file_unique_id}.jpg`;

        // Warm the /photos/ bridge at ingest: we already hold both halves of
        // the mapping (file_unique_id, file_id), so the first request for this
        // photo never pays the D1 raw_json LIKE scan. Same key shape the
        // bridge uses; failures here are harmless (bridge falls back to D1).
        await env.CACHE?.put(`tg:id:${file.file_unique_id}`, largestPhoto.file_id, { expirationTtl: 7 * 24 * 3600 }).catch(() => {});

        // R2 put is optional: while the binding is absent (R2 suspension),
        // the /photos/ bridge serves the same bytes from Telegram's CDN,
        // so ingestion and classification continue uninterrupted.
        if (env.PHOTOS) {
          const downloadUrl = getDownloadUrl(env.TELEGRAM_BOT_TOKEN, file.file_path);
          const res = await fetch(downloadUrl);
          if (res.ok) {
            const blob = await res.blob();
            await env.PHOTOS.put(fileName, blob, {
              customMetadata: { origin: "telegram", update_id: updateId.toString() }
            });
          }
        }

        photosJson = JSON.stringify([fileName]);

        // Push to AI Classification Queue (Gemini will set the category/tab)
        await env.CLASSIFY_QUEUE.send({
          fileName,
          imageUrl: `${new URL(request.url).origin}/photos/${fileName}`
        });
      }
    }

    // 5. Fact Projection: Store message_id as entity identifier in posts_facts
    // If this is a reply to an existing message (e.g. caption posted as a reply),
    // merge the text fact into the parent post entity to prevent split records.
    let targetPostId = message.message_id;
    let finalPhotosJson = photosJson;

    if (message.reply_to_message && text) {
      const parentMessageId = message.reply_to_message.message_id;
      try {
        // The posts view is absent in some deployed schema generations; a
        // failed lookup must not 500 the webhook (Telegram would retry and
        // re-ingest the same update forever).
        const parentPost = await env.DB.prepare(
          "SELECT text, photos_json FROM posts WHERE id = ?"
        ).bind(parentMessageId).first() as { text?: string | null; photos_json?: string } | null;

        // Merge ONLY into a photo-only parent. A reply to a post that already
        // has text is its own record — overwriting the parent would destroy
        // the original caption (the posts view resolves latest-fact-wins).
        const parentHasText = typeof parentPost?.text === "string" && parentPost.text.trim() !== "";
        if (parentPost && !parentHasText) {
          targetPostId = parentMessageId;
          finalPhotosJson = parentPost.photos_json || "[]";
        }
      } catch {
        // Fall through: the fact is still stored under its own message_id.
      }
    }

    await env.DB.prepare(
      `INSERT OR REPLACE INTO posts_facts (id, text, account, photos_json, hashtags_json) VALUES (?, ?, ?, ?, ?)`
    ).bind(
      targetPostId, 
      text, 
      account, 
      finalPhotosJson, 
      "[]"
    ).run();

    json(200, { status: "Success", update_id: updateId });
  } catch (error: any) {
    console.error("Telegram Channel Ingestion Error:", error);
    json(500, { error: error.message });
  }
};

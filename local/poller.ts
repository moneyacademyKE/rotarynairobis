/**
 * Local Telegram poller — replaces the worker webhook at cutover.
 *
 * Faithful port of src/routes/api/telegram/index.ts onPost: raw-fact
 * dedupe by update_id, channel_post/edited_channel_post only, the
 * LARGEST photo size per post, reply-merge into photo-only parents,
 * tg:id KV warm at ingest, classification job enqueue. Differences are
 * deliberate and named:
 *   - parent lookup: posts_facts ORDER BY tx_id DESC LIMIT 1 instead of
 *     the `posts` view — identical latest-fact-wins semantics, and the
 *     local schema intentionally has no views.
 *   - INSERT OR REPLACE → plain INSERT: tx_id never conflicts, so the
 *     REPLACE arm was unreachable on the webhook too.
 *   - R2 put / queue URL → local disk download / local job row.
 *
 * getUpdates with a persisted offset watermark. All Telegram effects are
 * injected (PollerDeps) so tests run without network or a token.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SqliteStore, DEFAULT_DB_PATH, openStore } from "./sqlite-store";
import { enqueueJob, MEDIA_CACHE_DIR } from "./classify";
import { fileKvFor } from "./kv";
import { telegramRead } from "./telegram-read";

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_path?: string;
}

export interface PollerDeps {
  fetchUpdates: (token: string, offset: number) => Promise<{ ok: boolean; result?: unknown[]; description?: string }>;
  getFile: (token: string, fileId: string) => Promise<TelegramFile>;
  downloadPhoto: (token: string, filePath: string, destPath: string) => Promise<void>;
  kvPut: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  /** Optional: when present, a webhook conflict is self-healed by deleting it. */
  deleteWebhook?: (token: string) => Promise<{ ok: boolean }>;
}

export interface IngestResult {
  updateId: number;
  stored: boolean;
  reason?: string;
  photoFile?: string;
  jobId?: number | null;
}

export interface PollReport {
  at: string;
  offset: number;
  polled: number;
  newPosts: number;
  newPhotos: number;
  results: IngestResult[];
}

/** Port of the webhook's POST handler — one update → facts (+ photo + job). */
export async function ingestUpdate(
  store: SqliteStore,
  update: Record<string, unknown>,
  token: string,
  deps: PollerDeps,
  mediaCacheDir: string = MEDIA_CACHE_DIR,
): Promise<IngestResult> {
  const updateId = Number(update.update_id ?? 0);
  if (!updateId) return { updateId: 0, stored: false, reason: "invalid-update" };

  // Raw fact accretion with update_id dedupe (webhook: INSERT OR IGNORE).
  store.db
    .prepare("INSERT OR IGNORE INTO telegram_raw_facts (update_id, raw_json) VALUES (?, ?)")
    .run(updateId, JSON.stringify(update));

  const message = (update.channel_post ?? update.edited_channel_post) as
    | { message_id: number; text?: string; caption?: string; photo?: Array<{ file_id: string; file_unique_id: string }>; reply_to_message?: { message_id: number } }
    | undefined;
  if (!message) return { updateId, stored: true, reason: "not-channel-post" };

  const text = message.text || message.caption || "";
  const account = null; // "no attribution needed" — same as the webhook
  let photosJson = "[]";
  let photoFile: string | undefined;

  const photos = message.photo;
  if (photos && photos.length > 0) {
    const largest = photos[photos.length - 1];
    const file = await deps.getFile(token, largest.file_id);
    if (file.file_path) {
      const fileName = `telegram_${file.file_unique_id}.jpg`;
      // Warm the /photos/ bridge mapping at ingest (same key + TTL as the webhook).
      await deps.kvPut(`tg:id:${file.file_unique_id}`, largest.file_id, 7 * 24 * 3600).catch(() => {});
      // Local equivalent of the optional R2 put: bytes on disk.
      const dest = join(mediaCacheDir, fileName);
      await deps.downloadPhoto(token, file.file_path, dest).catch(() => {});
      photosJson = JSON.stringify([fileName]);
      photoFile = fileName;
    }
  }

  // Reply-merge: only into a photo-only parent (latest fact for that id).
  let targetPostId = message.message_id;
  let finalPhotosJson = photosJson;
  if (message.reply_to_message && text) {
    const parentId = message.reply_to_message.message_id;
    const parent = store.db
      .prepare("SELECT text, photos_json FROM posts_facts WHERE id = ? ORDER BY tx_id DESC LIMIT 1")
      .get(parentId) as { text?: string | null; photos_json?: string } | null;
    const parentHasText = typeof parent?.text === "string" && parent.text.trim() !== "";
    if (parent && !parentHasText) {
      targetPostId = parentId;
      finalPhotosJson = parent.photos_json || "[]";
    }
  }

  store.db
    .prepare("INSERT INTO posts_facts (id, text, account, photos_json, hashtags_json) VALUES (?, ?, ?, ?, ?)")
    .run(targetPostId, text, account, finalPhotosJson, "[]");

  const jobId = photoFile ? enqueueJob(store, photoFile) : null;
  return { updateId, stored: true, photoFile, jobId };
}

/** One getUpdates tick: ingest everything new, advance the offset watermark. */
export async function pollOnce(
  store: SqliteStore,
  token: string,
  deps: PollerDeps,
  mediaCacheDir: string = MEDIA_CACHE_DIR,
): Promise<PollReport> {
  const maxKnown = Number(
    (store.db.prepare("SELECT MAX(update_id) AS m FROM telegram_raw_facts").get() as { m: number | null }).m ?? 0,
  );
  const offset = Number(store.metaGet("tg:offset") ?? maxKnown + 1);
  let res = await deps.fetchUpdates(token, offset);
  if (
    !res.ok &&
    /conflict|webhook is (active|already)/i.test(res.description ?? "") &&
    deps.deleteWebhook
  ) {
    // Post-cutover guard: the CF worker's /api/telegram self-heal can re-arm
    // the webhook (a stray GET re-registers it), which 409s every poll. The
    // poller owns ingestion now — delete the webhook once and retry.
    await deps.deleteWebhook(token).catch(() => {});
    res = await deps.fetchUpdates(token, offset);
  }
  if (!res.ok) throw new Error(`getUpdates failed: ${res.description ?? "unknown"}`);
  const updates = (res.result ?? []) as Array<Record<string, unknown>>;

  const results: IngestResult[] = [];
  let newPosts = 0;
  let newPhotos = 0;
  for (const u of updates) {
    const r = await ingestUpdate(store, u, token, deps, mediaCacheDir);
    results.push(r);
    if (r.stored && !r.reason) newPosts++;
    if (r.photoFile) newPhotos++;
  }
  if (updates.length > 0) {
    const maxId = Math.max(...updates.map((u) => Number(u.update_id ?? 0)));
    store.metaSet("tg:offset", String(maxId + 1));
  }

  return {
    at: new Date().toISOString(),
    offset: Number(store.metaGet("tg:offset") ?? offset),
    polled: updates.length,
    newPosts,
    newPhotos,
    results,
  };
}

/** Real Telegram effects (the DI defaults). */
export function realDeps(): PollerDeps {
  const kv = fileKvFor();
  return {
    fetchUpdates: async (token, offset) => {
      const r = await telegramRead(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=0` +
          `&allowed_updates=${encodeURIComponent('["channel_post","edited_channel_post"]')}`,
      );
      return r.json() as any;
    },
    getFile: async (token, fileId) => {
      const r = await telegramRead(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
      );
      const data = (await r.json()) as any;
      if (!data.ok) throw new Error(`getFile failed: ${data.description}`);
      return data.result as TelegramFile;
    },
    downloadPhoto: async (token, filePath, dest) => {
      mkdirSync(dirname(dest), { recursive: true });
      const r = await telegramRead(`https://api.telegram.org/file/bot${token}/${filePath}`);
      if (!r.ok) throw new Error(`photo download HTTP ${r.status}`);
      writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    },
    kvPut: (key, value, ttl) => kv.put(key, value, { expirationTtl: ttl }),
    deleteWebhook: async (token) => {
      const r = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
      return r.json() as any;
    },
  };
}

if (import.meta.main) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[poll] TELEGRAM_BOT_TOKEN missing (see local/README.md — cutover needs it)");
    process.exit(1);
  }
  const store = openStore(DEFAULT_DB_PATH);
  try {
    console.log(`[poll] ${JSON.stringify(await pollOnce(store, token, realDeps()))}`);
  } finally {
    store.close();
  }
}

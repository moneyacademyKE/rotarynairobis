/**
 * Photo sourcing: R2 when bound, Telegram's file CDN as the resilient fallback.
 *
 * Context: the R2 account was suspended (billing gate), which both 500'd the
 * /photos/ bridge and blocked all deploys (wrangler rejects the binding).
 * Every ingested photo originates from a Telegram channel post whose full
 * update JSON is preserved in telegram_raw_facts.raw_json, so the bytes are
 * always re-fetchable from Telegram via getFile. This module makes R2 a
 * cache, not a single point of failure.
 *
 * Flow for /photos/<file>:
 *   1. R2 (if bound) hit -> serve.
 *   2. Parse telegram_<file_unique_id>.jpg; unknown shape -> 404.
 *   3. KV `tg:path:<uid>` (45 min TTL; Telegram file_path lives >= 1h).
 *   4. KV `tg:id:<uid>` (7d) else D1 raw_json LIKE scan -> file_id.
 *   5. Bot API getFile -> file_path -> cache -> stream bytes, immutable.
 */

import { getDownloadUrl, getFile } from "./telegram";

export interface PhotoEnv {
  PHOTOS?: {
    get(key: string): Promise<{
      body: ReadableStream;
      httpEtag: string;
      writeHttpMetadata(headers: Headers): void;
    } | null>;
  };
  DB: {
    prepare(sql: string): {
      bind(...args: unknown[]): { first<T>(): Promise<T | null> };
    };
  };
  CACHE: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  };
  TELEGRAM_BOT_TOKEN?: string;
}

const TELEGRAM_NAME = /^telegram_([A-Za-z0-9_-]+)\.[a-z0-9]+$/i;
const PATH_TTL_SECONDS = 45 * 60; // Telegram file_path is valid >= 1h
const ID_TTL_SECONDS = 7 * 24 * 3600; // file_id is long-lived for the same bot

export function parseTelegramUid(fileName: string): string | null {
  return TELEGRAM_NAME.exec(fileName)?.[1] ?? null;
}

/** Extract the file_id of the photo size matching a file_unique_id from a raw update. */
export function findFileId(rawJson: string, uid: string): string | null {
  let update: any;
  try {
    update = JSON.parse(rawJson);
  } catch {
    return null;
  }
  const message = update?.channel_post ?? update?.edited_channel_post;
  const photos = message?.photo;
  if (!Array.isArray(photos)) return null;
  return photos.find((p: any) => p?.file_unique_id === uid)?.file_id ?? null;
}

function contentTypeFor(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".mp4")) return "video/mp4";
  return "image/jpeg";
}

function immutableHeaders(extra?: (h: Headers) => void): Headers {
  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  extra?.(headers);
  return headers;
}

async function resolveFileId(uid: string, env: PhotoEnv): Promise<string | null> {
  const cached = await env.CACHE.get(`tg:id:${uid}`);
  if (cached) return cached;

  const row = await env.DB.prepare(
    "SELECT raw_json FROM telegram_raw_facts WHERE raw_json LIKE ? LIMIT 1"
  )
    .bind(`%${uid}%`)
    .first<{ raw_json: string }>();
  const fileId = row ? findFileId(row.raw_json, uid) : null;
  if (fileId) {
    await env.CACHE.put(`tg:id:${uid}`, fileId, { expirationTtl: ID_TTL_SECONDS });
  }
  return fileId;
}

async function resolveFilePath(uid: string, env: PhotoEnv): Promise<string | null> {
  const cached = await env.CACHE.get(`tg:path:${uid}`);
  if (cached) return cached;
  if (!env.TELEGRAM_BOT_TOKEN) return null;

  const fileId = await resolveFileId(uid, env);
  if (!fileId) return null;

  const file = await getFile(env.TELEGRAM_BOT_TOKEN, fileId);
  if (!file.file_path) return null;
  await env.CACHE.put(`tg:path:${uid}`, file.file_path, {
    expirationTtl: PATH_TTL_SECONDS,
  });
  return file.file_path;
}

export async function servePhoto(
  fileName: string,
  env: PhotoEnv,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<Response> {
  // 1. R2 fast path when the binding exists (post-reinstatement).
  if (env.PHOTOS) {
    const object = await env.PHOTOS.get(fileName);
    if (object) {
      return new Response(object.body, {
        headers: immutableHeaders((h) => {
          object.writeHttpMetadata(h);
          h.set("etag", object.httpEtag);
        }),
      });
    }
  }

  // 2. Telegram fallback.
  const uid = parseTelegramUid(fileName);
  if (!uid) return new Response("Media Not Found", { status: 404 });

  let filePath: string | null;
  try {
    filePath = await resolveFilePath(uid, env);
  } catch {
    return new Response("Upstream media fetch failed", { status: 502 });
  }
  if (!filePath) return new Response("Media Not Found", { status: 404 });

  const upstream = await fetchImpl(
    getDownloadUrl(env.TELEGRAM_BOT_TOKEN as string, filePath)
  );
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream media fetch failed", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: immutableHeaders((h) =>
      h.set("Content-Type", contentTypeFor(filePath))
    ),
  });
}

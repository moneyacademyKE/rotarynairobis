/**
 * Local classifier: drains classification_jobs → inferhub (main) / Gemini
 * (fallback) → media_facts. The local replacement for the Cloudflare Queue
 * consumer in src/entry.cloudflare-workers.tsx — same classify client
 * (src/lib/classify-client.ts, unmodified), same parser, same insert shape.
 *
 * Mirror mode never enqueues, so this stays silent until cutover. Run:
 * `bun local/classify.ts` (drain once, JSON receipt).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyImage } from "../src/lib/classify-client";
import { parseGeminiResponse } from "../src/lib/gemini-parser";
import { SqliteStore, DEFAULT_DB_PATH } from "./sqlite-store";
import { openStore } from "./sqlite-store";
import { DEFAULT_LOCAL_ROOT } from "./kv";

export const MEDIA_CACHE_DIR = join(DEFAULT_LOCAL_ROOT, "media-cache");

export interface ClassifyEnv {
  INFERSHUB_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
}

const JOBS_SCHEMA = `
CREATE TABLE IF NOT EXISTS classification_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_pending
    ON classification_jobs(status, next_attempt_at);
`;

/** Fast retries before a job drops to the slow lane, and the slow-lane gap. */
export const FAST_RETRY_LIMIT = 3;
export const SLOW_RETRY_SEC = 6 * 3600;

export function ensureJobsTable(store: SqliteStore): void {
  store.db.exec(JOBS_SCHEMA);
  // One-time revival of legacy terminal rows. 'failed' used to strand a photo
  // forever when a transient provider blip burned all three attempts (job 103,
  // 2026-11-23: one OpenRouter hiccup, its neighbours all succeeded). Nothing
  // writes that status any more, so every job stays reachable and a photo
  // never waits for an operator to notice it.
  store.db.exec("UPDATE classification_jobs SET status = 'pending' WHERE status = 'failed'");
}

/** Idempotent enqueue (UNIQUE file_name): returns job id, or null when already queued/done. */
export function enqueueJob(store: SqliteStore, fileName: string): number | null {
  ensureJobsTable(store);
  const r = store.db
    .prepare("INSERT OR IGNORE INTO classification_jobs (file_name) VALUES (?)")
    .run(fileName);
  return r.changes > 0 ? Number(r.lastInsertRowid) : null;
}

export interface DrainReport {
  at: string;
  considered: number;
  done: number;
  /** Jobs that errored on this drain. Still pending: each retries after its
      cooldown, so this counts "not classified yet", never "lost". */
  failed: number;
  skipped: number;
}

export interface ClassifyDeps {
  classify: (base64: string, mimeType: string, env: ClassifyEnv, snippetHint?: string) => Promise<string>;
}

/**
 * fileName -> latest post caption. Decision models emit no text, so the
 * snippet is the human-written post caption (better than an AI guess).
 * Built once per drain; latest non-retracted post wins.
 */
export function captionMap(store: SqliteStore): Map<string, string> {
  const rows = store.db
    .prepare("SELECT text, photos_json FROM posts_facts WHERE is_retraction = 0 ORDER BY tx_id ASC")
    .all() as Array<{ text: string | null; photos_json: string | null }>;
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!r.text) continue;
    let photos: unknown;
    try { photos = JSON.parse(r.photos_json ?? "[]"); } catch { continue; }
    if (!Array.isArray(photos)) continue;
    for (const p of photos) if (typeof p === "string") map.set(p, r.text);
  }
  return map;
}

/**
 * Drain pending jobs. Photos whose bytes are not in media-cache are skipped
 * (left pending, no attempt burn): pre-cutover archive photos classify on the
 * live queue; local bytes exist for everything the poller ingests.
 */
export async function drainJobs(
  store: SqliteStore,
  env: ClassifyEnv,
  mediaCacheDir: string = MEDIA_CACHE_DIR,
  deps: ClassifyDeps = { classify: (b, m, e, h) => classifyImage(b, m, e, undefined, h) },
  opts: { paceMs?: number } = {},
): Promise<DrainReport> {
  ensureJobsTable(store);
  const at = new Date().toISOString();
  const jobs = store.db
    .prepare(
      `SELECT * FROM classification_jobs
       WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY id`,
    )
    .all(at) as Array<{ id: number; file_name: string; attempts: number }>;

  const captions = captionMap(store);
  let done = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of jobs) {
    const path = join(mediaCacheDir, job.file_name);
    if (!existsSync(path)) {
      skipped++;
      continue;
    }
    try {
      if (opts.paceMs) await new Promise((r) => setTimeout(r, opts.paceMs));
      const base64 = Buffer.from(readFileSync(path)).toString("base64");
      const raw = await deps.classify(base64, "image/jpeg", env, captions.get(job.file_name));
      const parsed = parseGeminiResponse(raw);
      // Same insert the queue consumer performs through the media view's
      // INSTEAD OF trigger: (file_name, type, snippet, raw_data), tx auto.
      store.db
        .prepare("INSERT INTO media_facts (file_name, type, snippet, raw_data) VALUES (?, ?, ?, ?)")
        .run(job.file_name, parsed.type, parsed.snippet, raw);
      store.db.prepare("UPDATE classification_jobs SET status = 'done' WHERE id = ?").run(job.id);
      done++;
    } catch (e: unknown) {
      const message = String((e as Error)?.message ?? e).slice(0, 300);
      // Rate limits are transient, not a bad image: don't burn an attempt or
      // fail the job — back off longer and leave it pending for the next drain.
      if ((e as { status?: number })?.status === 429) {
        const retryAt = new Date(Date.now() + 60_000).toISOString();
        store.db
          .prepare("UPDATE classification_jobs SET next_attempt_at = ?, last_error = ? WHERE id = ?")
          .run(retryAt, message, job.id);
        continue;
      }
      const attempts = job.attempts + 1;
      // Short backoff while the fast retries last; after that a long cooldown.
      // Either way the job stays 'pending', so nothing is ever stranded: the
      // next due drain picks it up again without an operator requeueing it.
      const backoffSec =
        attempts >= FAST_RETRY_LIMIT ? SLOW_RETRY_SEC : Math.min(30 * 2 ** attempts, 300);
      const retryAt = new Date(Date.now() + backoffSec * 1000).toISOString();
      store.db
        .prepare("UPDATE classification_jobs SET attempts = ?, status = 'pending', next_attempt_at = ?, last_error = ? WHERE id = ?")
        .run(attempts, retryAt, message, job.id);
      failed++;
    }
  }

  return { at, considered: jobs.length, done, failed, skipped };
}

if (import.meta.main) {
  const env: ClassifyEnv = {
    INFERSHUB_API_KEY: process.env.INFERSHUB_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  };
  if (!env.OPENROUTER_API_KEY && !env.INFERSHUB_API_KEY && !env.GEMINI_API_KEY) {
    console.error("[classify] no OPENROUTER_API_KEY / INFERSHUB_API_KEY / GEMINI_API_KEY in env");
    process.exit(1);
  }
  const store = openStore(DEFAULT_DB_PATH);
  try {
    const paceMs = Number(process.env.CLASSIFY_PACE_MS ?? 0) || 0;
    console.log(`[classify] ${JSON.stringify(await drainJobs(store, env, undefined, undefined, { paceMs }))}`);
  } finally {
    store.close();
  }
}

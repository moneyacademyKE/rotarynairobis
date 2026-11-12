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

export function ensureJobsTable(store: SqliteStore): void {
  store.db.exec(JOBS_SCHEMA);
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
  failed: number;
  skipped: number;
}

export interface ClassifyDeps {
  classify: (base64: string, mimeType: string, env: ClassifyEnv) => Promise<string>;
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
  deps: ClassifyDeps = { classify: classifyImage },
): Promise<DrainReport> {
  ensureJobsTable(store);
  const at = new Date().toISOString();
  const jobs = store.db
    .prepare(
      `SELECT * FROM classification_jobs
       WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
         AND attempts < 3
       ORDER BY id`,
    )
    .all(at) as Array<{ id: number; file_name: string; attempts: number }>;

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
      const base64 = Buffer.from(readFileSync(path)).toString("base64");
      const raw = await deps.classify(base64, "image/jpeg", env);
      const parsed = parseGeminiResponse(raw);
      // Same insert the queue consumer performs through the media view's
      // INSTEAD OF trigger: (file_name, type, snippet, raw_data), tx auto.
      store.db
        .prepare("INSERT INTO media_facts (file_name, type, snippet, raw_data) VALUES (?, ?, ?, ?)")
        .run(job.file_name, parsed.type, parsed.snippet, raw);
      store.db.prepare("UPDATE classification_jobs SET status = 'done' WHERE id = ?").run(job.id);
      done++;
    } catch (e: unknown) {
      const attempts = job.attempts + 1;
      const status = attempts >= 3 ? "failed" : "pending";
      const backoffSec = Math.min(30 * 2 ** attempts, 300);
      const retryAt = new Date(Date.now() + backoffSec * 1000).toISOString();
      const message = String((e as Error)?.message ?? e).slice(0, 300);
      store.db
        .prepare("UPDATE classification_jobs SET attempts = ?, status = ?, next_attempt_at = ?, last_error = ? WHERE id = ?")
        .run(attempts, status, retryAt, message, job.id);
      if (status === "failed") failed++;
    }
  }

  return { at, considered: jobs.length, done, failed, skipped };
}

if (import.meta.main) {
  const env: ClassifyEnv = {
    INFERSHUB_API_KEY: process.env.INFERSHUB_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };
  if (!env.INFERSHUB_API_KEY && !env.GEMINI_API_KEY) {
    console.error("[classify] no INFERSHUB_API_KEY / GEMINI_API_KEY in env");
    process.exit(1);
  }
  const store = openStore(DEFAULT_DB_PATH);
  try {
    console.log(`[classify] ${JSON.stringify(await drainJobs(store, env))}`);
  } finally {
    store.close();
  }
}

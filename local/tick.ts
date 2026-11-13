/**
 * One local pipeline tick: poll Telegram → classify new photos → rebuild
 * galleries. This is the cron shape post-cutover (replaces the CF webhook
 * + queue consumer + nightly publish as the content path).
 *
 * Pre-cutover (no TELEGRAM_BOT_TOKEN): poll is skipped, classify drains
 * nothing (mirror mode never enqueues), build refreshes from mirrored D1 —
 * the tick is a harmless no-op chain that exercises the whole path.
 *
 * Run: `bun local/tick.ts`
 */

import { openStore, DEFAULT_DB_PATH } from "./sqlite-store";
import { pollOnce, realDeps } from "./poller";
import { drainJobs, MEDIA_CACHE_DIR, type ClassifyEnv } from "./classify";
import { buildGalleries, } from "./build";
import { DEFAULT_OUT_DIR } from "./sqlite-store";

export interface TickReport {
  at: string;
  poll: { skipped: boolean; error?: string; polled: number; newPosts: number; newPhotos: number };
  classify: { done: number; failed: number; skipped: number; error?: string };
  build: { skipped?: boolean; published: string[]; failed: { key: string; error: string }[]; rowsWritten: number };
}

export async function tick(dbPath = DEFAULT_DB_PATH, outDir = DEFAULT_OUT_DIR): Promise<TickReport> {
  const at = new Date().toISOString();
  const store = openStore(dbPath);
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    let poll: TickReport["poll"] = { skipped: true, polled: 0, newPosts: 0, newPhotos: 0 };
    if (token) {
      try {
        const r = await pollOnce(store, token, realDeps(), MEDIA_CACHE_DIR);
        poll = { skipped: false, polled: r.polled, newPosts: r.newPosts, newPhotos: r.newPhotos };
      } catch (e: unknown) {
        poll = { skipped: false, error: String((e as Error)?.message ?? e), polled: 0, newPosts: 0, newPhotos: 0 };
      }
    }

    let classify: TickReport["classify"] = { done: 0, failed: 0, skipped: 0 };
    const env: ClassifyEnv = {
      INFERSHUB_API_KEY: process.env.INFERSHUB_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    };
    if (env.INFERSHUB_API_KEY || env.GEMINI_API_KEY) {
      try {
        const r = await drainJobs(store, env, MEDIA_CACHE_DIR);
        classify = { done: r.done, failed: r.failed, skipped: r.skipped };
      } catch (e: unknown) {
        classify = { done: 0, failed: 0, skipped: 0, error: String((e as Error)?.message ?? e) };
      }
    }

    // Quiet tick: nothing polled, nothing classified → data unchanged →
    // skip the rebuild. The 5-min cron becomes a single getUpdates call.
    const quiet =
      poll.polled === 0 && !poll.error && classify.done === 0 && classify.failed === 0 && !classify.error;
    const build = quiet
      ? { skipped: true as const, published: [] as string[], failed: [] as { key: string; error: string }[], rowsWritten: 0 }
      : await buildGalleries(dbPath, outDir);

    return { at, poll, classify, build };
  } finally {
    store.close();
  }
}

if (import.meta.main) {
  const report = await tick();
  console.log(`[tick] ${JSON.stringify(report)}`);
  if (report.poll.error || report.classify.error) process.exitCode = 1;
}

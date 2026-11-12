/**
 * Nightly local pipeline entry (mirror mode).
 *
 *   1. Watermark probe: 2 indexed remote reads. Unchanged → exit.
 *   2. Mirror deltas into local SQLite.
 *   3. Rebuild the five gallery read models as JSON files.
 *   4. Print one JSON receipt line for the cron report.
 *
 * Writes nothing to Cloudflare. The live site keeps serving from its own
 * KV until cutover (see README). Run: `bun local/run.ts`.
 */

import { d1FromEnv } from "./d1-remote";
import { openStore, DEFAULT_DB_PATH, DEFAULT_OUT_DIR } from "./sqlite-store";
import { mirror, needsSync } from "./mirror";
import { buildGalleries } from "./build";

export interface RunReport {
  at: string;
  mirrored: number;
  skipped: boolean;
  published: string[];
  failed: { key: string; error: string }[];
  rowsWritten: number;
}

export async function runPipeline(dbPath = DEFAULT_DB_PATH, outDir = DEFAULT_OUT_DIR): Promise<RunReport> {
  const at = new Date().toISOString();
  const store = openStore(dbPath);
  try {
    const remote = d1FromEnv();

    if (!(await needsSync(store, remote))) {
      return { at, mirrored: 0, skipped: true, published: [], failed: [], rowsWritten: 0 };
    }

    const m = await mirror(store, remote);
    const b = await buildGalleries(dbPath, outDir);
    store.metaSet("last-run", at);
    if (b.failed.length === 0) store.metaSet("last-clean-run", at);

    return {
      at,
      mirrored: m.posts_facts + m.media_facts + m.telegram_raw_facts,
      skipped: false,
      published: b.published,
      failed: b.failed,
      rowsWritten: b.rowsWritten,
    };
  } finally {
    store.close();
  }
}

if (import.meta.main) {
  console.log(`[run] ${JSON.stringify(await runPipeline())}`);
}

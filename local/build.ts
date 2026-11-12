/**
 * Build the five gallery read models from local SQLite — the exact same
 * builder the worker uses (src/lib/gallery.ts), unmodified, through the
 * D1-shaped adapter. Output: plain JSON files in RCNS_LOCAL_OUT.
 *
 * This is the KV replacement: no TTLs, no cache invalidation — the files
 * are the read models.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  GALLERY_KEYS,
  loadFacts,
  buildGallery,
  type PublishReport,
} from "../src/lib/gallery";
import { openStore, DEFAULT_DB_PATH, DEFAULT_OUT_DIR } from "./sqlite-store";

const FILE_FOR: Record<string, string> = {
  "gallery:tiktok": "gallery-tiktok.json",
  "gallery:instagram": "gallery-instagram.json",
  "gallery:birthdays": "gallery-birthdays.json",
  "gallery:recaps": "gallery-recaps.json",
  "gallery:events": "gallery-events.json",
};

export async function buildGalleries(dbPath: string, outDir: string): Promise<PublishReport> {
  const store = openStore(dbPath);
  try {
    const { posts, media } = await loadFacts(store.env);
    const published: string[] = [];
    const failed: { key: string; error: string }[] = [];
    let rowsWritten = 0;

    mkdirSync(outDir, { recursive: true });
    for (const key of GALLERY_KEYS) {
      try {
        const rows = buildGallery(posts, media, key);
        writeFileSync(join(outDir, FILE_FOR[key]), JSON.stringify(rows));
        rowsWritten += rows.length;
        published.push(key);
      } catch (e: any) {
        failed.push({ key, error: e?.message ?? String(e) });
      }
    }

    return { published, failed, rowsWritten, at: new Date().toISOString() };
  } finally {
    store.close();
  }
}

if (import.meta.main) {
  const report = await buildGalleries(DEFAULT_DB_PATH, DEFAULT_OUT_DIR);
  console.log(`[build] ${JSON.stringify(report)}`);
}

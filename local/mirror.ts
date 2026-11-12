/**
 * Mirror sync: pull fact-table deltas from live D1 into local SQLite.
 *
 * Full export and nightly incremental are the same operation — the delta
 * just starts at tx_id 0. Watermark check first: if remote MAX(tx_id) equals
 * local MAX(tx_id) on both fact tables, zero rows move.
 */

import type { D1Remote } from "./d1-remote";
import type { SqliteStore, FactRow } from "./sqlite-store";

export interface MirrorReport {
  posts_facts: number;
  media_facts: number;
  telegram_raw_facts: number;
  skipped: boolean;
  remote: { posts: number; media: number };
  local: { posts: number; media: number };
  at: string;
}

const TABLES = ["posts_facts", "media_facts", "telegram_raw_facts"] as const;

/** Pull everything since each table's local high-water mark. */
export async function mirror(store: SqliteStore, remote: D1Remote): Promise<MirrorReport> {
  const at = new Date().toISOString();
  const counts = { posts_facts: 0, media_facts: 0, telegram_raw_facts: 0 } as Record<string, number>;

  for (const table of TABLES) {
    for await (const chunk of remote.delta<FactRow>(table, store.maxTxId(table))) {
      store.insertFacts(table, chunk);
      counts[table] += chunk.length;
    }
  }

  const [posts, media] = await Promise.all([
    remote.watermark("posts_facts"),
    remote.watermark("media_facts"),
  ]);

  return {
    ...counts,
    skipped: counts.posts_facts + counts.media_facts + counts.telegram_raw_facts === 0,
    remote: { posts, media },
    local: { posts: store.maxTxId("posts_facts"), media: store.maxTxId("media_facts") },
    at,
  };
}

/** Watermark-only probe: 2 indexed remote reads, decides if a run is needed. */
export async function needsSync(store: SqliteStore, remote: D1Remote): Promise<boolean> {
  const [p, m] = await Promise.all([
    remote.watermark("posts_facts"),
    remote.watermark("media_facts"),
  ]);
  return p !== store.maxTxId("posts_facts") || m !== store.maxTxId("media_facts");
}

/** Entry: `bun local/export.ts` — full first-time import. */
if (import.meta.main) {
  const { openStore, DEFAULT_DB_PATH } = await import("./sqlite-store");
  const { d1FromEnv } = await import("./d1-remote");
  const store = openStore(DEFAULT_DB_PATH);
  const remote = d1FromEnv();
  const report = await mirror(store, remote);
  console.log(
    `[export] ${JSON.stringify({
      ...report,
      totals: {
        posts: store.count("posts_facts"),
        media: store.count("media_facts"),
        raw: store.count("telegram_raw_facts"),
      },
    })}`,
  );
  store.close();
}

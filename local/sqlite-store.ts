/**
 * Local SQLite store with a D1-shaped adapter, so src/lib/gallery.ts runs
 * unmodified against local data (same `prepare().all()/first()` interface).
 *
 * Schema = the repo's schema.sql fact tables + indexes. Views and triggers
 * are write-path conveniences for the webhook; the local mirror inserts
 * facts directly, so they are intentionally not created here.
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS media_facts (
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    type TEXT,
    snippet TEXT,
    raw_data TEXT,
    is_retraction BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS posts_facts (
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id INTEGER NOT NULL,
    text TEXT,
    account TEXT,
    photos_json TEXT,
    hashtags_json TEXT,
    is_retraction BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS telegram_raw_facts (
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    update_id INTEGER UNIQUE NOT NULL,
    raw_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_facts_entity ON media_facts(file_name, tx_id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_facts_entity ON posts_facts(id, tx_id DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_raw_update_id ON telegram_raw_facts(update_id);
CREATE INDEX IF NOT EXISTS idx_posts_facts_created ON posts_facts(created_at);
CREATE INDEX IF NOT EXISTS idx_media_facts_created ON media_facts(created_at);
`;

export type FactRow = Record<string, unknown>;

/** A statement-shaped adapter: mirrors the subset of D1's API the libs use. */
class Stmt {
  constructor(private readonly stmt: import("bun:sqlite").Statement) {}
  async all(...args: unknown[]): Promise<{ results: FactRow[] }> {
    return { results: this.stmt.all(...args) as FactRow[] };
  }
  async first(col?: string): Promise<unknown> {
    const row = this.stmt.get(...[]) as FactRow | null;
    return col ? row?.[col] ?? null : row;
  }
  async run(...args: unknown[]): Promise<{ success: true }> {
    this.stmt.run(...args);
    return { success: true };
  }
}

export class SqliteStore {
  readonly db: Database;
  /** D1-compatible binding: `store.env.DB.prepare(...)`. */
  readonly env: { DB: { prepare(sql: string): Stmt } };

  constructor(readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(SCHEMA);
    this.env = { DB: { prepare: (sql: string) => new Stmt(this.db.prepare(sql)) } };
  }

  /** Bulk insert of mirrored fact rows, preserving remote tx_id values. */
  insertFacts(table: string, rows: FactRow[]): number {
    if (rows.length === 0) return 0;
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders}) ON CONFLICT(tx_id) DO NOTHING`;
    const stmt = this.db.prepare(sql);
    const tx = this.db.transaction((batch: FactRow[]) => {
      for (const row of batch) stmt.run(...cols.map((c) => row[c] ?? null));
    });
    tx(rows);
    return rows.length;
  }

  count(table: string): number {
    return Number(this.db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c);
  }

  maxTxId(table: string): number {
    const row = this.db.prepare(`SELECT MAX(tx_id) AS t FROM ${table}`).get() as { t: number | null };
    return Number(row.t ?? 0);
  }

  metaGet(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | null;
    return row?.value ?? null;
  }

  metaSet(key: string, value: string): void {
    this.db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
  }

  close(): void {
    this.db.close();
  }
}

export function openStore(path: string): SqliteStore {
  return new SqliteStore(path);
}

export const DEFAULT_DB_PATH =
  process.env.RCNS_LOCAL_DB ?? `${process.env.HOME}/.opencrabs/projects/rotary-local/rcns.sqlite`;
export const DEFAULT_OUT_DIR =
  process.env.RCNS_LOCAL_OUT ?? `${process.env.HOME}/.opencrabs/projects/rotary-local/generated`;

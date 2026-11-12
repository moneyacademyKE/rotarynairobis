/**
 * Local platform adapters: the runtime env the Qwik routes see in place of
 * Cloudflare bindings. DB = bun:sqlite behind a D1-shaped adapter (with
 * bind()), CACHE = FileKV, CLASSIFY_QUEUE = the local jobs table.
 */

import type { Statement } from "bun:sqlite";
import { openStore, DEFAULT_DB_PATH, type SqliteStore } from "./sqlite-store";
import { fileKvFor, FileKV } from "./kv";
import { enqueueJob } from "./classify";

export type FactRow = Record<string, unknown>;

/** D1-shaped statement: prepare().bind(...).all()/first()/run() — the exact surface routes and libs call. */
export class D1Stmt {
  constructor(
    private readonly stmt: Statement,
    private readonly args: unknown[] = [],
  ) {}

  bind(...args: unknown[]): D1Stmt {
    return new D1Stmt(this.stmt, args);
  }

  async all(...extra: unknown[]): Promise<{ results: FactRow[] }> {
    return { results: this.stmt.all(...this.args, ...extra) as FactRow[] };
  }

  async first(col?: string): Promise<unknown> {
    const row = this.stmt.get(...this.args) as FactRow | null;
    if (row == null) return null;
    return col ? (row[col] ?? null) : row;
  }

  async run(...extra: unknown[]): Promise<{ success: true }> {
    this.stmt.run(...this.args, ...extra);
    return { success: true };
  }
}

export interface LocalEnv {
  [key: string]: unknown;
}

/** Assemble the platform env. `extra` merges last (e.g. secrets for the photo bridge). */
export function buildEnv(store: SqliteStore, kv: FileKV, extra: Record<string, unknown> = {}): LocalEnv {
  return {
    DB: { prepare: (sql: string) => new D1Stmt(store.db.prepare(sql)) },
    CACHE: kv,
    // POST /api/classify → a local job row (the queue replacement).
    CLASSIFY_QUEUE: {
      send: async (message: { fileName: string }) => {
        enqueueJob(store, message.fileName);
      },
    },
    ...extra,
  };
}

export interface LocalStack {
  store: SqliteStore;
  kv: FileKV;
  env: LocalEnv;
}

/** Open the long-lived stack for the server process. */
export function openLocalStack(dbPath: string = DEFAULT_DB_PATH): LocalStack {
  const store = openStore(dbPath);
  const kv = fileKvFor();
  const env = buildEnv(store, kv);
  return { store, kv, env };
}

/**
 * File-backed KV with Cloudflare-KV semantics (the local CACHE binding).
 *
 * One JSON file per key: `{ v: string, exp: number | null }`. `get` honors
 * TTL expiry, `get(key, "json")` parses — the exact shapes src/lib/gallery.ts
 * and src/lib/photo-source.ts already call. Backs both the poller (tg:id
 * warm-at-ingest writes) and the local server (cache read-through).
 */

import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

interface Envelope {
  v: string;
  exp: number | null;
}

export class FileKV {
  constructor(readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  private path(key: string): string {
    return join(this.dir, encodeURIComponent(key) + ".json");
  }

  async get(key: string, type?: "json" | "text"): Promise<string | unknown | null> {
    let env: Envelope;
    try {
      env = JSON.parse(readFileSync(this.path(key), "utf8")) as Envelope;
    } catch {
      return null;
    }
    if (env.exp !== null && env.exp < Math.floor(Date.now() / 1000)) return null;
    if (type === "json") {
      try {
        return JSON.parse(env.v);
      } catch {
        return null;
      }
    }
    return env.v;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const exp = opts?.expirationTtl
      ? Math.floor(Date.now() / 1000) + opts.expirationTtl
      : null;
    writeFileSync(this.path(key), JSON.stringify({ v: value, exp }));
  }

  async delete(key: string): Promise<void> {
    try {
      unlinkSync(this.path(key));
    } catch {
      // already gone — delete is idempotent
    }
  }
}

export const DEFAULT_LOCAL_ROOT =
  process.env.RCNS_LOCAL_ROOT ?? `${process.env.HOME}/.opencrabs/projects/rotary-local`;

export function fileKvFor(root: string = DEFAULT_LOCAL_ROOT): FileKV {
  return new FileKV(join(root, "kv"));
}

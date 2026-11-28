/**
 * File-backed KV with Cloudflare-KV semantics (the local CACHE binding).
 *
 * One JSON file per key: `{ v: string, exp: number | null }`. `get` honors
 * TTL expiry, `get(key, "json")` parses — the exact shapes src/lib/gallery.ts
 * and src/lib/photo-source.ts already call. Backs both the poller (tg:id
 * warm-at-ingest writes) and the local server (cache read-through).
 */

import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Marker filename that arms a state root for live writes. The env var alone
 * is not enough: a fresh machine that never ran the runbook has no state
 * root, and a stray exported var must not conjure one into production.
 */
const LIVE_MARKER = "live-state.marker";

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

export interface LiveStateArms {
  envArmed: boolean;
  markerArmed: boolean;
  testMode: boolean;
}

/** Whether `root` is currently armed as a live state root. Readable for tests. */
export function liveStateArms(root: string): LiveStateArms {
  return {
    envArmed: process.env.RCNS_LIVE_STATE === "1",
    markerArmed: existsSync(join(root, LIVE_MARKER)),
    testMode: process.env.NODE_ENV === "test",
  };
}

/**
 * Live-write guard (the #33 invariant): the served site's KV root is handed
 * out only to processes that armed production deliberately —
 *   1. RCNS_LIVE_STATE=1 in the 600-perm .env.sh (run-server.sh and
 *      poll-receipt.sh both source it), and
 *   2. a live-state.marker file in the state root (runbook-created).
 * A test run is never armed, even with the env sourced: bun test sets
 * NODE_ENV=test, and that short-circuits to refuse before the arms matter.
 * Everything else fails closed — the #31 incident was a test writing this
 * very root because no factory between it and the live bytes ever asked.
 */
export function fileKvFor(root: string = DEFAULT_LOCAL_ROOT): FileKV {
  const arms = liveStateArms(root);
  if (arms.testMode || !(arms.envArmed && arms.markerArmed)) {
    throw new Error(
      `refusing live KV at ${root}: tests may never write the served state root. ` +
        `Armed paths source ~/.opencrabs/projects/rotary-local/.env.sh (RCNS_LIVE_STATE=1) ` +
        `with its live-state.marker present — see local/README.md "Live-state isolation".`,
    );
  }
  return new FileKV(join(root, "kv"));
}

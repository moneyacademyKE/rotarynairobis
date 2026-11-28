/**
 * Local pipeline tests — run with `bun test local/` (bun:sqlite is bun-only;
 * the worker bundle and node/vitest never import anything under local/).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openStore, type SqliteStore, type FactRow } from "./sqlite-store";
import { DEFAULT_LOCAL_ROOT, fileKvFor, liveStateArms } from "./kv";
import { mirror, needsSync } from "./mirror";
import { buildGalleries } from "./build";
import { tick } from "./tick";
import type { D1Remote } from "./d1-remote";

let dir: string;
let store: SqliteStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rcns-local-"));
  store = openStore(join(dir, "test.sqlite"));
});

const post = (id: number, text: string, photos: string[], tx: number): FactRow => ({
  tx_id: tx,
  id,
  text,
  account: null,
  photos_json: JSON.stringify(photos),
  hashtags_json: "[]",
  is_retraction: 0,
  created_at: `2026-11-${String(10 + (tx % 10)).padStart(2, "0")} 10:00:00`,
});

const media = (file: string, type: string, tx: number): FactRow => ({
  tx_id: tx,
  file_name: file,
  type,
  snippet: `s-${file}`,
  raw_data: "{}",
  is_retraction: 0,
  created_at: "2026-11-10 10:00:00",
});

describe("sqlite store", () => {
  it("creates fact tables and counts rows", () => {
    expect(store.count("posts_facts")).toBe(0);
    store.insertFacts("posts_facts", [post(1, "hi", [], 1)]);
    expect(store.count("posts_facts")).toBe(1);
    expect(store.maxTxId("posts_facts")).toBe(1);
  });

  it("preserves remote tx_ids and ignores duplicate inserts", () => {
    store.insertFacts("posts_facts", [post(1, "a", [], 5), post(2, "b", [], 7)]);
    store.insertFacts("posts_facts", [post(1, "a", [], 5)]);
    expect(store.count("posts_facts")).toBe(2);
    expect(store.maxTxId("posts_facts")).toBe(7);
  });

  it("exposes the D1 adapter contract gallery.ts uses", async () => {
    store.insertFacts("posts_facts", [post(1, "x", [], 1)]);
    const r = await store.env.DB.prepare("SELECT * FROM posts_facts").all();
    expect(Array.isArray(r.results)).toBe(true);
    expect(r.results[0].id).toBe(1);
    const t = await store.env.DB.prepare("SELECT MAX(tx_id) AS t FROM posts_facts").first("t");
    expect(Number(t)).toBe(1);
  });

  it("round-trips meta values", () => {
    store.metaSet("last-run", "2026-11-12T00:00:00Z");
    expect(store.metaGet("last-run")).toBe("2026-11-12T00:00:00Z");
    store.metaSet("last-run", "2026-11-13T00:00:00Z");
    expect(store.metaGet("last-run")).toBe("2026-11-13T00:00:00Z");
  });
});

describe("buildGalleries (integration with the worker's own builder)", () => {
  it("dedupes latest-fact-wins, drops retractions, shapes rows per gallery", async () => {
    store.insertFacts("posts_facts", [
      post(10, "old caption", ["telegram_a.jpg"], 1),
      post(10, "new caption", ["telegram_a.jpg"], 2),
      post(11, "", ["telegram_b.jpg"], 3),
      { ...post(12, "gone", ["telegram_c.jpg"], 4), is_retraction: 1 },
    ]);
    store.insertFacts("media_facts", [
      media("telegram_a.jpg", "EVENT_POSTER", 1),
      media("telegram_b.jpg", "PHOTO", 2),
      media("telegram_c.jpg", "PHOTO", 3),
    ]);
    const out = join(dir, "generated");
    const report = await buildGalleries(join(dir, "test.sqlite"), out);
    expect(report.failed).toEqual([]);
    expect(report.published.sort()).toEqual([
      "gallery:birthdays",
      "gallery:events",
      "gallery:instagram",
      "gallery:recaps",
      "gallery:tiktok",
    ]);
    const events = JSON.parse(await Bun.file(join(out, "gallery-events.json")).text());
    // post 10 with its LATEST text; post 12 retracted away; events needs text.
    expect(events).toEqual([
      expect.objectContaining({ id: 10, text: "new caption", file_name: "telegram_a.jpg", snippet: "s-telegram_a.jpg", type: "EVENT_POSTER" }),
    ]);
    const insta = JSON.parse(await Bun.file(join(out, "gallery-instagram.json")).text());
    // photo-only post 11 is a PHOTO gallery row; instagram rows carry photo_src.
    expect(insta).toEqual([
      expect.objectContaining({ id: 11, photo_src: "telegram_b.jpg" }),
    ]);
    // The cache the server reads sits beside the output dir, never at the
    // live root. A temp build that can name production is how the site got
    // overwritten with this very fixture.
    const cache = JSON.parse(readFileSync(join(dir, "kv", encodeURIComponent("gallery:tiktok") + ".json"), "utf8"));
    expect(JSON.parse(cache.v)[0].file_name).toBe("telegram_a.jpg");
  });

  it("never writes the live gallery cache", async () => {
    const live = join(DEFAULT_LOCAL_ROOT, "kv", encodeURIComponent("gallery:tiktok") + ".json");
    const before = statSync(live).mtimeMs;
    const bytes = readFileSync(live);
    await buildGalleries(join(dir, "test.sqlite"), join(dir, "generated"));
    expect(statSync(live).mtimeMs).toBe(before);
    expect(readFileSync(live).equals(bytes)).toBe(true);
  });
});

describe("tick", () => {
  it("quiet tick (no token, no keys, no jobs): poll skipped, build skipped, zero writes", async () => {
    const out = join(dir, "generated");
    const report = await tick(join(dir, "test.sqlite"), out);
    expect(report.poll.skipped).toBe(true);
    expect(report.poll.polled).toBe(0);
    expect(report.build.skipped).toBe(true);
    expect(report.build.published).toEqual([]);
    expect(report.build.rowsWritten).toBe(0);
  });
});

describe("mirror", () => {
  const mockRemote = (posts: FactRow[], watermarks: { posts: number; media: number }): D1Remote =>
    ({
      async *delta(table: string, since: number) {
        const rows = (table === "posts_facts" ? posts : []).filter((r) => Number(r.tx_id) > since);
        for (let i = 0; i < rows.length; i += 500) yield rows.slice(i, i + 500);
      },
      watermark: async (table: string) => (table === "posts_facts" ? watermarks.posts : watermarks.media),
    }) as unknown as D1Remote;

  it("pulls only rows newer than the local high-water mark", async () => {
    store.insertFacts("posts_facts", [post(1, "a", [], 1)]);
    const report = await mirror(store, mockRemote([post(1, "a", [], 1), post(2, "b", [], 2)], { posts: 2, media: 0 }));
    expect(report.posts_facts).toBe(1); // only tx_id 2 was new
    expect(store.count("posts_facts")).toBe(2);
    expect(report.local.posts).toBe(2);
  });

  it("needsSync is false when watermarks match local", async () => {
    store.insertFacts("posts_facts", [post(1, "a", [], 5)]);
    expect(await needsSync(store, mockRemote([], { posts: 5, media: 0 }))).toBe(false);
    expect(await needsSync(store, mockRemote([], { posts: 6, media: 0 }))).toBe(true);
  });
});

describe("live-state guard (the #33 invariant: tests may never write the served root)", () => {
  /** Set env vars for one check, restoring whatever was there after. */
  const withEnv = async (env: Record<string, string | undefined>, fn: () => void | Promise<void>) => {
    const saved: Record<string, string | undefined> = {};
    for (const k of Object.keys(env)) saved[k] = process.env[k];
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };

  it("fileKvFor refuses an armed root under bun test, and the live default too", async () => {
    // The exact 2026-11-28 setup: env sourced (RCNS_LIVE_STATE=1), marker
    // present — and the guard still refuses, because a test is a test.
    const armedRoot = join(dir, "armed");
    mkdirSync(armedRoot, { recursive: true });
    writeFileSync(join(armedRoot, "live-state.marker"), "probe");
    await withEnv({ RCNS_LIVE_STATE: "1", NODE_ENV: "test" }, () => {
      expect(() => fileKvFor(armedRoot)).toThrow("tests may never write");
      expect(() => fileKvFor()).toThrow("tests may never write");
      expect(liveStateArms(armedRoot).testMode).toBe(true);
    });
  });

  it("fileKvFor fails closed outside test mode without both arms", async () => {
    const unarmed = join(dir, "no-marker");
    // env armed, marker missing
    await withEnv({ RCNS_LIVE_STATE: "1", NODE_ENV: "production" }, () => {
      expect(() => fileKvFor(unarmed)).toThrow("refusing live KV");
    });
    // marker is irrelevant when the env is not armed
    await withEnv({ RCNS_LIVE_STATE: undefined, NODE_ENV: "production" }, () => {
      expect(() => fileKvFor(unarmed)).toThrow("refusing live KV");
    });
  });

  it("an armed, marked, non-test root still serves (the production path)", async () => {
    const armedRoot = join(dir, "armed-serve");
    mkdirSync(armedRoot, { recursive: true });
    writeFileSync(join(armedRoot, "live-state.marker"), "probe");
    await withEnv({ RCNS_LIVE_STATE: "1", NODE_ENV: "production" }, async () => {
      const kv = fileKvFor(armedRoot);
      await kv.put("guard:probe", "ok");
      expect(await kv.get("guard:probe")).toBe("ok");
      expect(liveStateArms(armedRoot)).toEqual({ envArmed: true, markerArmed: true, testMode: false });
    });
  });
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});


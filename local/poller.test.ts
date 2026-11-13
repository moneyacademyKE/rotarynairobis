/**
 * Poller contract tests — the webhook port pinned by fixtures.
 * Zero network: every Telegram effect is injected.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { SqliteStore } from "./sqlite-store";
import { ingestUpdate, pollOnce, type PollerDeps } from "./poller";
import { FileKV } from "./kv";

let dir: string;
let store: SqliteStore;
let cacheDir: string;
let kv: FileKV;
let downloads: string[] = [];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rcns-poll-"));
  store = new SqliteStore(join(dir, "t.sqlite"));
  cacheDir = join(dir, "media-cache");
  kv = new FileKV(join(dir, "kv"));
  downloads = [];
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function deps(overrides: Partial<PollerDeps> = {}): PollerDeps {
  return {
    fetchUpdates: async () => ({ ok: true, result: [] }),
    getFile: async (_t, fileId) => ({
      file_id: fileId,
      file_unique_id: `UQ-${fileId}`,
      file_path: `photos/file_${fileId}.jpg`,
    }),
    downloadPhoto: async (_t, _fp, dest) => {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
      downloads.push(dest);
    },
    kvPut: (k, v, ttl) => kv.put(k, v, { expirationTtl: ttl }),
    ...overrides,
  };
}

const channel = { id: -1003893041237, type: "channel", username: "rotarynairobis" };
const post = (message_id: number, extra: Record<string, unknown> = {}) => ({
  update_id: 1000 + message_id,
  channel_post: { message_id, chat: channel, date: 1794500054, ...extra },
});

test("text-only channel post lands in posts_facts, no job", async () => {
  const r = await ingestUpdate(store, post(6200, { text: "Meeting tonight" }), "TOK", deps(), cacheDir);
  expect(r.stored).toBe(true);
  expect(r.photoFile).toBeUndefined();
  const row = store.db.prepare("SELECT * FROM posts_facts WHERE id = 6200").get() as any;
  expect(row.text).toBe("Meeting tonight");
  expect(row.photos_json).toBe("[]");
  expect(row.account).toBeNull();
  expect(store.count("telegram_raw_facts")).toBe(1);
});

test("photo post: fact + photo file + job + tg:id KV, largest size chosen", async () => {
  let gotFileId = "";
  const d = deps({
    getFile: async (_t, fileId) => {
      gotFileId = fileId;
      return { file_id: fileId, file_unique_id: `UQ-${fileId}`, file_path: `photos/${fileId}.jpg` };
    },
  });
  const photo = [
    { file_id: "small1", file_unique_id: "sm1", width: 100 },
    { file_id: "big1", file_unique_id: "bg1", width: 2000 },
  ];
  const r = await ingestUpdate(store, post(6201, { photo }), "TOK", d, cacheDir);
  // fileName derives from the getFile RESPONSE's file_unique_id (webhook semantics)
  expect(r.photoFile).toBe("telegram_UQ-big1.jpg");
  expect(gotFileId).toBe("big1"); // largest size passed to getFile
  expect(existsSync(join(cacheDir, "telegram_UQ-big1.jpg"))).toBe(true);
  const row = store.db.prepare("SELECT photos_json FROM posts_facts WHERE id = 6201").get() as any;
  expect(JSON.parse(row.photos_json)).toEqual(["telegram_UQ-big1.jpg"]);
  expect(await kv.get("tg:id:UQ-big1")).toBe("big1");
  const job = store.db.prepare("SELECT * FROM classification_jobs WHERE file_name = 'telegram_UQ-big1.jpg'").get() as any;
  expect(job?.status).toBe("pending");
});

test("reply with text merges into photo-only parent, keeping its photos", async () => {
  const d = deps();
  await ingestUpdate(store, post(6202, { photo: [{ file_id: "f1", file_unique_id: "u1" }] }), "TOK", d, cacheDir);
  const reply = {
    update_id: 1101,
    channel_post: {
      message_id: 6203,
      chat: channel,
      date: 1794500060,
      text: "Nice shot!",
      reply_to_message: { message_id: 6202, chat: channel },
    },
  };
  await ingestUpdate(store, reply, "TOK", d, cacheDir);
  const facts = store.db.prepare("SELECT * FROM posts_facts WHERE id = 6202 ORDER BY tx_id").all() as any[];
  expect(facts.length).toBe(2);
  expect(facts[1].text).toBe("Nice shot!");
  expect(JSON.parse(facts[1].photos_json)).toEqual(["telegram_UQ-f1.jpg"]);
  expect(store.db.prepare("SELECT COUNT(*) c FROM posts_facts WHERE id = 6203").get().c).toBe(0);
});

test("reply to text-bearing parent becomes its own record", async () => {
  const d = deps();
  await ingestUpdate(store, post(6204, { text: "Original caption" }), "TOK", d, cacheDir);
  const reply = {
    update_id: 1102,
    channel_post: {
      message_id: 6205,
      chat: channel,
      date: 1794500061,
      text: "A comment",
      reply_to_message: { message_id: 6204, chat: channel },
    },
  };
  await ingestUpdate(store, reply, "TOK", d, cacheDir);
  const parent = store.db.prepare("SELECT text FROM posts_facts WHERE id = 6204 ORDER BY tx_id DESC LIMIT 1").get() as any;
  expect(parent.text).toBe("Original caption");
  expect(store.db.prepare("SELECT COUNT(*) c FROM posts_facts WHERE id = 6205").get().c).toBe(1);
});

test("non-channel update: raw fact only, no posts fact", async () => {
  const r = await ingestUpdate(store, { update_id: 1103, message: { message_id: 1, chat: { id: 123, type: "private" }, text: "hi" } }, "TOK", deps(), cacheDir);
  expect(r.reason).toBe("not-channel-post");
  expect(store.count("telegram_raw_facts")).toBe(1);
  expect(store.count("posts_facts")).toBe(0);
});

test("duplicate update_id: raw fact stays single", async () => {
  const u = post(6206, { text: "once" });
  await ingestUpdate(store, u, "TOK", deps(), cacheDir);
  await ingestUpdate(store, u, "TOK", deps(), cacheDir);
  expect(store.count("telegram_raw_facts")).toBe(1);
});

test("pollOnce ingests a batch and advances the offset watermark", async () => {
  const d = deps({
    fetchUpdates: async () => ({
      ok: true,
      result: [post(6210, { text: "a" }), post(6211, { text: "b" })],
    }),
  });
  const report = await pollOnce(store, "TOK", d, cacheDir);
  expect(report.polled).toBe(2);
  expect(report.offset).toBe(7212); // max(update_id 7211) + 1
  expect(store.metaGet("tg:offset")).toBe("7212");
});

test("pollOnce with empty result keeps offset", async () => {
  const d = deps();
  store.metaSet("tg:offset", "500");
  const report = await pollOnce(store, "TOK", d, cacheDir);
  expect(report.polled).toBe(0);
  expect(report.offset).toBe(500);
});

test("pollOnce surfaces API failure", async () => {
  const d = deps({ fetchUpdates: async () => ({ ok: false, description: "409 Conflict: webhook is active" }) });
  expect(pollOnce(store, "TOK", d, cacheDir)).rejects.toThrow("409");
});

test("pollOnce self-heals a re-armed webhook: deletes it, retries, ingests", async () => {
  let calls = 0;
  let webhookDeleted = 0;
  const d = deps({
    fetchUpdates: async () => {
      calls++;
      if (calls === 1) return { ok: false, description: "Conflict: terminated by other getUpdates request; webhook is active" };
      return { ok: true, result: [post(6215, { text: "after heal" })] };
    },
    deleteWebhook: async () => {
      webhookDeleted++;
      return { ok: true };
    },
  });
  const report = await pollOnce(store, "TOK", d, cacheDir);
  expect(webhookDeleted).toBe(1);
  expect(report.polled).toBe(1);
  expect(report.newPosts).toBe(1);
  expect(report.offset).toBe(7216);
  expect(store.db.prepare("SELECT text FROM posts_facts WHERE id = 6215").get().text).toBe("after heal");
});

test("FileKV: put/get, json type, TTL expiry, delete", async () => {
  await kv.put("k1", "v1");
  expect(await kv.get("k1")).toBe("v1");
  await kv.put("k2", JSON.stringify({ a: 1 }), { expirationTtl: 3600 });
  expect(await kv.get("k2", "json")).toEqual({ a: 1 });
  await kv.put("k3", "exp", { expirationTtl: -1 });
  expect(await kv.get("k3")).toBeNull();
  await kv.delete("k1");
  expect(await kv.get("k1")).toBeNull();
});

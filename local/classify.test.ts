/**
 * Classifier contract tests — drain semantics, retry/backoff, insert shape.
 * Zero network: the classify function is injected.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteStore } from "./sqlite-store";
import { enqueueJob, drainJobs, type ClassifyDeps } from "./classify";

let dir: string;
let store: SqliteStore;
let cacheDir: string;
let calls: string[] = [];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rcns-cls-"));
  store = new SqliteStore(join(dir, "t.sqlite"));
  cacheDir = join(dir, "media-cache");
  mkdirSync(cacheDir, { recursive: true });
  calls = [];
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function seedPhoto(fileName: string): void {
  writeFileSync(join(cacheDir, fileName), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01]));
}

const okDeps: ClassifyDeps = {
  classify: async (b64) => {
    calls.push(b64.slice(0, 8));
    return JSON.stringify({ type: "EVENT_POSTER", snippet: "A test poster" });
  },
};

test("enqueueJob is idempotent per file_name", () => {
  expect(enqueueJob(store, "telegram_a.jpg")).toBeGreaterThan(0);
  expect(enqueueJob(store, "telegram_a.jpg")).toBeNull();
  const rows = store.db.prepare("SELECT COUNT(*) c FROM classification_jobs").get() as any;
  expect(rows.c).toBe(1);
});

test("drain classifies an existing photo and writes the media_fact", async () => {
  seedPhoto("telegram_a.jpg");
  enqueueJob(store, "telegram_a.jpg");
  const report = await drainJobs(store, {}, cacheDir, okDeps);
  expect(report.done).toBe(1);
  expect(calls.length).toBe(1);
  const fact = store.db.prepare("SELECT * FROM media_facts WHERE file_name = 'telegram_a.jpg'").get() as any;
  expect(fact.type).toBe("EVENT_POSTER");
  expect(fact.snippet).toBe("A test poster");
  expect(fact.raw_data).toContain("EVENT_POSTER");
  const job = store.db.prepare("SELECT status FROM classification_jobs WHERE file_name = 'telegram_a.jpg'").get() as any;
  expect(job.status).toBe("done");
});

test("drain skips a photo with no local bytes (no attempt burn)", async () => {
  enqueueJob(store, "telegram_missing.jpg");
  const report = await drainJobs(store, {}, cacheDir, okDeps);
  expect(report.skipped).toBe(1);
  expect(report.done).toBe(0);
  const job = store.db.prepare("SELECT attempts, status FROM classification_jobs").get() as any;
  expect(job.attempts).toBe(0);
  expect(job.status).toBe("pending");
});

test("failures back off and the job fails after three attempts", async () => {
  seedPhoto("telegram_b.jpg");
  enqueueJob(store, "telegram_b.jpg");
  const failing: ClassifyDeps = { classify: async () => { calls.push("x"); throw new Error("boom"); } };

  await drainJobs(store, {}, cacheDir, failing); // attempt 1
  let job = store.db.prepare("SELECT attempts, status, next_attempt_at FROM classification_jobs").get() as any;
  expect(job.attempts).toBe(1);
  expect(job.status).toBe("pending");
  expect(job.next_attempt_at).not.toBeNull();

  // Simulate time passing: backoff makes the job not-due until cleared.
  const due = () => store.db.prepare("UPDATE classification_jobs SET next_attempt_at = NULL").run();
  due();
  await drainJobs(store, {}, cacheDir, failing); // attempt 2
  due();
  await drainJobs(store, {}, cacheDir, failing); // attempt 3 → failed
  job = store.db.prepare("SELECT attempts, status, last_error FROM classification_jobs").get() as any;
  expect(job.attempts).toBe(3);
  expect(job.status).toBe("failed");
  expect(job.last_error).toContain("boom");
  expect(calls.length).toBe(3);
});

test("backoff delay keeps a job out of the next drain until due", async () => {
  seedPhoto("telegram_c.jpg");
  enqueueJob(store, "telegram_c.jpg");
  const failing: ClassifyDeps = { classify: async () => { throw new Error("nope"); } };
  await drainJobs(store, {}, cacheDir, failing);
  // Immediately again: next_attempt_at is in the future → not considered.
  const report = await drainJobs(store, {}, cacheDir, failing);
  expect(report.considered).toBe(0);
});

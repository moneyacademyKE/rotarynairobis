/**
 * Publishes the last 100 media items from D1 directly to the Cloudflare
 * rcns-classify-queue using the Cloudflare REST API.
 *
 * Runs entirely via wrangler auth — no TELEGRAM_SECRET_TOKEN needed.
 * The queue worker on Cloudflare does the actual Gemini classification.
 *
 * Usage:
 *   bunx wrangler d1 execute ... (to get file list)
 *   Then calls CF API to publish messages in batches of 10.
 */

import { execSync } from "child_process";

const ACCOUNT_ID  = "c61fd30bce61d2d26de34db53b001e3d";
const QUEUE_ID    = "76fb6aab53b0415f9b97a555bd8173ad";
const WORKER_URL  = "https://rotarynairobis.iamkingori.workers.dev";
const BATCH_SIZE  = 10;   // CF Queues REST API max per call is 100, we use 10 for safety
const countIdx = process.argv.indexOf("--count");
const LIMIT = countIdx !== -1 ? parseInt(process.argv[countIdx + 1], 10) : 100;

// ── Step 1: Query D1 for the last N file names ────────────────────────────────

console.log(`\n📋  Fetching last ${LIMIT} file names from D1...\n`);

const raw = execSync(
  `bunx wrangler d1 execute rcns_db --remote --json --command ` +
  `"SELECT DISTINCT m.file_name FROM posts p ` +
  `JOIN json_each(p.photos_json) AS je ` +
  `JOIN media m ON m.file_name = je.value ` +
  `WHERE m.type != 'FAILED' ` +
  `ORDER BY p.created_at DESC, p.id DESC ` +
  `LIMIT ${LIMIT}"`,
  { encoding: "utf8", cwd: process.cwd() }
);

const parsed = JSON.parse(raw);
const fileNames: string[] = parsed[0].results.map((r: { file_name: string }) => r.file_name);
console.log(`  Found ${fileNames.length} files.\n`);

// ── Step 2: Get CF API token from wrangler ────────────────────────────────────
// wrangler stores the token in ~/.wrangler/config/default.toml — read it.

import fs from "fs";
import os from "os";
import path from "path";

function getCFToken(): string {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;

  // Check macOS Preferences path first, then Linux default
  const candidates = [
    path.join(os.homedir(), "Library", "Preferences", ".wrangler", "config", "default.toml"),
    path.join(os.homedir(), ".wrangler", "config", "default.toml"),
  ];

  for (const configPath of candidates) {
    if (!fs.existsSync(configPath)) continue;
    const content = fs.readFileSync(configPath, "utf8");
    const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) return match[1];
    const apiMatch = content.match(/api_token\s*=\s*"([^"]+)"/);
    if (apiMatch) return apiMatch[1];
  }

  throw new Error(
    "No CF API token found. Set CLOUDFLARE_API_TOKEN env var or run `bunx wrangler login`."
  );
}

const CF_TOKEN = getCFToken();

// ── Step 3: Publish messages to queue via REST API ────────────────────────────

const QUEUE_API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/queues/${QUEUE_ID}/messages/batch`;

async function publishBatch(batch: string[]): Promise<void> {
  const messages = batch.map(fileName => ({
    body: {
      fileName,
      imageUrl: `${WORKER_URL}/photos/${fileName}`,
    },
    content_type: "json",
  }));

  const res = await fetch(QUEUE_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CF API error ${res.status}: ${err}`);
  }
}

console.log(`🚀  Publishing ${fileNames.length} messages to rcns-classify-queue in batches of ${BATCH_SIZE}...\n`);

let published = 0;
for (let i = 0; i < fileNames.length; i += BATCH_SIZE) {
  const batch = fileNames.slice(i, i + BATCH_SIZE);
  await publishBatch(batch);
  published += batch.length;
  console.log(`  ✓ [${published}/${fileNames.length}] batch published`);
}

console.log(`\n✅  Done — ${published} messages enqueued on Cloudflare.`);
console.log(`   The queue worker will classify each image with the updated Gemini prompt.`);
console.log(`   Monitor progress: bunx wrangler tail --format=pretty\n`);

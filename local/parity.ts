/**
 * Parity check: local-built gallery JSON vs what the live site serves from KV.
 *
 * Expected-benign diff: rows that arrived AFTER the last nightly KV publish
 * (local is always newer than last night's snapshot). Real divergence shows
 * as local-only ids OLDER than the served set, or served rows missing
 * locally — those mean the builders disagree.
 *
 * Run: `bun local/parity.ts` (needs env: RCNS_KV_NAMESPACE + Cloudflare creds)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_OUT_DIR } from "./sqlite-store";

const FILE_FOR: Record<string, string> = {
  "gallery:tiktok": "gallery-tiktok.json",
  "gallery:instagram": "gallery-instagram.json",
  "gallery:birthdays": "gallery-birthdays.json",
  "gallery:recaps": "gallery-recaps.json",
  "gallery:events": "gallery-events.json",
};

async function kvGet(key: string): Promise<string | null> {
  const ns = process.env.RCNS_KV_NAMESPACE;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!ns || !account) throw new Error("RCNS_KV_NAMESPACE + CLOUDFLARE_ACCOUNT_ID required");
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: {
      "X-Auth-Email": process.env.CLOUDFLARE_EMAIL!,
      "X-Auth-Key": process.env.CLOUDFLARE_API_KEY!,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`KV HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.text();
}

interface Row {
  id: number;
  created_at?: string;
  [k: string]: unknown;
}

function rowKey(r: Row): string {
  const photo = (r.file_name ?? r.photo_src) as string | undefined;
  return `${r.id}:${photo ?? ""}`;
}

const verdict = (
  localOnly: string[],
  servedOnly: string[],
  shared: number,
  mismatches: number,
) => {
  if (localOnly.length === 0 && servedOnly.length === 0 && mismatches === 0) return "IDENTICAL";
  if (mismatches > 0) return "DIVERGENT (shared row values differ)";
  // Sliding window: local picked up post-publish arrivals at the top, pushing
  // the same count of pre-publish rows off the 200 cap. Benign by definition
  // when every local-only id is newer than every served-only id.
  const localOnlyIds = localOnly.map((k) => Number(k.split(":")[0]));
  const servedOnlyIds = servedOnly.map((k) => Number(k.split(":")[0]));
  const windowShift =
    localOnlyIds.length === servedOnly.length &&
    (servedOnlyIds.length === 0 ||
      (localOnlyIds.length > 0 &&
        Math.min(...localOnlyIds) > Math.max(...servedOnlyIds)));
  if (windowShift) return "BENIGN (sliding window: post-publish arrivals)";
  return "DIVERGENT";
};

if (import.meta.main) {
  for (const [key, file] of Object.entries(FILE_FOR)) {
    const served = await kvGet(key);
    if (served === null) {
      console.log(`${key}: KV MISS (key absent)`);
      continue;
    }
    const local: Row[] = JSON.parse(readFileSync(join(DEFAULT_OUT_DIR, file), "utf8"));
    const remote: Row[] = JSON.parse(served);
    const localMap = new Map(local.map((r) => [rowKey(r), r]));
    const remoteMap = new Map(remote.map((r) => [rowKey(r), r]));
    const localOnly = [...localMap.keys()].filter((k) => !remoteMap.has(k));
    const servedOnly = [...remoteMap.keys()].filter((k) => !localMap.has(k));
    let mismatches = 0;
    let firstMismatch = "";
    for (const [k, lr] of localMap) {
      const rr = remoteMap.get(k);
      if (rr === undefined) continue;
      const lKeys = Object.keys(lr).sort();
      const rKeys = Object.keys(rr).sort();
      if (
        lKeys.join(",") !== rKeys.join(",") ||
        lKeys.some((f) => String(lr[f]) !== String(rr[f]))
      ) {
        mismatches++;
        if (!firstMismatch) firstMismatch = `${k}: local[${lKeys.map((f) => `${f}=${String(lr[f]).slice(0, 40)}`).join(" ")}] vs served[${rKeys.map((f) => `${f}=${String(rr[f]).slice(0, 40)}`).join(" ")}]`;
      }
    }
    console.log(
      `${key}: ${verdict(localOnly, servedOnly, 0, mismatches)} (built ${local.length} / served ${remote.length})` +
        (localOnly.length ? ` · local-only(${localOnly.length}): ${localOnly.slice(0, 3).join(", ")}` : "") +
        (servedOnly.length ? ` · served-only(${servedOnly.length}): ${servedOnly.slice(0, 3).join(", ")}` : "") +
        (firstMismatch ? ` · VALUE MISMATCH: ${firstMismatch}` : ""),
    );
  }
}

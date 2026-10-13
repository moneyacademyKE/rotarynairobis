/**
 * Parity check: build all five galleries from live D1 facts with the new
 * in-memory builder and diff against the KV values the site serves today.
 * Exit 0 = byte-identical. Run: bun run scripts/verify-gallery-parity.ts
 * (env: CLOUDFLARE_EMAIL / CLOUDFLARE_API_KEY / CLOUDFLARE_ACCOUNT_ID)
 */
import { buildGallery, latestFacts, GALLERY_KEYS } from "../src/lib/gallery";

const { CLOUDFLARE_EMAIL, CLOUDFLARE_API_KEY, CLOUDFLARE_ACCOUNT_ID } = process.env;
const DB = "2353e3b0-47a4-4fad-bbdf-11d02e3037d6";
const KV = "f92d9b7c7de04b4eaa0fba93f36c95bb";
const H = { "X-Auth-Email": CLOUDFLARE_EMAIL!, "X-Auth-Key": CLOUDFLARE_API_KEY! };

async function d1(sql: string) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${DB}/query`,
    { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ sql }) }
  );
  const d: any = await r.json();
  if (!d.success) throw new Error(JSON.stringify(d.errors));
  return { rows: d.result[0].results, rowsRead: d.result[0].meta.rows_read };
}

async function kv(key: string) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(key)}`,
    { headers: H }
  );
  if (!r.ok) throw new Error(`kv ${key}: ${r.status}`);
  return r.json();
}

const pf = await d1("SELECT * FROM posts_facts");
const mf = await d1("SELECT * FROM media_facts");
console.log(`facts read: ${pf.rowsRead + mf.rowsRead} rows (posts ${pf.rowsRead} + media ${mf.rowsRead})`);

const posts = latestFacts(pf.rows, "id");
const media = new Map(latestFacts(mf.rows, "file_name").map((m: any) => [m.file_name, m]));

let fail = 0;
for (const key of GALLERY_KEYS) {
  const built = buildGallery(posts as any, media as any, key);
  const served: any = await kv(key);
  const same = JSON.stringify(built) === JSON.stringify(served);
  if (!same) {
    fail++;
    const bIds = built.map((r: any) => `${r.id}:${r.file_name ?? r.photo_src}`);
    const sIds = (served as any[]).map((r: any) => `${r.id}:${r.file_name ?? r.photo_src}`);
    console.log(`${key}: MISMATCH built=${built.length} served=${served.length}`);
    console.log(`  only in built:  ${bIds.filter((x: string) => !sIds.includes(x)).slice(0, 5)}`);
    console.log(`  only in served: ${sIds.filter((x: string) => !bIds.includes(x)).slice(0, 5)}`);
  } else {
    console.log(`${key}: identical (${built.length} rows)`);
  }
}
process.exit(fail ? 1 : 0);

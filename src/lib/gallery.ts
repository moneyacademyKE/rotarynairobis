/**
 * Gallery read models, built in memory instead of in SQL.
 *
 * Why: the posts/media views dedupe facts with ROW_NUMBER() window functions.
 * SQLite must materialize both views in full before joining, and a materialized
 * view carries no indexes — so JOIN json_each(p.photos_json) JOIN media became
 * an ~85K x 3.4K nested scan: 4.5M rows read per gallery, ~36M per nightly
 * publish, 7x the daily free quota gone in three seconds.
 *
 * The same result costs ~7K rows when the planner can use plain table scans:
 * read both fact tables once (indexed, no windows), dedupe latest-fact-per-
 * entity here, and emit exactly the row shape the old SQL produced.
 *
 * View semantics preserved: latest fact per entity (max tx_id); when that
 * latest fact is a retraction the entity vanishes entirely.
 */

export const GALLERY_KEYS = [
  "gallery:tiktok",
  "gallery:instagram",
  "gallery:birthdays",
  "gallery:recaps",
  "gallery:events",
] as const;
export type GalleryKey = (typeof GALLERY_KEYS)[number];

/** 48h — survives two missed publish nights before loaders fall through to D1. */
export const GALLERY_TTL_SECONDS = 172800;

const GALLERY_LIMIT = 200;

interface GallerySpec {
  mediaType: string;
  /** Column name the joined photo lands in (instagram historically differs). */
  photoField: "file_name" | "photo_src";
  /** events carries the classification metadata through to the route. */
  includeMediaMeta: boolean;
  /** Extra post-level filter (events excludes empty/legacy text). */
  postFilter?: (post: FactRow) => boolean;
}

const GALLERY_SPECS: Record<GalleryKey, GallerySpec> = {
  "gallery:tiktok": { mediaType: "EVENT_POSTER", photoField: "file_name", includeMediaMeta: false },
  "gallery:instagram": { mediaType: "PHOTO", photoField: "photo_src", includeMediaMeta: false },
  "gallery:birthdays": { mediaType: "BIRTHDAY", photoField: "file_name", includeMediaMeta: false },
  "gallery:recaps": { mediaType: "EVENT_RECAP", photoField: "file_name", includeMediaMeta: false },
  "gallery:events": {
    mediaType: "EVENT_POSTER",
    photoField: "file_name",
    includeMediaMeta: true,
    postFilter: (p) =>
      typeof p.text === "string" &&
      p.text !== "" &&
      !p.text.startsWith("Legacy media archive"),
  },
};

export interface FactRow {
  [k: string]: unknown;
}

/** Latest non-retracted fact per entity key — mirrors the view definitions. */
export function latestFacts(rows: FactRow[], entityKey: string): FactRow[] {
  const byEntity = new Map<unknown, FactRow>();
  for (const row of rows) {
    const key = row[entityKey];
    const prev = byEntity.get(key);
    if (!prev || Number(row.tx_id) > Number(prev.tx_id)) byEntity.set(key, row);
  }
  return [...byEntity.values()].filter((r) => !r.is_retraction);
}

/** Read both fact tables with two plain scans (~7K rows total, no windows). */
export async function loadFacts(env: any): Promise<{ posts: FactRow[]; media: Map<unknown, FactRow> }> {
  const [pf, mf] = await Promise.all([
    env.DB.prepare("SELECT * FROM posts_facts").all(),
    env.DB.prepare("SELECT * FROM media_facts").all(),
  ]);
  const posts = latestFacts(pf.results || [], "id");
  const mediaRows = latestFacts(mf.results || [], "file_name");
  const media = new Map<unknown, FactRow>();
  for (const m of mediaRows) media.set(m.file_name, m);
  return { posts, media };
}

function parsePhotos(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** SQLite BINARY collation, DESC: larger first, NULL/empty last. */
function desc(a: unknown, b: unknown): number {
  const x = a == null ? "" : String(a);
  const y = b == null ? "" : String(b);
  return x === y ? 0 : x > y ? -1 : 1;
}

/** Numeric DESC for id columns — string compare would sort 9 above 10. */
function numDesc(a: unknown, b: unknown): number {
  return Number(b ?? 0) - Number(a ?? 0);
}

/**
 * Build one gallery's rows: one row per (post, matching photo), sorted
 * created_at DESC, id DESC, limited — identical to the old SQL's output.
 */
export function buildGallery(posts: FactRow[], media: Map<unknown, FactRow>, key: GalleryKey): FactRow[] {
  const spec = GALLERY_SPECS[key];
  const rows: FactRow[] = [];
  for (const post of posts) {
    if (spec.postFilter && !spec.postFilter(post)) continue;
    for (const photo of parsePhotos(post.photos_json)) {
      const m = media.get(photo);
      if (!m || m.type !== spec.mediaType) continue;
      const row: FactRow = {
        id: post.id,
        text: post.text,
        account: post.account,
        photos_json: post.photos_json,
        hashtags_json: post.hashtags_json,
        created_at: post.created_at,
        [spec.photoField]: photo,
      };
      if (spec.includeMediaMeta) {
        row.snippet = m.snippet;
        row.type = m.type;
      }
      rows.push(row);
    }
  }
  rows.sort((a, b) => desc(a.created_at, b.created_at) || numDesc(a.id, b.id));
  return rows.slice(0, GALLERY_LIMIT);
}

/** KV read-through; on a miss, build from facts and refill. Never throws on KV. */
export async function getGallery(env: any, key: GalleryKey): Promise<FactRow[]> {
  try {
    const hit = await env.CACHE?.get(key, "json");
    if (Array.isArray(hit)) return hit;
  } catch {
    // KV read failure — fall through to D1
  }
  const { posts, media } = await loadFacts(env);
  const rows = buildGallery(posts, media, key);
  try {
    await env.CACHE?.put(key, JSON.stringify(rows), { expirationTtl: GALLERY_TTL_SECONDS });
  } catch {
    // KV write failure — the render still has its rows
  }
  return rows;
}

export interface PublishReport {
  published: string[];
  failed: { key: string; error: string }[];
  rowsWritten: number;
  at: string;
}

/** Two D1 scans total, then all five galleries from memory. Never throws. */
export async function publishAll(env: any): Promise<PublishReport> {
  const published: string[] = [];
  const failed: PublishReport["failed"] = [];
  let rowsWritten = 0;

  let facts: { posts: FactRow[]; media: Map<unknown, FactRow> };
  try {
    facts = await loadFacts(env);
  } catch (e: any) {
    const error = e?.message || String(e);
    return { published, failed: GALLERY_KEYS.map((key) => ({ key, error })), rowsWritten: 0, at: new Date().toISOString() };
  }

  for (const key of GALLERY_KEYS) {
    try {
      const rows = buildGallery(facts.posts, facts.media, key);
      await env.CACHE.put(key, JSON.stringify(rows), { expirationTtl: GALLERY_TTL_SECONDS });
      rowsWritten += rows.length;
      published.push(key);
    } catch (e: any) {
      failed.push({ key, error: e?.message || String(e) });
    }
  }

  return { published, failed, rowsWritten, at: new Date().toISOString() };
}

/** Entry point for the cron trigger. Publishes and logs the receipt. */
export async function handleScheduled(env: any): Promise<PublishReport> {
  const report = await publishAll(env);
  console.log("[daily-publish]", JSON.stringify(report));
  return report;
}

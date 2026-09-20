/**
 * Daily publish pipeline: D1 -> KV, on a clock.
 *
 * The site reads finished gallery JSON from KV; this module is the
 * only writer. Every cache key the site serves has its SQL defined exactly
 * once in SOURCES — the routes project from the same map, so publisher and
 * renderers can never drift apart.
 *
 * Failure semantics: a per-key D1 error skips that write, leaving the
 * previous KV value serving until TTL — stale truth, never a blank gallery.
 * With a 48h TTL, two missed publish nights degrade to per-visit read-through
 * (db-cache) instead of empty pages.
 */

/** 48h — survives two missed cron nights before loaders fall through to D1. */
export const PUBLISH_TTL_SECONDS = 172800;

/**
 * The single source of truth for cached read models.
 * Keys are KV cache keys; values are the exact SQL the matching route serves.
 * Keep every query bounded — these run against the full archive on each publish.
 */
export const SOURCES: Record<string, string> = {
  "gallery:tiktok": `
    SELECT DISTINCT p.*, m.file_name AS file_name
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'EVENT_POSTER'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `,
  "gallery:instagram": `
    SELECT DISTINCT p.*, m.file_name as photo_src
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'PHOTO'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `,
  "gallery:birthdays": `
    SELECT DISTINCT p.*, m.file_name AS file_name
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'BIRTHDAY'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `,
  "gallery:recaps": `
    SELECT DISTINCT p.*, m.file_name AS file_name
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'EVENT_RECAP'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `,
  "gallery:events": `
    SELECT DISTINCT p.*, m.snippet, m.type, m.file_name AS file_name
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'EVENT_POSTER'
      AND p.text IS NOT NULL
      AND p.text != ''
      AND p.text NOT LIKE 'Legacy media archive%'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `,
};

export interface PublishReport {
  published: string[];
  failed: { key: string; error: string }[];
  rowsWritten: number;
  at: string;
}

/** Read every source once and write the finished rows to KV. Never throws. */
export async function publishAll(env: any): Promise<PublishReport> {
  const published: string[] = [];
  const failed: PublishReport["failed"] = [];
  let rowsWritten = 0;

  for (const [key, sql] of Object.entries(SOURCES)) {
    try {
      const { results } = await env.DB.prepare(sql).all();
      const rows = results || [];
      await env.CACHE.put(key, JSON.stringify(rows), {
        expirationTtl: PUBLISH_TTL_SECONDS,
      });
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

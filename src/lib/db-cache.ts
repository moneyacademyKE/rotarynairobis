/**
 * KV-backed cache for read-only page queries.
 *
 * Gallery content changes a few times a week; re-running the same JSON-fanout
 * query on every page view burns D1 reads to return identical rows. One small
 * indirection: key in, rows out. Cache failures must never break a render.
 */
export async function cachedQuery(
  env: any,
  key: string,
  sql: string,
  ttlSeconds = 3600
): Promise<any[]> {
  try {
    const hit = await env.CACHE?.get(key, "json");
    if (Array.isArray(hit)) return hit;
  } catch {
    // KV read failure — fall through to D1
  }

  const { results } = await env.DB.prepare(sql).all();
  const rows = results || [];

  try {
    await env.CACHE?.put(key, JSON.stringify(rows), { expirationTtl: ttlSeconds });
  } catch {
    // KV write failure — the render still has its rows
  }

  return rows;
}

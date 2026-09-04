import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * Administrative Reprocessing Endpoint
 * Fetches the last 50 visual media items from D1 and enqueues them 
 * back into the Gemini classification queue to trigger comprehensive reprocessing.
 * 
 * Bug C4 fixes:
 * (a) Changed from onGet to onPost — this is a mutating operation.
 * (b) Auth uses Authorization header (Bearer token) instead of query param.
 *     Fails-closed: returns 500 if TELEGRAM_SECRET_TOKEN is not configured.
 */
export const onPost: RequestHandler = async ({ request, platform, json }) => {
  const env = platform.env as any;

  // Security Boundary — fail-closed
  if (!env.TELEGRAM_SECRET_TOKEN) {
    json(500, { error: "TELEGRAM_SECRET_TOKEN not configured" });
    return;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${env.TELEGRAM_SECRET_TOKEN}`) {
    json(401, { error: "Unauthorized" });
    return;
  }

  try {
    // Optional limit from request body (default 50, cap 200)
    let limit = 50;
    try {
      const body = await request.clone().json() as { limit?: number };
      if (typeof body.limit === 'number' && body.limit > 0) {
        limit = Math.min(body.limit, 200);
      }
    } catch { /* no body or non-JSON — use default */ }

    // 1. Fetch the last N image posts
    const { results } = await env.DB.prepare(`
      SELECT DISTINCT p.id, m.file_name
      FROM posts p
      JOIN json_each(p.photos_json) AS je
      JOIN media m ON m.file_name = je.value
      WHERE (m.type IS NULL OR m.type != 'FAILED')
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${limit}
    `).all();

    // 2. Loop and dispatch each payload to the Cloudflare Queue binding
    const url = new URL(request.url);
    const origin = url.origin;
    let count = 0;
    
    for (const row of results as any) {
      await env.CLASSIFY_QUEUE.send({
        fileName: row.file_name,
        imageUrl: `${origin}/photos/${row.file_name}`
      });
      count++;
    }

    json(200, {
      status: "Success",
      message: `Enqueued ${count} images for Gemini reprocessing!`,
      enqueued_items: results.map((r: any) => r.file_name)
    });
  } catch (error: any) {
    console.error("AI Reprocessing Dispatch Failure:", error);
    json(500, { error: error.message });
  }
};

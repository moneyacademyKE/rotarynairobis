import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * Administrative Reprocessing Endpoint
 * Fetches the last 50 visual media items from D1 and enqueues them 
 * back into the Gemini classification queue to trigger comprehensive reprocessing.
 */
export const onGet: RequestHandler = async ({ request, platform, json }) => {
  const env = platform.env as any;
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  // Security Boundary
  if (env.TELEGRAM_SECRET_TOKEN && secret !== env.TELEGRAM_SECRET_TOKEN) {
    json(401, { error: "Unauthorized" });
    return;
  }

  try {
    // 1. Fetch the last 50 image posts
    const { results } = await env.DB.prepare(`
      SELECT p.id, m.file_name
      FROM posts p
      JOIN media m ON p.photos_json LIKE '%"' || m.file_name || '"%'
      WHERE m.type != 'FAILED'
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 50
    `).all();

    // 2. Loop and dispatch each payload to the Cloudflare Queue binding
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

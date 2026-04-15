import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * Invocation Endpoint for AI Processing
 * 
 * Secure boundary that accepts a filename and public image URL,
 * validates it, and pushes it into the CLASSIFY_QUEUE for background 
 * out-of-band execution by the Cloudflare Worker.
 */
export const onPost: RequestHandler = async ({ request, platform, json }) => {
  const apiKeyHeader = request.headers.get("Authorization");
  
  // Basic security boundary
  if (apiKeyHeader !== `Bearer ${platform.env.GEMINI_API_KEY}`) {
    json(401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await request.json() as { fileName: string; imageUrl: string };

    if (!body.fileName || !body.imageUrl) {
      json(400, { error: "fileName and imageUrl are required" });
      return;
    }

    // Push payload to Cloudflare Queue Worker
    await platform.env.CLASSIFY_QUEUE.send({
      fileName: body.fileName,
      imageUrl: body.imageUrl
    });

    // Fast return, 0 ms wait time. 
    // Data lands in D1 whenever the queue computes!
    json(202, { status: "Enqueued", payload: body });
  } catch {
    json(500, { error: "Failed to enqueue job" });
  }
};

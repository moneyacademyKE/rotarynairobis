import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * Invocation Endpoint for AI Processing
 * 
 * Secure boundary that accepts a filename and public image URL,
 * validates it, and pushes it into the CLASSIFY_QUEUE for background 
 * out-of-band execution by the Cloudflare Worker.
 *
 * Bug C7 fixes:
 * (a) Uses dedicated CLASSIFY_API_SECRET env var. Falls back to GEMINI_API_KEY
 *     for backwards compatibility with a console warning.
 * (b) Uses timing-safe comparison.
 */

/**
 * Performs a timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  
  const lenA = a.length;
  const lenB = b.length;
  let result = 0;
  
  const maxLen = Math.max(lenA, lenB);
  for (let i = 0; i < maxLen; i++) {
    const charA = i < lenA ? a.charCodeAt(i) : 0;
    const charB = i < lenB ? b.charCodeAt(i) : 0;
    result |= (charA ^ charB);
  }
  
  return result === 0 && lenA === lenB;
}

export const onPost: RequestHandler = async ({ request, platform, json }) => {
  const env = platform.env as any;
  const authHeader = request.headers.get("Authorization") || "";

  // Determine the expected secret, preferring CLASSIFY_API_SECRET
  let expectedSecret: string | undefined = env.CLASSIFY_API_SECRET;
  if (!expectedSecret) {
    if (env.GEMINI_API_KEY) {
      console.warn(
        "[classify] CLASSIFY_API_SECRET not set — falling back to GEMINI_API_KEY. " +
        "Please configure CLASSIFY_API_SECRET for production."
      );
      expectedSecret = env.GEMINI_API_KEY;
    } else {
      json(500, { error: "No auth secret configured (set CLASSIFY_API_SECRET)" });
      return;
    }
  }

  // Timing-safe auth comparison
  const expectedToken = `Bearer ${expectedSecret}`;
  const isAuthorized = timingSafeEqual(authHeader, expectedToken);
  if (!isAuthorized) {
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
    await env.CLASSIFY_QUEUE.send({
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

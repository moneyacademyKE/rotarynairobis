import type { RequestHandler } from "@builder.io/qwik-city";
import rotaryBasics from "../../../data/rotary-basics.json";
import rcnsProfile from "../../../data/rcns-profile.json";
import riHistory from "../../../data/ri-history.json";

/**
 * Lightweight Sync API Endpoint
 * 
 * Returns:
 * 1. New Facts: Appended posts and media facts since a given tx_id or timestamp.
 * 2. Static Pages: rotary-basics.json, rcns-profile.json, and ri-history.json.
 */
export const onGet: RequestHandler = async ({ request, platform, json }) => {
  const env = platform.env as any;

  if (!env || !env.DB) {
    json(500, { error: "Database binding DB not configured" });
    return;
  }

  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const postsTxId = parseInt(url.searchParams.get("posts_tx_id") || "0", 10) || 0;
  const mediaTxId = parseInt(url.searchParams.get("media_tx_id") || "0", 10) || 0;
  const includeStatic = url.searchParams.get("include_static") !== "false";

  try {
    let postsFacts: any[] = [];
    let mediaFacts: any[] = [];

    // Query facts
    if (since) {
      // Sync by timestamp
      const postsRes = await env.DB.prepare(`
        SELECT tx_id, id, text, account, photos_json, hashtags_json, is_retraction, created_at
        FROM posts_facts
        WHERE created_at > ?
        ORDER BY tx_id ASC
      `).bind(since).all();
      postsFacts = postsRes.results || [];

      const mediaRes = await env.DB.prepare(`
        SELECT tx_id, file_name, type, snippet, raw_data, is_retraction, created_at
        FROM media_facts
        WHERE created_at > ?
        ORDER BY tx_id ASC
      `).bind(since).all();
      mediaFacts = mediaRes.results || [];
    } else {
      // Sync by Transaction ID (default)
      const postsRes = await env.DB.prepare(`
        SELECT tx_id, id, text, account, photos_json, hashtags_json, is_retraction, created_at
        FROM posts_facts
        WHERE tx_id > ?
        ORDER BY tx_id ASC
      `).bind(postsTxId).all();
      postsFacts = postsRes.results || [];

      const mediaRes = await env.DB.prepare(`
        SELECT tx_id, file_name, type, snippet, raw_data, is_retraction, created_at
        FROM media_facts
        WHERE tx_id > ?
        ORDER BY tx_id ASC
      `).bind(mediaTxId).all();
      mediaFacts = mediaRes.results || [];
    }

    // Retrieve highest tx_id boundaries for state tracking
    const maxPostsDb = await env.DB.prepare("SELECT MAX(tx_id) as max_id FROM posts_facts").first("max_id");
    const maxMediaDb = await env.DB.prepare("SELECT MAX(tx_id) as max_id FROM media_facts").first("max_id");

    const latestPostsTxId = maxPostsDb !== null && maxPostsDb !== undefined ? Number(maxPostsDb) : postsTxId;
    const latestMediaTxId = maxMediaDb !== null && maxMediaDb !== undefined ? Number(maxMediaDb) : mediaTxId;

    // Build the sync response package
    const response: Record<string, any> = {
      facts: {
        posts: postsFacts,
        media: mediaFacts
      },
      meta: {
        latest_posts_tx_id: latestPostsTxId,
        latest_media_tx_id: latestMediaTxId,
        server_time: new Date().toISOString()
      }
    };

    if (includeStatic) {
      response.static = {
        rotaryBasics,
        rcnsProfile,
        riHistory
      };
    }

    json(200, response);
  } catch (error: any) {
    json(500, { error: error.message || "Failed to execute sync query" });
  }
};

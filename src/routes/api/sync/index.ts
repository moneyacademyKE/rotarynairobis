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

  // Hard cap per sync response. A client with reset state (tx_id = 0) or a
  // stale `since` timestamp must never trigger a full-table pull — that is
  // how a marketing site burns a D1 free tier before breakfast.
  const SYNC_PAGE_SIZE = 500;

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

    // Fetch one extra row to detect truncation; the extra row never reaches
    // the client — it only tells meta to park the cursor at the last row sent.
    const fetchFacts = async (sql: string, params: any[]) => {
      const res = await env.DB.prepare(sql).bind(...params, SYNC_PAGE_SIZE + 1).all();
      const rows = res.results || [];
      const truncated = rows.length > SYNC_PAGE_SIZE;
      return { rows: truncated ? rows.slice(0, SYNC_PAGE_SIZE) : rows, truncated };
    };

    let postsTruncated = false;
    let mediaTruncated = false;

    // Query facts
    if (since) {
      // Sync by timestamp (indexed by idx_*_facts_created)
      const postsRes = await fetchFacts(`
        SELECT tx_id, id, text, account, photos_json, hashtags_json, is_retraction, created_at
        FROM posts_facts
        WHERE created_at > ?
        ORDER BY tx_id ASC
        LIMIT ?
      `, [since]);
      postsFacts = postsRes.rows;
      postsTruncated = postsRes.truncated;

      const mediaRes = await fetchFacts(`
        SELECT tx_id, file_name, type, snippet, raw_data, is_retraction, created_at
        FROM media_facts
        WHERE created_at > ?
        ORDER BY tx_id ASC
        LIMIT ?
      `, [since]);
      mediaFacts = mediaRes.rows;
      mediaTruncated = mediaRes.truncated;
    } else {
      // Sync by Transaction ID (default, primary-key seek)
      const postsRes = await fetchFacts(`
        SELECT tx_id, id, text, account, photos_json, hashtags_json, is_retraction, created_at
        FROM posts_facts
        WHERE tx_id > ?
        ORDER BY tx_id ASC
        LIMIT ?
      `, [postsTxId]);
      postsFacts = postsRes.rows;
      postsTruncated = postsRes.truncated;

      const mediaRes = await fetchFacts(`
        SELECT tx_id, file_name, type, snippet, raw_data, is_retraction, created_at
        FROM media_facts
        WHERE tx_id > ?
        ORDER BY tx_id ASC
        LIMIT ?
      `, [mediaTxId]);
      mediaFacts = mediaRes.rows;
      mediaTruncated = mediaRes.truncated;
    }

    // Retrieve highest tx_id boundaries for state tracking
    const maxPostsDb = await env.DB.prepare("SELECT MAX(tx_id) as max_id FROM posts_facts").first("max_id");
    const maxMediaDb = await env.DB.prepare("SELECT MAX(tx_id) as max_id FROM media_facts").first("max_id");

    // When truncated, the cursor must stop at the last row actually sent —
    // otherwise the client would skip the unsent remainder on its next poll.
    const latestPostsTxId = postsTruncated && postsFacts.length > 0
      ? Number(postsFacts[postsFacts.length - 1].tx_id)
      : (maxPostsDb !== null && maxPostsDb !== undefined ? Number(maxPostsDb) : postsTxId);
    const latestMediaTxId = mediaTruncated && mediaFacts.length > 0
      ? Number(mediaFacts[mediaFacts.length - 1].tx_id)
      : (maxMediaDb !== null && maxMediaDb !== undefined ? Number(maxMediaDb) : mediaTxId);

    // Build the sync response package
    const response: Record<string, any> = {
      facts: {
        posts: postsFacts,
        media: mediaFacts
      },
      meta: {
        latest_posts_tx_id: latestPostsTxId,
        latest_media_tx_id: latestMediaTxId,
        posts_truncated: postsTruncated,
        media_truncated: mediaTruncated,
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

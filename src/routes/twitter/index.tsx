import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows } from "../../domain/specs";

export const usePosts = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // Clean 'Home' feed: Text-only OR raw Photos (excluding Posters/Birthdays/Recaps)
  const { results } = await db.prepare(`
    SELECT p.* 
    FROM posts p
    LEFT JOIN media m ON p.photos_json LIKE '%"' || m.file_name || '"%'
    WHERE m.id IS NULL OR m.type = 'PHOTO'
    GROUP BY p.id
    ORDER BY p.id DESC
  `).all();
  return parseD1PostRows(results);
});

export default component$(() => {
  const posts = usePosts();
  
  return (
    <div class="twitter-feed">
      <header class="feed-header">
        <h1 class="heading">Home</h1>
      </header>
      
      {posts.value.map((post: any) => (
        <div key={post.id} class="feed-item">
          <div class="avatar"></div>
          <div class="post-content">
            <div class="post-header">
              <span class="account-name">{post.account || 'rcns'}</span>
              <span class="handle">@{post.account?.toLowerCase().replace(/\s+/g, '') || 'rcns'}</span>
              <span class="dot">·</span>
              <span class="date">{post.date}</span>
            </div>
            
            <div class="post-body">
              {post.isAnalytics ? (
                <div class="analytics-report">
                  <div class="report-header">📊 Statistics Report</div>
                  <pre class="report-content">{post.text.replace(/#\w+/g, '')}</pre>
                </div>
              ) : (
                <p class="post-text">{post.text.replace(/#\w+/g, '')}</p>
              )}
            </div>
            
            <div class="actions">
              <span class="action">💬 0</span>
              <span class="action">🔁 0</span>
              <span class="action">❤️ 0</span>
              <span class="action">📊 1.2K</span>
            </div>
          </div>
        </div>
      ))}

      <style dangerouslySetInnerHTML={`
        .twitter-feed {
          background-color: var(--bg-color);
        }
        .feed-header {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background-color: rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          z-index: 10;
        }
        .post-header {
          display: flex;
          gap: 4px;
          font-size: 15px;
          margin-bottom: 4px;
        }
        .account-name { font-weight: 700; }
        .handle, .dot, .date { color: var(--text-dim); }
        .post-text {
          font-size: 15px;
          white-space: pre-wrap;
          margin-bottom: 12px;
        }
        .media-grid {
          border-radius: 16px;
          overflow: hidden;
          background-color: var(--border-color);
          display: grid;
          gap: 2px;
          margin-bottom: 12px;
          position: relative;
        }
        .media-grid.count-1 { grid-template-columns: 1fr; }
        .media-grid.count-2 { grid-template-columns: 1fr 1fr; }
        .media-grid.count-3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
        .media-grid.count-3 .media-container:first-child { grid-row: span 2; }
        .media-grid.count-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
        
        .media-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        
        .actions {
          display: flex;
          justify-content: space-between;
          max-width: 425px;
          color: var(--text-dim);
          font-size: 13px;
        }
        
        .analytics-report {
          background-color: #16181c;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid #333;
        }
        .report-header {
          color: var(--accent-color);
          font-weight: 700;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .report-content {
          font-family: monospace;
          font-size: 12px;
          white-space: pre-wrap;
          color: #fff;
        }
        .more-indicator {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(0,0,0,0.7);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #fff;
        }
      `}></style>
    </div>
  );
});

import { component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { executeSearch } from "../../lib/search-service";

export const useSearchResults = routeLoader$(async ({ url, platform }) => {
  const db = platform.env.DB;
  const term = url.searchParams.get("q") || "";

  // Get all facts from D1 to perform client-side edge search via Orama
  const { results } = await db.prepare(`
    SELECT p.* 
    FROM posts p
    ORDER BY p.id DESC
  `).all();

  const searchResults = await executeSearch(results, term);
  return { results: searchResults, term };
});

export default component$(() => {
  const searchLoader = useSearchResults();
  const loc = useLocation();

  return (
    <div class="search-container">
      <header class="search-header">
        <h1 class="heading">Search</h1>
        
        <form method="get" action="/search/" class="search-form">
          <div class="input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              name="q" 
              value={searchLoader.value.term} 
              placeholder="Search fellowship, activities, milestones..." 
              class="search-input"
              autoComplete="off"
            />
            {searchLoader.value.term && (
              <a href="/search/" class="clear-button" aria-label="Clear Search">✕</a>
            )}
          </div>
        </form>
      </header>

      <main class="search-results">
        {searchLoader.value.term && (
          <div class="results-meta">
            Showing {searchLoader.value.results.length} results for "{searchLoader.value.term}"
          </div>
        )}

        {searchLoader.value.results.length === 0 ? (
          <div class="search-empty">
            <span class="empty-icon">📂</span>
            <h3>No results found</h3>
            <p>Try searching for different keywords like "fellowship", "tree", "birthday", or "service".</p>
          </div>
        ) : (
          searchLoader.value.results.map((post) => (
            <div key={post.id} class="feed-item search-item">
              <div class="avatar search-avatar"></div>
              <div class="post-content">
                <div class="post-header">
                  <span class="account-name">{post.account || 'rcns'}</span>
                  <span class="handle">@{post.account?.toLowerCase().replace(/\s+/g, '') || 'rcns'}</span>
                  <span class="dot">·</span>
                  <span class="date">Fact #{post.id}</span>
                </div>
                
                <div class="post-body">
                  <p class="post-text">{post.text ? post.text.replace(/#\w+/g, '') : ''}</p>
                  
                  {post.photos && post.photos.length > 0 && (
                    <div class={`media-grid count-${Math.min(post.photos.length, 4)}`}>
                      {post.photos.slice(0, 4).map((photo: string, idx: number) => (
                        <div key={idx} class="media-container">
                          <img 
                            src={`/photos/${photo}`} 
                            alt={`Search result visual ${idx + 1}`} 
                            loading="lazy"
                            width={500}
                            height={500}
                          />
                        </div>
                      ))}
                      {post.photos.length > 4 && (
                        <div class="more-indicator">+{post.photos.length - 4}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <style dangerouslySetInnerHTML={`
        .search-container {
          background-color: var(--bg-color);
          min-height: calc(100vh - var(--tab-height));
        }
        .search-header {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background-color: oklch(from var(--bg-color) l c h / 0.85);
          backdrop-filter: blur(12px);
          z-index: 10;
        }
        .search-form {
          margin-top: 12px;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background-color: oklch(from var(--bg-color) calc(l + 0.08) c h / 0.5);
          border: 1px solid var(--border-color);
          border-radius: 9999px;
          padding: 0 16px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .input-wrapper:focus-within {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px oklch(from var(--accent-color) l c h / 0.2);
        }
        .search-icon {
          color: var(--text-dim);
          margin-right: 8px;
          font-size: var(--font-size-sm);
        }
        .search-input {
          background: transparent;
          border: none;
          color: var(--text-color);
          width: 100%;
          padding: 12px 0;
          font-size: var(--font-size-base);
          font-family: var(--font-sans);
          outline: none;
        }
        .search-input::placeholder {
          color: var(--text-dim);
          opacity: 0.8;
        }
        .clear-button {
          color: var(--text-dim);
          font-weight: 700;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .clear-button:hover {
          color: var(--text-color);
        }
        
        .results-meta {
          padding: 12px 16px;
          font-size: var(--font-size-sm);
          color: var(--text-dim);
          border-bottom: 1px solid var(--border-color);
        }
        
        .search-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 32px;
          text-align: center;
          color: var(--text-dim);
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .search-empty h3 {
          color: var(--text-color);
          font-size: var(--font-size-lg);
          margin-bottom: 8px;
        }
        .search-empty p {
          max-width: 320px;
          font-size: var(--font-size-sm);
        }
        
        .search-item {
          border-bottom: 1px solid var(--border-color);
          padding: var(--space-md) var(--space-sm);
          display: flex;
          gap: var(--space-sm);
          animation: search-item-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .search-avatar {
          background-color: var(--border-color);
        }
        
        @keyframes search-item-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .media-grid {
          border-radius: 16px;
          overflow: hidden;
          background-color: var(--border-color);
          display: grid;
          gap: 2px;
          margin-top: 12px;
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

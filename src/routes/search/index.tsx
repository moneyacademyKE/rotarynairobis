import { component$, useContext, useStylesScoped$ } from "@builder.io/qwik";
import { routeLoader$, useLocation, useNavigate } from "@builder.io/qwik-city";
import { executeSearch } from "~/lib/search-service";
import { DrawerContext } from "~/routes/layout";
import { cleanPostText } from "~/routes/twitter";

export const useSearchResults = routeLoader$(async ({ url, platform }) => {
  const db = platform.env.DB;
  const term = url.searchParams.get("q") || "";

  // Get all facts from D1 to perform client-side edge search via Orama
  const { results } = await db.prepare(`
    SELECT p.* 
    FROM posts p
    ORDER BY p.created_at DESC, p.id DESC
  `).all();

  const searchResults = await executeSearch(results, term);
  return { results: searchResults, term };
});

export default component$(() => {
  const searchLoader = useSearchResults();
  const loc = useLocation();
  const drawerState = useContext(DrawerContext);
  const nav = useNavigate();

  useStylesScoped$(STYLES);

  return (
    <div class="search-container">
      <header class="search-header">
        {/* Visually hidden page title for screen readers and SEO */}
        <h1 class="heading">Search Database</h1>
        <p class="search-subtitle">Verify club history, event details, and photo archives.</p>
        
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
              aria-label="Search text box"
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
            <h3>{searchLoader.value.term ? 'No results found' : 'Start searching to explore the archive'}</h3>
            <p>{searchLoader.value.term
              ? 'Try searching for different keywords like "fellowship", "tree", "birthday", or "service".'
              : 'Enter a keyword above to search the club\'s history, events, and photo archives.'}
            </p>
            <div class="suggested-tags-wrapper">
              <span class="suggested-label">Or try searching for:</span>
              <div class="suggested-tags">
                {['fellowship', 'birthday', 'induction', 'tree', 'speaker', 'recap'].map((tag) => (
                  <button 
                    key={tag}
                    class="tag-pill-btn"
                    onClick$={() => {
                      nav(`/search/?q=${encodeURIComponent(tag)}`);
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div class="search-items-list">
            {searchLoader.value.results.map((post) => {
              const cleanedText = cleanPostText(post.text || "");
              const title = cleanedText 
                ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) 
                : `Search Fact #${post.id}`;

              return (
                <button
                  key={post.id} 
                  class="search-item"
                  onClick$={() => {
                    drawerState.isOpen = true;
                    drawerState.title = title;
                    drawerState.category = "Search Result";
                    drawerState.mediaSrc = post.photos && post.photos.length > 0 ? `/photos/${post.photos[0]}` : "";
                    drawerState.mediaType = "image";
                    drawerState.content = cleanedText;
                  }}
                >
                  <div class="avatar search-avatar"></div>
                  <div class="post-content">
                    <div class="post-header">
                      <span class="account-name">{post.account || 'rcns'}</span>
                      <span class="handle">@{post.account?.toLowerCase().replace(/\s+/g, '') || 'rcns'}</span>
                      <span class="dot">·</span>
                      <span class="date">Fact #{post.id}</span>
                    </div>
                    
                    <div class="post-body">
                      <h3 class="search-item-title">{title}</h3>
                      <p class="post-text">{cleanedText}</p>
                      
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
                    <div class="search-item-footer">
                      <span class="read-more-text">Inspect ledger entry</span>
                      <span class="read-more-arrow" aria-hidden="true">→</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
});

const STYLES = `
        .search-container {
          background-color: var(--bg-color);
          min-height: calc(100vh - var(--tab-height));
          padding: var(--space-md);
        }
        .search-header {
          padding: var(--space-md) 0;
          border-bottom: 1px dashed var(--border-subtle);
          background-color: var(--bg-color);
          margin-bottom: var(--space-md);
        }
        .heading {
          font-family: var(--font-serif);
          font-size: 2.2rem;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .search-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-bottom: var(--space-md);
        }
        .search-form {
          margin-top: 12px;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background-color: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          border-radius: 9999px;
          padding: 0 var(--space-md);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .input-wrapper:focus-within {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }
        .search-item {
          appearance: none;
          -webkit-appearance: none;
          display: flex;
          gap: var(--space-sm);
          padding: var(--space-md);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          cursor: pointer;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
          background-color: var(--bg-panel);
          width: 100%;
          text-align: left;
          font-family: var(--font-sans);
          color: var(--text-color);
          animation: search-item-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .search-item:hover {
          border-color: var(--border-focus);
        }
        .search-item:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 2px;
        }
        .search-icon {
          color: var(--text-muted);
          margin-right: var(--space-sm);
          font-size: 1rem;
        }
        .search-input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          width: 100%;
          padding: 14px 0;
          font-size: 1rem;
          font-family: var(--font-sans);
          /* outline managed by .input-wrapper:focus-within */
          outline: none;
        }
        .search-input::placeholder {
          color: var(--text-muted);
          opacity: 0.8;
        }
        .clear-button {
          color: var(--text-muted);
          font-weight: 700;
          cursor: pointer;
          padding: 4px;
          transition: color var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .clear-button:hover {
          color: var(--text-primary);
        }
        
        .results-meta {
          padding: var(--space-sm) 0;
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: var(--space-md);
        }
        
        .search-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 32px;
          text-align: center;
          color: var(--text-muted);
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .search-empty h3 {
          color: var(--text-primary);
          font-size: 1.25rem;
          margin-bottom: 8px;
        }
        .search-empty p {
          max-width: 320px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        
        .search-items-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .search-item {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: var(--space-md);
          display: flex;
          gap: var(--space-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          animation: search-item-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .search-item:hover {
          border-color: var(--border-focus);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--accent-glow);
        }
        
        .search-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--border-subtle);
          background-image: url('/favicon.png');
          background-size: cover;
          flex-shrink: 0;
        }
        
        .post-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          min-width: 0;
        }
        
        .post-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
        }
        
        .account-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .handle {
          color: var(--text-muted);
        }
        
        .dot {
          color: var(--text-muted);
        }
        
        .date {
          color: var(--text-muted);
        }
        
        .search-item-title {
          font-family: var(--font-serif);
          font-size: var(--font-size-lg);
          color: var(--accent-primary);
          font-weight: 500;
          margin: 0 0 8px 0;
          line-height: 1.25;
        }
        .post-text {
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--text-secondary);
          white-space: pre-wrap;
          margin-top: 0;
        }
        .suggested-tags-wrapper {
          margin-top: var(--space-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          width: 100%;
        }
        .suggested-label {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
          font-weight: 500;
        }
        .suggested-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          max-width: 450px;
          margin-top: 4px;
        }
        .tag-pill-btn {
          background: rgba(0, 103, 200, 0.15);
          border: 1px solid rgba(0, 103, 200, 0.3);
          color: var(--text-primary);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font-sans);
          font-weight: 500;
        }
        .tag-pill-btn:hover {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: var(--bg-obsidian);
          transform: translateY(-1px);
        }
        .tag-pill-btn:active {
          transform: scale(0.95);
        }
        
        @keyframes search-item-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .media-grid {
          border-radius: 12px;
          overflow: hidden;
          background-color: var(--border-subtle);
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
        
        .search-item-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.25rem;
          margin-top: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px dashed var(--border-subtle);
        }
        .search-item-footer .read-more-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
          transition: color var(--transition-fast);
        }
        .search-item-footer .read-more-arrow {
          font-size: 0.9rem;
          color: var(--text-muted);
          transition: transform var(--transition-fast), color var(--transition-fast);
        }
        .search-item:hover .search-item-footer .read-more-text {
          color: var(--accent-primary);
        }
        .search-item:hover .search-item-footer .read-more-arrow {
          color: var(--accent-primary);
          transform: translateX(4px);
        }
`;

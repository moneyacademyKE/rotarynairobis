import { component$, useContext, useStylesScoped$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { DrawerContext } from "~/routes/layout";
import { cleanPostText } from "~/routes/twitter";
import type { Post } from "~/domain/specs";

interface ReelFeedProps {
  posts: Post[];
  emptyMessage?: string;
  emptyIcon?: string;
  category?: string;
}

export const ReelFeed = component$<ReelFeedProps>((props) => {
  const drawerState = useContext(DrawerContext);
  const nav = useNavigate();

  useStylesScoped$(`
    .reel-feed {
      background-color: var(--bg-color);
      height: calc(100vh - var(--tab-height));
      position: relative;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: var(--space-md);
      color: var(--text-secondary);
      padding: var(--space-lg);
      background: transparent;
    }
    
    .empty-icon {
      font-size: 3rem;
      margin-bottom: var(--space-sm);
    }
    
    .empty-text {
      font-size: 1rem;
      color: var(--text-muted);
      text-align: center;
      max-width: 300px;
      margin-bottom: var(--space-md);
    }
    
    .suggested-destinations {
      margin-top: var(--space-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-xs);
      width: 100%;
    }
    
    .suggested-destinations-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .suggested-destinations-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }
    
    .suggested-destinations-pills .pill-btn {
      background: rgba(0, 103, 200, 0.15);
      border: 1px solid rgba(0, 103, 200, 0.3);
      color: var(--text-primary);
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--font-sans);
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .suggested-destinations-pills .pill-btn:hover {
      background: var(--accent-primary);
      border-color: var(--accent-primary);
      color: var(--bg-obsidian);
      transform: translateY(-1px);
    }
    
    .suggested-destinations-pills .pill-btn:active {
      transform: scale(0.95);
    }
    
    .snap-container {
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      scrollbar-width: none;
    }
    
    .snap-container::-webkit-scrollbar {
      display: none;
    }
    
    .reel-view {
      position: relative;
      background: #000;
      height: 100%;
      width: 100%;
      scroll-snap-align: start;
      scroll-snap-stop: always;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    /* Full-screen native button wrapper for the reel item */
    .reel-clickable-area {
      appearance: none;
      -webkit-appearance: none;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }

    .reel-clickable-area:focus-visible {
      outline: 3px solid var(--accent-primary);
      outline-offset: -3px;
    }

    .reel-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .reel-background img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: brightness(0.85);
      transition: transform var(--transition-smooth);
    }
    
    .reel-clickable-area:hover .reel-background img {
      transform: scale(1.02);
    }
    
    .reel-overlay {
      position: absolute;
      left: var(--space-md);
      right: var(--space-md);
      bottom: var(--space-md);
      padding: var(--space-md);
      background: rgba(15, 15, 15, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-md);
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }
    
    .reel-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .reel-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    
    .reel-author {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--accent-primary);
    }
    
    .reel-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
    }
    
    .reel-caption {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* reel-action-btn is now a decorative span (aria-hidden) — visual affordance only */
    .reel-action-btn {
      background: var(--accent-primary);
      color: #000;
      padding: 0.6rem 1.2rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 8px;
      white-space: nowrap;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    @media (max-width: 768px) {
      .reel-overlay {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-sm);
        left: var(--space-sm);
        right: var(--space-sm);
        bottom: var(--space-sm);
        padding: var(--space-sm);
      }
      .reel-action-btn {
        width: 100%;
      }
    }
  `);

  return (
    <div class="reel-feed snap-container">
      {props.posts.length === 0 ? (
        <div class="empty-state text-only">
          <span class="empty-icon">{props.emptyIcon || '🎬'}</span>
          <p class="empty-text">{props.emptyMessage || 'No content found'}</p>
          <button class="pill-btn active" onClick$={() => nav('.')} style="margin-bottom: var(--space-sm);">Refresh</button>
          
          <div class="suggested-destinations">
            <span class="suggested-destinations-label">Or explore other active channels:</span>
            <div class="suggested-destinations-pills">
              <a href="/recaps/" class="pill-btn">📅 Recaps</a>
              <a href="/instagram/" class="pill-btn">📷 Photos</a>
              <a href="/birthdays/" class="pill-btn">🎂 Birthdays</a>
            </div>
          </div>
        </div>
      ) : (
        props.posts.map((post) => {
          const cleanedText = cleanPostText(post.text || "");
          const title = cleanedText 
            ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 50) 
            : "Reel Details";
          const category = props.category || "Event Poster";

          return (
            <div key={post.id} class="snap-item reel-view">
              <button
                class="reel-clickable-area"
                onClick$={() => {
                  drawerState.isOpen = true;
                  drawerState.title = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : `${category} View`;
                  drawerState.category = category === 'Birthday' ? 'Birthday Celebration' : 'Event Poster';
                  drawerState.mediaSrc = post.photos.length > 0 ? `/photos/${post.photos[0]}` : '';
                  drawerState.mediaType = "image";
                  drawerState.content = cleanedText;
                }}
                aria-label={`View details for ${title}`}
              >
                <div class="reel-background">
                  {post.photos.length > 0 && (
                    <img 
                      src={`/photos/${post.photos[0]}`} 
                      alt={title} 
                      loading="lazy"
                      width={720}
                      height={1280}
                    />
                  )}
                </div>
                <div class="reel-overlay">
                  <div class="reel-info">
                    <div class="reel-meta">
                      <span class="reel-author">@{post.account || 'rcns'}</span>
                      <span class="reel-badge">{category}</span>
                    </div>
                    <p class="reel-caption">{cleanedText || 'Rotary Club of Nairobi South Activity'}</p>
                  </div>
                  <span class="reel-action-btn" aria-hidden="true">Read Post →</span>
                </div>
              </button>
            </div>
          );
        })
      )}


    </div>
  );
});

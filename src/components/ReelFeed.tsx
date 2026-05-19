import { component$, useContext } from "@builder.io/qwik";
import { DrawerContext } from "~/routes/layout";
import { cleanPostText } from "~/routes/twitter";
import type { Post } from "~/domain/specs";

interface ReelFeedProps {
  posts: Post[];
  emptyMessage?: string;
  emptyIcon?: string;
}

export const ReelFeed = component$<ReelFeedProps>((props) => {
  const drawerState = useContext(DrawerContext);

  return (
    <div class="reel-feed snap-container">
      {props.posts.length === 0 ? (
        <div class="empty-state text-only">
          <span class="empty-icon">{props.emptyIcon || '🎬'}</span>
          <p class="empty-text">{props.emptyMessage || 'No content found'}</p>
          <button class="pill-btn active" onClick$={() => window.location.reload()}>Refresh</button>
        </div>
      ) : (
        props.posts.map((post) => {
          const cleanedText = cleanPostText(post.text || "");
          const title = cleanedText 
            ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 50) 
            : "Reel Details";
          let category = "Event Poster";
          if (props.emptyIcon === "🎂") {
            category = "Birthday";
          } else if (props.emptyIcon === "🎞️") {
            category = "Event Recap";
          }

          return (
            <div key={post.id} class="snap-item reel-view">
              <div class="reel-background">
                <img 
                  src={`/photos/${post.photos[0]}`} 
                  alt={title} 
                  loading="lazy"
                  width={720}
                  height={1280}
                />
              </div>
              <div class="reel-overlay">
                <div class="reel-info">
                  <div class="reel-meta">
                    <span class="reel-author">@{post.account || 'rcns'}</span>
                    <span class="reel-badge">{category}</span>
                  </div>
                  <p class="reel-caption">{cleanedText || 'Rotary Club of Nairobi South Activity'}</p>
                </div>
                <button 
                  class="reel-action-btn"
                  onClick$={() => {
                    drawerState.isOpen = true;
                    drawerState.title = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : `${category} View`;
                    drawerState.category = category === 'Birthday' ? 'Birthday Celebration' : 'Event Poster';
                    drawerState.mediaSrc = `/photos/${post.photos[0]}`;
                    drawerState.mediaType = "image";
                    drawerState.content = post.text || "";
                  }}
                  aria-label={`View details for ${title}`}
                >
                  Read Post →
                </button>
              </div>
            </div>
          );
        })
      )}

      <style dangerouslySetInnerHTML={`
        .reel-feed {
          background-color: var(--bg-app);
          height: calc(100vh - 120px);
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
          padding: var(--space-xl);
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
        
        .snap-container {
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          scrollbar-width: none; /* Hide scrollbars for cinematic feel */
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
          transition: transform var(--transition-normal);
        }
        
        .reel-view:hover .reel-background img {
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
          transition: all var(--transition-normal);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        
        .reel-info {
          flex: 1;
          min-width: 0; /* Enable truncation in flex container */
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
        
        .reel-action-btn {
          background: var(--accent-primary);
          color: #000;
          border: none;
          padding: 0.6rem 1.2rem;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
          min-height: 44px; /* Accessible touch target */
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .reel-action-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }
        
        .reel-action-btn:active {
          transform: translateY(1px);
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
      `}></style>
    </div>
  );
});

import { component$ } from "@builder.io/qwik";

import type { Post } from "../domain/specs";
interface ReelFeedProps {
  posts: Post[];
  emptyMessage?: string;
  emptyIcon?: string;
}

export const ReelFeed = component$<ReelFeedProps>((props) => {
  return (
    <div class="reel-feed snap-container">
      {props.posts.length === 0 ? (
        <div class="empty-state">
          <span>{props.emptyIcon || '🎬'}</span>
          <p>{props.emptyMessage || 'No content found'}</p>
          <button onClick$={() => window.location.reload()}>Refresh</button>
        </div>
      ) : (
        props.posts.map((post) => (
          <div key={post.id} class="snap-item reel-view">
            <div class="reel-background">
              <img 
                src={`/photos/${post.photos[0]}`} 
                alt="Reel background" 
                loading="lazy"
                width={720}
                height={1280}
              />
            </div>
          </div>
        ))
      )}

      <style dangerouslySetInnerHTML={`
        .reel-feed {
          background-color: #000;
          color: #fff;
          height: calc(100vh - var(--tab-height));
          position: relative;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
          color: var(--text-dim);
        }
        .empty-state span { font-size: 48px; }
        
        .snap-container {
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          scroll-timeline: --reel-scroll y;
        }
        .reel-view {
          position: relative;
          background: #000;
          height: 100%;
          width: 100%;
          view-timeline-name: --view-reel;
          view-timeline-axis: block;
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
          animation: reel-in linear both;
          animation-timeline: --view-reel;
          animation-range: entry 0% cover 30%;
        }
        .reel-background img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: brightness(0.8);
        }
        
        .reel-overlay {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          padding: 16px 16px 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
          z-index: 10;
          animation: fade-in linear both;
          animation-timeline: --view-reel;
          animation-range: entry 10% cover 40%;
        }
        
        @keyframes reel-in {
          from { opacity: 0; transform: scale(1.1); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}></style>
    </div>
  );
});

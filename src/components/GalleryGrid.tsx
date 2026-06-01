import { component$ } from "@builder.io/qwik";
import { cleanPostText } from "~/lib/twitter-parser";
import { getCategoryBadge } from "~/lib/gallery-utils";

export interface GalleryItem {
  id: string | number;
  mediaSrc: string;
  text: string;
  category: string;
  account?: string | null;
  isUpcoming?: boolean;
}

interface GalleryGridProps {
  items: GalleryItem[];
  emptyMessage?: string;
  emptyIcon?: string;
}

export const GalleryGrid = component$<GalleryGridProps>((props) => {
  const emptyIcon = props.emptyIcon || "📷";
  const emptyMessage = props.emptyMessage || "No content loaded";

  return (
    <div class="gallery-container">
      {props.items.length === 0 ? (
        <div class="empty-state">
          <div class="empty-title">{emptyIcon} {emptyMessage}</div>
          <div class="empty-text">No active records are currently registered in the database ledger.</div>
        </div>
      ) : (
        <div class="gallery-grid">
          {props.items.map((item) => {
            const thumb = item.mediaSrc;
            const cleanedText = cleanPostText(item.text || "");

            // Generate titles and captions based on cleaned content
            const title = cleanedText 
              ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 50) + '...' 
              : `${item.category} #${item.id}`;
            const displayTitle = cleanedText 
              ? cleanedText.replace(/#\w+/g, '').trim() 
              : `${item.category} #${item.id}`;
            const hashtags = item.text ? (item.text.match(/#\w+/g) || []).slice(0, 3) : [];

            return (
              <a 
                key={`${item.id}-${thumb}`} 
                href={thumb ? `/photos/${thumb}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                class={["prompt-card", item.isUpcoming ? "upcoming-glow" : ""].filter(Boolean).join(" ")}
              >
                {item.isUpcoming && (
                  <div class="upcoming-badge" aria-label="Upcoming event">
                    <span class="upcoming-badge-dot" />
                    Upcoming
                  </div>
                )}
                <div class="card-media-wrapper">
                  {thumb && (
                    <img 
                      src={`/photos/${thumb}`} 
                      alt={title} 
                      class="card-media-img poster" 
                      loading="lazy"
                    />
                  )}
                  <div class="card-hover-overlay">
                    <div class="overlay-content">
                      <span class="overlay-badge">{getCategoryBadge(item.category)}</span>
                      <p class="overlay-caption">{displayTitle}</p>
                      {hashtags.length > 0 && (
                        <div class="overlay-tags">
                          {hashtags.map((tag) => (
                            <span key={tag} class="tag-pill">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
});

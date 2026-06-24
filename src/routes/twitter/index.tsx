import { component$, useContext, useStylesScoped$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows, type Post } from "../../domain/specs";
import { DrawerContext } from "../layout";

export const usePosts = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // Clean 'Home' feed: Text-only upcoming rotary club events (EVENT_POSTER)
  const { results } = await db.prepare(`
    SELECT DISTINCT p.*, m.snippet, m.type, m.file_name AS file_name 
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'EVENT_POSTER' 
      AND p.text IS NOT NULL 
      AND p.text != '' 
      AND p.text NOT LIKE 'Legacy media archive%'
    ORDER BY p.created_at DESC, p.id DESC
  `).all();
  
  const parsed = parseD1PostRows(results);
  const seenTexts = new Set<string>();
  const uniquePosts: typeof parsed = [];
  
  for (const post of parsed) {
    const text = post.text || "";
    const normalizedText = text.trim().toLowerCase().replace(/\s+/g, " ");
    if (!seenTexts.has(normalizedText)) {
      seenTexts.add(normalizedText);
      uniquePosts.push(post);
    }
  }
  
  return uniquePosts;
});

import { cleanPostText, parseEventDate, formatExtractedDate, reformatEventText, extractVenue } from "../../lib/twitter-parser";
export { cleanPostText, parseEventDate, formatExtractedDate, reformatEventText, extractVenue };


export default component$(() => {
  const posts = usePosts();
  const drawerState = useContext(DrawerContext);

  useStylesScoped$(STYLES);
  
  // Partition posts into upcoming and previous events using D1 text copy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcoming: Post[] = [];
  const previous: Post[] = [];

  posts.value.forEach((post, index) => {
    const text = post.text || post.snippet || "";
    const parsedDate = parseEventDate(text, post.created_at || undefined);
    
    if (parsedDate) {
      if (parsedDate >= today) {
        upcoming.push(post);
      } else {
        previous.push(post);
      }
    } else {
      // Heuristic fallback: if it's very recent and contains call-to-actions, mark as upcoming
      const lowercase = text.toLowerCase();
      const hasFutureKeyword = [
        "join us", "register", "upcoming", "save the date", "invites you", 
        "tomorrow", "this coming", "this saturday", "this sunday", "no fellowship"
      ].some(kw => lowercase.includes(kw));
      
      if (index < 6 && hasFutureKeyword) {
        upcoming.push(post);
      } else {
        previous.push(post);
      }
    }
  });

  return (
    <div class="events-page-container">
      {/* Visually hidden page title for screen readers and SEO */}
      <h1 class="sr-only">Club Events — Home</h1>

      {posts.value.length === 0 ? (
        <div class="empty-state">
          <div class="empty-title">No Events Loaded</div>
          <div class="empty-text">No event announcements are currently available in the ledger.</div>
        </div>
      ) : (
        <div class="events-columns-grid">
          {/* Upcoming Events Column */}
          <div class="events-column">
            <h2 class="column-title">
              Upcoming Events
              <span class="column-count">{upcoming.length}</span>
            </h2>
            {upcoming.length === 0 ? (
              <div class="empty-state text-only">
                <p class="empty-text">No upcoming events scheduled at this moment.</p>
              </div>
            ) : (
              upcoming.map((post) => {
                const targetText = post.text || post.snippet || "";
                const eventDate = parseEventDate(targetText, post.created_at || undefined);
                const displayDate = formatExtractedDate(eventDate);
                const formattedContent = reformatEventText(targetText, post.account || "", post.created_at || undefined, post.snippet || undefined);
                const cleanedTarget = cleanPostText(targetText);
                const title = cleanedTarget ? cleanedTarget.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : "Event Announcement";
                const venue = extractVenue(targetText);
                
                return (
                  <button
                    key={post.id} 
                    class="event-text-item"
                    onClick$={() => {
                      drawerState.isOpen = true;
                      drawerState.title = title;
                      drawerState.category = "Upcoming Event";
                      drawerState.mediaSrc = post.photos && post.photos.length > 0 ? `/photos/${post.photos[0]}` : "";
                      drawerState.mediaType = "image";
                      drawerState.content = formattedContent;
                    }}
                  >
                    <div class="event-item-header">
                      <span class="event-account">@{(post.account?.toLowerCase() === 'rcns' || !post.account) ? 'rotarynairobis' : post.account}</span>
                      <span class="event-badge upcoming">Upcoming</span>
                    </div>
                    <div class="event-meta-extracted">
                      {displayDate && <div class="event-date-extracted">{displayDate}</div>}
                      {venue && <div class="event-venue-extracted"><span aria-hidden="true">📍</span> {venue}</div>}
                    </div>
                    <div class="event-item-body">
                      {formattedContent}
                    </div>
                    <div class="event-item-footer">
                      <span class="read-more-text">Read details</span>
                      <span class="read-more-arrow" aria-hidden="true">→</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Previous Events Column */}
          <div class="events-column">
            <h2 class="column-title">
              Previous Events
              <span class="column-count">{previous.length}</span>
            </h2>
            {previous.length === 0 ? (
              <div class="empty-state text-only">
                <p class="empty-text">No historical events recorded in the ledger.</p>
              </div>
            ) : (
              previous.map((post) => {
                const targetText = post.text || post.snippet || "";
                const eventDate = parseEventDate(targetText, post.created_at || undefined);
                const displayDate = formatExtractedDate(eventDate);
                const formattedContent = reformatEventText(targetText, post.account || "", post.created_at || undefined, post.snippet || undefined);
                const cleanedTarget = cleanPostText(targetText);
                const title = cleanedTarget ? cleanedTarget.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : "Event Recap";
                const venue = extractVenue(targetText);
                
                return (
                  <button
                    key={post.id} 
                    class="event-text-item"
                    onClick$={() => {
                      drawerState.isOpen = true;
                      drawerState.title = title;
                      drawerState.category = "Past Event";
                      drawerState.mediaSrc = post.photos && post.photos.length > 0 ? `/photos/${post.photos[0]}` : "";
                      drawerState.mediaType = "image";
                      drawerState.content = formattedContent;
                    }}
                  >
                    <div class="event-item-header">
                      <span class="event-account">@{(post.account?.toLowerCase() === 'rcns' || !post.account) ? 'rotarynairobis' : post.account}</span>
                      <span class="event-badge previous">Past Event</span>
                    </div>
                    <div class="event-meta-extracted">
                      {displayDate && <div class="event-date-extracted">{displayDate}</div>}
                      {venue && <div class="event-venue-extracted"><span aria-hidden="true">📍</span> {venue}</div>}
                    </div>
                    <div class="event-item-body">
                      {formattedContent}
                    </div>
                    <div class="event-item-footer">
                      <span class="read-more-text">Read details</span>
                      <span class="read-more-arrow" aria-hidden="true">→</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
});

const STYLES = `
        .events-page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem 4rem;
        }
        .events-columns-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          margin-top: 2rem;
        }
        @media (min-width: 1024px) {
          .events-columns-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .events-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .column-title {
          font-family: var(--font-serif);
          font-size: 2rem;
          font-style: italic;
          color: var(--accent-primary);
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0.75rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .column-count {
          font-family: var(--font-sans);
          font-size: 0.9rem;
          font-style: normal;
          color: var(--text-secondary);
          background-color: var(--bg-panel);
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid var(--border-subtle);
        }
        /* Native button reset — event cards are <button> elements */
        .event-text-item {
          appearance: none;
          -webkit-appearance: none;
          background-color: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 1.5rem;
          transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          text-align: left;
          font-family: var(--font-sans);
          color: var(--text-color);
        }
        .event-text-item:hover {
          border-color: var(--border-focus);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--accent-glow);
        }
        .event-text-item:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 2px;
        }
        .event-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .event-account {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .event-badge {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }
        .event-badge.upcoming {
          background-color: oklch(from var(--accent-primary) l c h / 0.15);
          color: var(--accent-primary);
          border: 1px solid oklch(from var(--accent-primary) l c h / 0.3);
        }
        .event-badge.previous {
          background-color: oklch(from var(--text-muted) l c h / 0.1);
          color: var(--text-muted);
          border: 1px solid oklch(from var(--text-muted) l c h / 0.2);
        }
        .event-item-body {
          font-size: 0.95rem;
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .event-meta-extracted {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .event-date-extracted {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 1.15rem;
          color: var(--accent-primary);
        }
        .event-venue-extracted {
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-weight: 600;
          font-style: italic;
        }
        .event-item-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.25rem;
          margin-top: auto;
          padding-top: 0.5rem;
          border-top: 1px dashed var(--border-subtle);
        }
        .read-more-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
          transition: color var(--transition-fast);
        }
        .read-more-arrow {
          font-size: 0.9rem;
          color: var(--text-muted);
          transition: transform var(--transition-fast), color var(--transition-fast);
        }
        .event-text-item:hover .read-more-text {
          color: var(--accent-primary);
        }
        .event-text-item:hover .read-more-arrow {
          color: var(--accent-primary);
          transform: translateX(4px);
        }
        .empty-state.text-only {
          padding: 2rem;
          background: transparent;
          border: 1px dashed var(--border-subtle);
          border-radius: 16px;
          text-align: center;
        }
`;

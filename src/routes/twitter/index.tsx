import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows, type Post } from "../../domain/specs";
import { DrawerContext } from "../layout";

export const usePosts = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // Clean 'Home' feed: Text-only upcoming rotary club events (EVENT_POSTER)
  const { results } = await db.prepare(`
    SELECT p.* 
    FROM posts p
    JOIN media m ON p.photos_json LIKE '%"' || m.file_name || '"%'
    WHERE m.type = 'EVENT_POSTER' 
      AND p.text IS NOT NULL 
      AND p.text != '' 
      AND p.text NOT LIKE 'Legacy media archive%'
    GROUP BY p.id
    ORDER BY p.id DESC
  `).all();
  return parseD1PostRows(results);
});

// Robust date extraction from social event flyer copy
function parseEventDate(text: string): Date | null {
  const months = [
    "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
  ];
  
  const lowercase = text.toLowerCase();
  
  const regex1 = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?/i;
  const match1 = lowercase.match(regex1);
  if (match1) {
    const monthStr = match1[1].slice(0, 3).toLowerCase();
    const monthIndex = months.indexOf(monthStr) % 12;
    const day = parseInt(match1[2], 10);
    const year = match1[3] ? parseInt(match1[3], 10) : 2026;
    const date = new Date(year, monthIndex, day);
    if (!isNaN(date.getTime())) return date;
  }

  const regex2 = /(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i;
  const match2 = lowercase.match(regex2);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const monthStr = match2[2].slice(0, 3).toLowerCase();
    const monthIndex = months.indexOf(monthStr) % 12;
    const year = 2026;
    const date = new Date(year, monthIndex, day);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

function formatExtractedDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default component$(() => {
  const posts = usePosts();
  const drawerState = useContext(DrawerContext);
  
  // Partition posts into upcoming and previous events using D1 text copy
  const today = new Date(2026, 4, 19); // May 19, 2026
  const upcoming: Post[] = [];
  const previous: Post[] = [];

  posts.value.forEach((post, index) => {
    const text = post.text || "";
    const parsedDate = parseEventDate(text);
    
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
        "tomorrow", "this coming", "this saturday", "this sunday"
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
                const eventDate = parseEventDate(post.text || "");
                const displayDate = formatExtractedDate(eventDate);
                const title = post.text ? post.text.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : "Event Announcement";
                
                return (
                  <div 
                    key={post.id} 
                    class="event-text-item"
                    onClick$={() => {
                      drawerState.isOpen = true;
                      drawerState.title = title;
                      drawerState.category = "Upcoming Event";
                      drawerState.mediaSrc = ""; // Text-only inspection drawer
                      drawerState.mediaType = "image";
                      drawerState.content = post.text || "";
                    }}
                  >
                    <div class="event-item-header">
                      <span class="event-account">@{post.account || 'rcns'}</span>
                      <span class="event-badge upcoming">Upcoming</span>
                    </div>
                    {displayDate && <div class="event-date-extracted">{displayDate}</div>}
                    <div class="event-item-body">
                      {post.text ? post.text.replace(/#\w+/g, '').trim() : ""}
                    </div>
                  </div>
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
                const eventDate = parseEventDate(post.text || "");
                const displayDate = formatExtractedDate(eventDate);
                const title = post.text ? post.text.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : "Event Recap";
                
                return (
                  <div 
                    key={post.id} 
                    class="event-text-item"
                    onClick$={() => {
                      drawerState.isOpen = true;
                      drawerState.title = title;
                      drawerState.category = "Past Event";
                      drawerState.mediaSrc = ""; // Text-only inspection drawer
                      drawerState.mediaType = "image";
                      drawerState.content = post.text || "";
                    }}
                  >
                    <div class="event-item-header">
                      <span class="event-account">@{post.account || 'rcns'}</span>
                      <span class="event-badge previous">Past Event</span>
                    </div>
                    {displayDate && <div class="event-date-extracted">{displayDate}</div>}
                    <div class="event-item-body">
                      {post.text ? post.text.replace(/#\w+/g, '').trim() : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={`
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
          font-family: var(--font-display);
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
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-style: normal;
          color: var(--text-secondary);
          background-color: var(--bg-panel);
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid var(--border-subtle);
        }
        .event-text-item {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all var(--transition-fast);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .event-text-item:hover {
          border-color: var(--border-focus);
          transform: translateY(-2px);
          box-shadow: 0 4px 20px var(--accent-glow);
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
        .event-date-extracted {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 1.15rem;
          color: var(--accent-primary);
        }
        .empty-state.text-only {
          padding: 2rem;
          background: transparent;
          border: 1px dashed var(--border-subtle);
          border-radius: 16px;
          text-align: center;
        }
      `}></style>
    </div>
  );
});

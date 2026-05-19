import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows, type Post } from "../../domain/specs";
import { DrawerContext } from "../layout";

export const usePosts = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // Clean 'Home' feed: Text-only upcoming rotary club events (EVENT_POSTER)
  const { results } = await db.prepare(`
    SELECT p.*, m.snippet, m.type 
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
  
  // Try numeric date formats first (e.g. 09.02.2026 or 09/02/2026)
  const regexNumeric = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
  const matchNumeric = lowercase.match(regexNumeric);
  if (matchNumeric) {
    const day = parseInt(matchNumeric[1], 10);
    const monthIndex = parseInt(matchNumeric[2], 10) - 1;
    const year = parseInt(matchNumeric[3], 10);
    const date = new Date(year, monthIndex, day);
    if (!isNaN(date.getTime())) return date;
  }
  
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

function reformatEventText(text: string, account: string): string {
  const lowercase = text.toLowerCase();
  
  // 1. Extract Club Name
  const accountClean = (account || 'rcns').toLowerCase().replace(/[^a-z0-9]/g, '');
  let clubName = "Nairobi South";
  if (accountClean.includes("muthaiga")) clubName = "Nairobi Muthaiga";
  else if (accountClean.includes("upperhill")) clubName = "Nairobi Upper Hill";
  else if (accountClean.includes("ngong")) clubName = "Ngong Road";
  else if (accountClean.includes("syokimau")) clubName = "Syokimau";
  else if (accountClean.includes("thika")) clubName = "Nairobi Thika Road";
  else if (accountClean.includes("metropolitan")) clubName = "Nairobi Metropolitan";
  else if (accountClean.includes("nairobi")) clubName = "Nairobi";
  
  const clubRegex = /rotary\s+club\s+of\s+([A-Za-z\s]+?)(?:\s+hosts|\s+invites|\s+will|\s+is|\.|\n)/i;
  const clubMatch = text.match(clubRegex);
  if (clubMatch && clubMatch[1].trim().length > 3 && clubMatch[1].trim().length < 30) {
    clubName = clubMatch[1].trim();
  }

  // 2. Extract Speaker
  let speaker = "";
  const speakerRegexes = [
    /guest\s+speaker:?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
    /speaker:?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
    /host(?:ing)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
    /keynote\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
    /facilitator:?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/
  ];
  
  for (const regex of speakerRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = match[1].trim();
      const forbidden = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", 
                         "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
                         "Rotary", "Club", "Nairobi", "District", "President", "Director", "Fellowship", "Join", "Zoom", "Meeting"];
      if (!forbidden.some(word => val.includes(word))) {
        speaker = val;
        break;
      }
    }
  }

  // 3. Extract Topic
  let topic = "";
  const topicQuotesRegex = /['"“‘]([^'"”’\n]{5,100})['"”’]/;
  const topicOnRegex = /(?:present\s+on|speaking\s+on|topic:?)\s+['"“‘]?([^'"”’\n.]{5,100})['"”’]?/i;
  
  const quotesMatch = text.match(topicQuotesRegex);
  if (quotesMatch && quotesMatch[1]) {
    topic = quotesMatch[1].trim();
  } else {
    const onMatch = text.match(topicOnRegex);
    if (onMatch && onMatch[1]) {
      topic = onMatch[1].trim();
    } else {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0 && lines[0].length < 80 && !lines[0].toLowerCase().includes("instagram") && !lines[0].toLowerCase().includes("facebook")) {
        topic = lines[0].replace(/#\w+/g, '').trim();
      }
    }
  }

  // 4. Extract Venue
  let venue = "our fellowship venue";
  const venueRegex = /at\s+([A-Z][A-Za-z0-9\s,]{3,50?})(?=\s+from|\s+on|\s+at|\.|\n)/;
  const venueMatch = text.match(venueRegex);
  if (venueMatch && venueMatch[1]) {
    const val = venueMatch[1].trim();
    if (!["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(val)) {
      venue = val;
    }
  } else {
    if (lowercase.includes("zoom")) venue = "Zoom (Virtual)";
    else if (lowercase.includes("braeburn")) venue = "Braeburn Theatre, Gitanga Road";
    else if (lowercase.includes("radisson")) venue = "Radisson Blu, Upper Hill";
    else if (lowercase.includes("laico")) venue = "Laico Regency";
    else if (lowercase.includes("serena")) venue = "Nairobi Serena Hotel";
  }

  // 5. Extract Time
  let time = "6:00 PM";
  const timeRegex = /(?:from|at)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch && timeMatch[1]) {
    time = timeMatch[1].trim().toUpperCase();
  }

  // 6. Extract Day and Date
  let dayDate = "February 20, 2026";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const parsed = parseEventDate(text);
  if (parsed) {
    const monthName = months[parsed.getMonth()];
    dayDate = `${monthName} ${parsed.getDate()}, ${parsed.getFullYear()}`;
  } else {
    const dateRegex = /on\s+([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?)/i;
    const dateMatch = text.match(dateRegex);
    if (dateMatch && dateMatch[1]) {
      dayDate = dateMatch[1].trim();
    }
  }

  // FLUID FORMATTING
  if (speaker && topic) {
    return `The Rotary Club of ${clubName} will be hosting ${speaker} to present on '${topic}' at ${venue} from ${time} on ${dayDate}.`;
  }
  
  if (speaker && !topic) {
    return `The Rotary Club of ${clubName} will be hosting ${speaker} at ${venue} from ${time} on ${dayDate}.`;
  }

  if (!speaker && topic) {
    const isSpecialEvent = ["assembly", "visit", "night", "project", "celebration", "fellowship", "calendar", "board"].some(w => topic.toLowerCase().includes(w));
    if (isSpecialEvent) {
      return `The Rotary Club of ${clubName} will be hosting the '${topic}' event at ${venue} from ${time} on ${dayDate}.`;
    }
    return `The Rotary Club of ${clubName} will be hosting an event on '${topic}' at ${venue} from ${time} on ${dayDate}.`;
  }

  return `The Rotary Club of ${clubName} invites you to a fellowship gathering at ${venue} from ${time} on ${dayDate}.`;
}

export default component$(() => {
  const posts = usePosts();
  const drawerState = useContext(DrawerContext);
  
  // Partition posts into upcoming and previous events using D1 text copy
  const today = new Date(2026, 4, 19); // May 19, 2026
  const upcoming: Post[] = [];
  const previous: Post[] = [];

  posts.value.forEach((post, index) => {
    const text = post.snippet || post.text || "";
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
                const targetText = post.snippet || post.text || "";
                const eventDate = parseEventDate(targetText);
                const displayDate = formatExtractedDate(eventDate);
                const formattedContent = reformatEventText(targetText, post.account || "");
                const title = targetText ? targetText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : "Event Announcement";
                
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
                      {formattedContent}
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
                const targetText = post.snippet || post.text || "";
                const eventDate = parseEventDate(targetText);
                const displayDate = formatExtractedDate(eventDate);
                const formattedContent = reformatEventText(targetText, post.account || "");
                const title = targetText ? targetText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : "Event Recap";
                
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
                      {formattedContent}
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

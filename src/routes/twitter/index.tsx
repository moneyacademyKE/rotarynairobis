import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows } from "../../domain/specs";
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

export default component$(() => {
  const posts = usePosts();
  const drawerState = useContext(DrawerContext);
  
  return (
    <div class="twitter-feed">
      {posts.value.length === 0 ? (
        <div class="empty-state">
          <div class="empty-title">No Events Loaded</div>
          <div class="empty-text">No upcoming event announcements are currently available in the ledger.</div>
        </div>
      ) : (
        <div class="gallery-grid">
          {posts.value.map((post) => {
            const thumb = post.photos[0] || '';
            const full = thumb ? thumb.replace('_thumb.jpg', '.jpg') : '';
            const title = post.text ? post.text.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 50) + '...' : 'Event Flyer';
            
            return (
              <div 
                key={post.id} 
                class="prompt-card"
                onClick$={() => {
                  drawerState.isOpen = true;
                  drawerState.title = post.text ? post.text.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : "Event Details";
                  drawerState.category = "Event Announcement";
                  drawerState.mediaSrc = thumb ? `/photos/${full || thumb}` : '';
                  drawerState.mediaType = "image";
                  drawerState.content = post.text || "";
                }}
              >
                {thumb && (
                  <div class="card-media-wrapper">
                    <img 
                      src={`/photos/${thumb}`} 
                      alt={title} 
                      class="card-media-img poster" 
                      loading="lazy"
                    />
                    <img 
                      src={`/photos/${full}`} 
                      alt={title} 
                      class="card-media-img preview" 
                      loading="lazy"
                    />
                  </div>
                )}
                
                <div class="card-info">
                  <span class="card-category">Event</span>
                  <h3 class="card-title">{title}</h3>
                  <p class="card-desc">{post.text ? post.text.replace(/#\w+/g, '').trim() : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});


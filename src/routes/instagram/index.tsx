import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseInstagramRows } from "../../domain/specs";
import { DrawerContext } from "../layout";
import { cleanPostText } from "../twitter";

export const useInstagramData = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // Visual media classified strictly as PHOTO (excluding posters, recaps, birthdays to prevent cross-tab duplication)
  const { results } = await db.prepare(`
    SELECT DISTINCT p.*, m.file_name as photo_src
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'PHOTO'
    ORDER BY p.created_at DESC, p.id DESC
  `).all();
  
  const allPhotos = parseInstagramRows(results);
    
  return { allPhotos };
});

export default component$(() => {
  const data = useInstagramData();
  const drawerState = useContext(DrawerContext);
  
  return (
    <div class="instagram-profile">
      {data.value.allPhotos.length === 0 ? (
        <div class="empty-state">
          <div class="empty-title">No Photos Loaded</div>
          <div class="empty-text">No active visual media is currently registered in the database ledger.</div>
        </div>
      ) : (
        <div class="gallery-grid">
          {data.value.allPhotos.map((photo) => {
            const thumb = photo.src;
            const cleanedText = cleanPostText(photo.text || "");
            const title = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 50) + '...' : `Club Photo #${photo.postId}`;
            const hashtags = photo.text ? (photo.text.match(/#\w+/g) || []).slice(0, 3) : [];
            const displayTitle = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 45) : `Photo #${photo.postId}`;
            
            return (
              <div 
                key={photo.postId + '-' + photo.src} 
                class="prompt-card"
                role="button"
                tabIndex={0}
                onClick$={() => {
                  drawerState.isOpen = true;
                  drawerState.title = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : `Photo View #${photo.postId}`;
                  drawerState.category = "Club Photo";
                  drawerState.mediaSrc = `/photos/${thumb}`;
                  drawerState.mediaType = "image";
                  drawerState.content = cleanedText || "Rotary Nairobi South Activity Photo";
                }}
                onKeyDown$={(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     drawerState.isOpen = true;
                     drawerState.title = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : `Photo View #${photo.postId}`;
                     drawerState.category = "Club Photo";
                     drawerState.mediaSrc = `/photos/${thumb}`;
                     drawerState.mediaType = "image";
                     drawerState.content = cleanedText || "Rotary Nairobi South Activity Photo";
                  }
                }}
              >
                <div class="card-media-wrapper">
                  <img 
                    src={`/photos/${thumb}`} 
                    alt={title} 
                    class="card-media-img poster" 
                    loading="lazy"
                  />
                  <div class="card-hover-overlay">
                    <div class="overlay-content">
                      <span class="overlay-badge">📷 Club Photo</span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});


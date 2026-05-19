import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseInstagramRows } from "../../domain/specs";
import { DrawerContext } from "../layout";
import { cleanPostText } from "../twitter";

export const useInstagramData = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // Visual media classified strictly as PHOTO (excluding posters, recaps, birthdays to prevent cross-tab duplication)
  const { results } = await db.prepare(`
    SELECT p.*, m.file_name as photo_src
    FROM posts p
    JOIN media m ON p.photos_json LIKE '%"' || m.file_name || '"%'
    WHERE m.type = 'PHOTO'
    ORDER BY p.id DESC
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
          {data.value.allPhotos.map((photo, i) => {
            const thumb = photo.src;
            const full = thumb.replace('_thumb.jpg', '.jpg');
            const cleanedText = cleanPostText(photo.text || "");
            const title = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 50) + '...' : `Club Photo #${photo.postId}`;
            
            return (
              <div 
                key={i} 
                class="prompt-card"
                onClick$={() => {
                  drawerState.isOpen = true;
                  drawerState.title = cleanedText ? cleanedText.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : `Photo View #${photo.postId}`;
                  drawerState.category = "Club Photo";
                  drawerState.mediaSrc = `/photos/${full}`;
                  drawerState.mediaType = "image";
                  drawerState.content = photo.text || "Rotary Nairobi South Activity Photo";
                }}
              >
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});


import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseInstagramRows } from "../../domain/specs";

export const useInstagramData = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // All active visual media (excluding FAILED classifications), images only, no text
  const { results } = await db.prepare(`
    SELECT p.*, m.file_name as photo_src
    FROM posts p
    JOIN media m ON p.photos_json LIKE '%"' || m.file_name || '"%'
    WHERE m.type != 'FAILED'
    ORDER BY p.id DESC
  `).all();
  
  const allPhotos = parseInstagramRows(results);
    
  return { allPhotos };
});

import { useContext } from "@builder.io/qwik";
import { DrawerContext } from "../layout";

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
            const title = photo.text ? photo.text.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 50) + '...' : `Club Photo #${photo.postId}`;
            
            return (
              <div 
                key={i} 
                class="prompt-card"
                onClick$={() => {
                  drawerState.isOpen = true;
                  drawerState.title = photo.text ? photo.text.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 60) : `Photo View #${photo.postId}`;
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
                
                <div class="card-info">
                  <span class="card-category">Activity Photo</span>
                  <h3 class="card-title">{title}</h3>
                  <p class="card-desc">{photo.text ? photo.text.replace(/#\w+/g, '').trim() : 'Rotary Club of Nairobi South'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});


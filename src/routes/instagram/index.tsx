import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseInstagramRows } from "../../domain/specs";

export const useInstagramData = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  
  // Pure Fellowship Photos (excluding all designed Graphics/Posters)
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
  
  return (
    <div class="instagram-profile">
      <div class="grid-container">
        {data.value.allPhotos.map((photo, i) => (
          <div key={i} class="grid-item">
            <img 
              src={`/photos/${photo.src}`} 
              alt="Instagram post" 
              loading="lazy" 
              width={300} 
              height={300} 
            />
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={`
        .instagram-profile {
          background-color: var(--bg-color);
        }
        .profile-header {
          padding: 20px 16px;
        }
        .profile-top {
          display: flex;
          align-items: center;
          gap: 28px;
          margin-bottom: 20px;
        }
        .profile-avatar {
          width: 77px;
          height: 77px;
          border-radius: 50%;
          background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
          padding: 3px;
          position: relative;
        }
        .profile-avatar::after {
          content: '';
          display: block;
          width: 100%;
          height: 100%;
          background: #ccc;
          border-radius: 50%;
          border: 2px solid var(--bg-color);
        }
        .profile-stats {
          display: flex;
          gap: 20px;
          flex: 1;
          justify-content: space-around;
          font-size: 14px;
        }
        .stat { text-align: center; }
        .profile-info { font-size: 14px; }
        .full-name { font-weight: 700; }
        
        .view-toggle {
          display: flex;
          border-top: 1px solid var(--border-color);
        }
        .view-toggle button {
          flex: 1;
          background: none;
          border: none;
          padding: 12px;
          color: var(--text-dim);
          cursor: pointer;
          font-weight: 600;
        }
        .view-toggle button.active {
          color: var(--text-color);
          border-top: 2px solid var(--text-color);
          margin-top: -1px;
        }
        
        .feed-post {
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .feed-post .post-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
        }
        .mini-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ccc;
        }
        .username { font-size: 14px; font-weight: 600; }
        .post-image img {
          width: 100%;
          display: block;
        }
        .post-actions {
          padding: 8px 12px;
          display: flex;
          gap: 16px;
          font-size: 24px;
        }
        .post-content {
          padding: 0 12px 16px;
          font-size: 14px;
        }
      `}></style>
    </div>
  );
});

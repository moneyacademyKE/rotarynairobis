import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseInstagramRows } from "../../domain/specs";
import { GalleryGrid } from "../../components/GalleryGrid";
import { cachedQuery } from "../../lib/db-cache";

export const useInstagramData = routeLoader$(async ({ platform }) => {
  // Visual media classified strictly as PHOTO (excluding posters, recaps, birthdays to prevent cross-tab duplication)
  const results = await cachedQuery(platform.env, "gallery:instagram", `
    SELECT DISTINCT p.*, m.file_name as photo_src
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'PHOTO'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `);
  
  const allPhotos = parseInstagramRows(results);
    
  return { allPhotos };
});

export default component$(() => {
  const data = useInstagramData();

  const items = data.value.allPhotos.map((photo) => ({
    id: photo.postId,
    mediaSrc: photo.src,
    text: photo.text || "",
    category: "Club Photo",
  }));
  
  return (
    <>
      <h1 class="sr-only">Club Photos</h1>
      <GalleryGrid
        items={items}
        emptyMessage="No Photos Loaded"
        emptyIcon="📷"
      />
    </>
  );
});


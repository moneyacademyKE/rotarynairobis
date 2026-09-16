import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseInstagramRows } from "../../domain/specs";
import { GalleryGrid } from "../../components/GalleryGrid";
import { cachedQuery } from "../../lib/db-cache";
import { SOURCES } from "../../lib/publish";

export const useInstagramData = routeLoader$(async ({ platform }) => {
  // Visual media classified strictly as PHOTO (excluding posters, recaps, birthdays to prevent cross-tab duplication)
  const results = await cachedQuery(platform.env, "gallery:instagram", SOURCES["gallery:instagram"]);
  
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


import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows } from "../../domain/specs";
import { GalleryGrid } from "../../components/GalleryGrid";
import { cachedQuery } from "../../lib/db-cache";

export const useRecapData = routeLoader$(async ({ platform }) => {
  const rows = await cachedQuery(platform.env, "gallery:recaps", `
    SELECT DISTINCT p.*, m.file_name AS file_name
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'EVENT_RECAP'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `);
  return parseD1PostRows(rows);
});

export default component$(() => {
  const posts = useRecapData();

  const items = posts.value.map((post) => ({
    id: post.id,
    mediaSrc: post.photos[0] || "",
    text: post.text || "",
    category: "Event Recap",
    account: post.account,
  }));
  
  return (
    <>
      <h1 class="sr-only">Event Recaps</h1>
      <GalleryGrid 
        items={items} 
        emptyMessage="No event recaps found yet" 
        emptyIcon="🎞️" 
      />
    </>
  );
});

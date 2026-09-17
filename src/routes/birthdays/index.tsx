import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows } from "../../domain/specs";
import { GalleryGrid } from "../../components/GalleryGrid";
import { cachedQuery } from "../../lib/db-cache";
import { SOURCES } from "../../lib/publish";

export const useBirthdayData = routeLoader$(async ({ platform }) => {
  const rows = await cachedQuery(platform.env, "gallery:birthdays", SOURCES["gallery:birthdays"]);
  return parseD1PostRows(rows);
});

export default component$(() => {
  const posts = useBirthdayData();

  const items = posts.value.map((post) => ({
    id: post.id,
    mediaSrc: post.photos[0] || "",
    text: post.text || "",
    category: "Birthday Celebration",
    account: post.account,
  }));
  
  return (
    <>
      <h1 class="sr-only">Birthday Celebrations</h1>
      <GalleryGrid 
        items={items} 
        emptyMessage="No birthday celebrations found" 
        emptyIcon="🎂" 
      />
    </>
  );
});

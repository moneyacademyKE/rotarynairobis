import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseD1PostRows } from "../../domain/specs";
import { GalleryGrid } from "../../components/GalleryGrid";
import { parseEventDate } from "../../lib/twitter-parser";
import { cachedQuery } from "../../lib/db-cache";

export const useTikTokData = routeLoader$(async ({ platform }) => {
  const rows = await cachedQuery(platform.env, "gallery:tiktok", `
    SELECT DISTINCT p.*, m.file_name AS file_name
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'EVENT_POSTER'
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `);
  return parseD1PostRows(rows);
});

export default component$(() => {
  const posts = useTikTokData();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = posts.value.map((post, index) => {
    const text = post.text || post.snippet || "";
    const parsedDate = parseEventDate(text, post.created_at || undefined);

    let isUpcoming = false;
    if (parsedDate) {
      isUpcoming = parsedDate >= today;
    } else {
      // Heuristic fallback: recent posts with future call-to-action keywords
      const lowercase = text.toLowerCase();
      const hasFutureKeyword = [
        "join us", "register", "upcoming", "save the date", "invites you",
        "tomorrow", "this coming", "this saturday", "this sunday", "no fellowship"
      ].some(kw => lowercase.includes(kw));
      isUpcoming = index < 6 && hasFutureKeyword;
    }

    return {
      id: post.id,
      mediaSrc: post.photos[0] || "",
      text: post.text || "",
      category: "Event Poster",
      account: post.account,
      isUpcoming,
    };
  });

  // Upcoming events float to the top, past events follow in original order
  const sorted = [
    ...items.filter(i => i.isUpcoming),
    ...items.filter(i => !i.isUpcoming),
  ];

  return (
    <>
      <h1 class="sr-only">Event Posters</h1>
      <GalleryGrid 
        items={sorted} 
        emptyMessage="No event posters found" 
        emptyIcon="📅" 
      />
    </>
  );
});

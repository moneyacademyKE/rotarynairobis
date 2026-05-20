import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { ReelFeed } from "../../components/ReelFeed";
import { parseD1PostRows } from "../../domain/specs";

export const useTikTokData = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  const { results } = await db.prepare(`
    SELECT p.* 
    FROM posts p
    JOIN media m ON p.photos_json LIKE '%"' || m.file_name || '"%'
    WHERE m.type = 'EVENT_POSTER'
    GROUP BY p.id
    ORDER BY p.created_at DESC, p.id DESC
  `).all();
  return parseD1PostRows(results);
});

export default component$(() => {
  const posts = useTikTokData();
  return (
    <ReelFeed 
      posts={posts.value} 
      emptyMessage="No event posters found" 
      emptyIcon="📅" 
    />
  );
});

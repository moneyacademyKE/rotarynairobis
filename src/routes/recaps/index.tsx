import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { ReelFeed } from "../../components/ReelFeed";
import { parseD1PostRows } from "../../domain/specs";

export const useRecapData = routeLoader$(async ({ platform }) => {
  const db = platform.env.DB;
  const { results } = await db.prepare(`
    SELECT DISTINCT p.*, m.file_name AS file_name 
    FROM posts p
    JOIN json_each(p.photos_json) AS je
    JOIN media m ON m.file_name = je.value
    WHERE m.type = 'EVENT_RECAP'
    ORDER BY p.created_at DESC, p.id DESC
  `).all();
  return parseD1PostRows(results);
});

export default component$(() => {
  const posts = useRecapData();
  
  return (
    <ReelFeed 
      posts={posts.value} 
      emptyMessage="No event recaps found yet" 
      emptyIcon="🎞️" 
    />
  );
});

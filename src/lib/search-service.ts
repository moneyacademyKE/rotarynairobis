import { create, insert, search } from "@orama/orama";
import { parseD1PostRows } from "../domain/specs";
import type { Post } from "../domain/specs";

export interface SearchResult extends Post {
  score: number;
}

/**
 * Execute a high-performance in-memory search over database rows.
 * De-complects "persistence" from "search queries", executing search as a pure
 * transformation of raw facts into scored values.
 */
export async function executeSearch(rawDbRows: any[], term: string): Promise<SearchResult[]> {
  const posts = parseD1PostRows(rawDbRows);
  
  if (!term || !term.trim()) {
    return posts.map(p => ({ ...p, score: 1 }));
  }

  // 1. Create a transient Orama index
  const index = await create({
    schema: {
      id: "string",
      text: "string",
      account: "string",
    }
  });

  // 2. Populate the transient index with domain-safe Post values
  for (const post of posts) {
    await insert(index, {
      id: post.id.toString(),
      text: post.text || "",
      account: post.account || "",
    });
  }

  // 3. Search Orama with typo tolerance (fuzzy search)
  const results = await search(index, {
    term,
    properties: ["text", "account"],
    tolerance: 1,
  });

  // 4. Map search hits back to Post values with scores
  const matchedPosts: SearchResult[] = [];
  for (const hit of results.hits) {
    const matchedPost = posts.find(p => p.id.toString() === hit.id);
    if (matchedPost) {
      matchedPosts.push({
        ...matchedPost,
        score: hit.score,
      });
    }
  }

  return matchedPosts;
}

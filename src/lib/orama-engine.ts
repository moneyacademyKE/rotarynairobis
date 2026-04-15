import { create, insert, search } from "@orama/orama";
import type { Orama, TypedDocument } from "@orama/orama";

/**
 * Orama Search Schema
 * 
 * Maps our Epochal Post facts into a searchable vector/text document.
 * This allows for ultra-fast, edge-native discovery without D1 overhead.
 */
export const oramaSchema = {
  id: "string",
  text: "string",
  account: "string",
  type: "string",
  snippet: "string",
} as const;

export interface OramaPost {
  id: string;
  text: string;
  account: string;
  type: string;
  snippet: string;
}

let _index: any;

/**
 * Initialize or get existing Orama index.
 * De-complects "Search Storage" from "State Storage".
 */
export async function getOramaIndex() {
  if (!_index) {
    _index = await create({
      schema: oramaSchema,
    });
  }
  return _index;
}

/**
 * Sync a single post fact into the Orama index.
 */
export async function indexPost(post: OramaPost) {
  const index = await getOramaIndex();
  await insert(index, post);
}

/**
 * Perform a full-text search across the social platform.
 */
export async function searchPosts(term: string) {
  const index = await getOramaIndex();
  return await search(index, {
    term,
    properties: ["text", "snippet", "account"],
    limit: 10,
  });
}

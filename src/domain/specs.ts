import { z } from "zod";

/**
 * Rich Hickey "Facts": 
 * These define the pure Value shapes of our Domain.
 */

// 1. Raw D1 Row Data Shape (Input Boundary)
export const dbPostRowSchema = z.object({
  id: z.number(),
  text: z.string().nullable(),
  account: z.string().nullable(),
  photos_json: z.string().nullable(),
  hashtags_json: z.string().nullable(),
  // For queries that join with Media table
  file_name: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

// 2. Parsed Domain Shape (The Pure Value)
export const postDomainSchema = z.object({
  id: z.number(),
  text: z.string().nullable(),
  account: z.string().nullable(),
  photos: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  media_type: z.string().nullable().optional(), // from join
  snippet: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export type Post = z.infer<typeof postDomainSchema>;

/**
 * Transforms a raw D1 row into a pure, guaranteed Post value.
 */
export function parseD1PostRow(rawRow: unknown): Post {
  // Spec check the input boundary
  const validRow = dbPostRowSchema.parse(rawRow);
  
  let parsedPhotos: unknown = [];
  try {
    parsedPhotos = validRow.photos_json ? JSON.parse(validRow.photos_json) : [];
  } catch {
    parsedPhotos = [];
  }
  let parsedHashtags: unknown = [];
  try {
    parsedHashtags = validRow.hashtags_json ? JSON.parse(validRow.hashtags_json) : [];
  } catch {
    parsedHashtags = [];
  }

  let photos = Array.isArray(parsedPhotos) ? parsedPhotos : [];
  if (validRow.file_name && typeof validRow.file_name === "string") {
    photos = [validRow.file_name, ...photos.filter((p) => p !== validRow.file_name)];
  }

  // Construct domain object
  const domainObj = {
    id: validRow.id,
    text: validRow.text,
    account: validRow.account,
    photos: photos,
    hashtags: Array.isArray(parsedHashtags) ? parsedHashtags : [],
    media_type: validRow.type ?? undefined,
    snippet: validRow.snippet ?? undefined,
    created_at: validRow.created_at ?? undefined,
  };

  // Spec check the domain boundary
  return postDomainSchema.parse(domainObj);
}

/**
 * Parse a list of rows
 */
export function parseD1PostRows(rawRows: unknown[]): Post[] {
  return rawRows.map(parseD1PostRow);
}

export const instagramRowSchema = z.object({
  id: z.number(),
  photo_src: z.string(),
  text: z.string().nullable().optional(),
});

export function parseInstagramRow(rawRow: unknown) {
  const valid = instagramRowSchema.parse(rawRow);
  return { postId: valid.id, src: valid.photo_src, text: valid.text ?? "" };
}

export function parseInstagramRows(rawRows: unknown[]) {
  return rawRows.map(parseInstagramRow);
}

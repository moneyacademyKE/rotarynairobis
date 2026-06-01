import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Epochal Schema Boundary
 * 
 * NOTE: These are defined as `sqliteTable` so that Drizzle can generate INSERT statements 
 * that target them natively. Our underlying D1 database implements these as VIEWs 
 * wrapped with INSTEAD OF INSERT triggers, forwarding the mutations to the immutable `_facts` table.
 * Drizzle is completely unaware of this Epochal routing, providing a mathematically 
 * pure Value interface for our application code.
 */

export const media = sqliteTable('media', {
  fileName: text('file_name').primaryKey(),
  type: text('type'),
  snippet: text('snippet'),
  rawData: text('raw_data')
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey(),
  text: text('text'),
  account: text('account'),
  photosJson: text('photos_json'),
  hashtagsJson: text('hashtags_json'),
  createdAt: text('created_at')
});

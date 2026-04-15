/**
 * ETL Script: Parse Telegram Chat Export → posts.json
 *
 * Reads messages.html from the chat export directory,
 * extracts structured post data (photos, captions, hashtags, dates),
 * classifies by platform source, and outputs src/data/posts.json.
 *
 * Usage: bun run scripts/parse-export.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';

// ─── Configuration ─────────────────────────────────────────────────────
const EXPORT_DIR = resolve('/Users/moe/Desktop/chatexport_2026-04-15');
const HTML_PATH = join(EXPORT_DIR, 'messages.html');
const PHOTOS_SRC = join(EXPORT_DIR, 'photos');
const PROJECT_ROOT = resolve((import.meta as any).dir, '..');
const DATA_DIR = join(PROJECT_ROOT, 'src', 'data');
const PHOTOS_DEST = join(PROJECT_ROOT, 'public', 'photos');

// ─── Types ─────────────────────────────────────────────────────────────
interface Post {
  id: number;
  date: string;
  time: string;
  timestamp: string;
  platform: 'instagram' | 'twitter' | 'tiktok' | 'unknown';
  account: string;
  text: string;
  hashtags: string[];
  photos: string[];       // full-size photo filenames
  thumbs: string[];       // thumbnail filenames
  isAnalytics: boolean;
  isForwarded: boolean;
}

// ─── HTML Parsing (no deps — pure regex) ───────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]*onclick="return ShowHashtag[^"]*"[^>]*>(#[^<]+)<\/a>/gi, '$1')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/gi, '$1')
    .replace(/<strong>([^<]*)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .trim();
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g);
  return matches ? [...new Set(matches.map(h => h.toLowerCase()))] : [];
}

function classifyPlatform(cleanText: string): { platform: Post['platform']; account: string } {
  // Instagram pattern: 'username' on Instagram  (cleaned text has decoded apostrophes)
  const igMatch = cleanText.match(/'([^']+)'\s+on\s+Instagram/i);
  if (igMatch) {
    // Check for TikTok hashtags inside Instagram posts
    if (cleanText.includes('#kenyantiktok') || cleanText.includes('#fyp') || cleanText.includes('#foryoupage')) {
      return { platform: 'tiktok', account: igMatch[1] };
    }
    return { platform: 'instagram', account: igMatch[1] };
  }

  // Twitter/Analytics
  if (cleanText.includes('Analytics Report') || cleanText.includes('Tweets Published') || cleanText.includes('twitter.com')) {
    return { platform: 'twitter', account: 'rcns' };
  }

  // TikTok hashtags standalone
  if (cleanText.includes('#kenyantiktok') || cleanText.includes('#tiktok') || cleanText.includes('#fyp')) {
    const acctMatch = cleanText.match(/'([^']+)'\s+on\s+/i);
    return { platform: 'tiktok', account: acctMatch?.[1] || 'rcns' };
  }

  return { platform: 'unknown', account: 'rcns' };
}

function parseMessages(html: string): Post[] {
  const posts: Post[] = [];
  
  // Split by message divs
  const messageRegex = /<div class="message default clearfix[^"]*"\s+id="message(\d+)">([\s\S]*?)(?=<div class="message (?:default|service)"|$)/g;
  let match;
  
  while ((match = messageRegex.exec(html)) !== null) {
    const id = parseInt(match[1]);
    const block = match[2];
    
    // Extract date/time from title attribute
    const dateMatch = block.match(/title="(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})\s+UTC[^"]*"/);
    const date = dateMatch ? dateMatch[1] : '';
    const time = dateMatch ? dateMatch[2] : '';
    
    // Convert DD.MM.YYYY to ISO
    const dateParts = date.split('.');
    const isoDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : '';
    
    // Extract text content
    const textMatch = block.match(/<div class="text">\s*([\s\S]*?)\s*<\/div>/);
    const rawText = textMatch ? textMatch[1] : '';
    const text = stripHtml(rawText);
    
    // Extract photos (full-size)
    const photoRegex = /href="photos\/([^"]+\.jpg)"/g;
    const photos: string[] = [];
    let photoMatch;
    while ((photoMatch = photoRegex.exec(block)) !== null) {
      if (!photoMatch[1].includes('thumb')) {
        photos.push(photoMatch[1]);
      }
    }
    
    // Extract thumbnails
    const thumbRegex = /src="photos\/([^"]*_thumb[^"]*\.jpg)"/g;
    const thumbs: string[] = [];
    let thumbMatch;
    while ((thumbMatch = thumbRegex.exec(block)) !== null) {
      thumbs.push(thumbMatch[1]);
    }

    // Also grab photos from joined messages that follow this one
    // We'll handle joined messages in a second pass
    
    // Skip service messages and empty messages
    if (!text && photos.length === 0) continue;
    
    const { platform, account } = classifyPlatform(text);
    const hashtags = extractHashtags(text);
    const isAnalytics = text.includes('Analytics Report') || text.includes('System Metrics');
    const isForwarded = block.includes('forwarded body');
    
    posts.push({
      id,
      date,
      time,
      timestamp: isoDate ? `${isoDate}T${time}` : '',
      platform,
      account,
      text,
      hashtags,
      photos,
      thumbs,
      isAnalytics,
      isForwarded,
    });
  }
  
  // Second pass: merge joined messages' photos into their parent
  const joinedRegex = /<div class="message default clearfix joined"\s+id="message(\d+)">([\s\S]*?)(?=<div class="message (?:default|service)"|$)/g;
  let joinedMatch;
  
  while ((joinedMatch = joinedRegex.exec(html)) !== null) {
    const block = joinedMatch[2];
    
    // Get text and photos from joined message
    const textMatch = block.match(/<div class="text">\s*([\s\S]*?)\s*<\/div>/);
    const rawText = textMatch ? textMatch[1] : '';
    const text = stripHtml(rawText);
    
    const photoRegex = /href="photos\/([^"]+\.jpg)"/g;
    const photos: string[] = [];
    let photoM;
    while ((photoM = photoRegex.exec(block)) !== null) {
      if (!photoM[1].includes('thumb')) {
        photos.push(photoM[1]);
      }
    }
    
    const thumbRegex = /src="photos\/([^"]*_thumb[^"]*\.jpg)"/g;
    const thumbs: string[] = [];
    let thumbM;
    while ((thumbM = thumbRegex.exec(block)) !== null) {
      thumbs.push(thumbM[1]);
    }
    
    if (text || photos.length > 0) {
      // Find the most recent parent post
      const parent = posts[posts.length - 1];
      if (parent) {
        if (photos.length > 0) {
          parent.photos.push(...photos);
          parent.thumbs.push(...thumbs);
        }
        if (text && !parent.text) {
          parent.text = text;
          const { platform, account } = classifyPlatform(text);
          parent.platform = platform;
          parent.account = account;
          parent.hashtags = extractHashtags(text);
          parent.isAnalytics = text.includes('Analytics Report');
        } else if (text && parent.text) {
          // This is a caption for the photo set — create separate post
          const dateMatch = block.match(/title="(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})\s+UTC[^"]*"/);
          const date = dateMatch ? dateMatch[1] : parent.date;
          const time = dateMatch ? dateMatch[2] : parent.time;
          const dateParts = date.split('.');
          const isoDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : '';
          
          const { platform, account } = classifyPlatform(text);
          posts.push({
            id: parseInt(joinedMatch[1]),
            date,
            time,
            timestamp: isoDate ? `${isoDate}T${time}` : '',
            platform,
            account,
            text,
            hashtags: extractHashtags(text),
            photos,
            thumbs,
            isAnalytics: text.includes('Analytics Report'),
            isForwarded: block.includes('forwarded body'),
          });
        }
      }
    }
  }
  
  // Sort by id
  posts.sort((a, b) => a.id - b.id);
  
  return posts;
}

// ─── Copy Photos ───────────────────────────────────────────────────────

function copyPhotos() {
  if (!existsSync(PHOTOS_DEST)) {
    mkdirSync(PHOTOS_DEST, { recursive: true });
  }
  
  const files = readdirSync(PHOTOS_SRC);
  let copied = 0;
  
  for (const file of files) {
    if (file.endsWith('.jpg')) {
      const src = join(PHOTOS_SRC, file);
      const dest = join(PHOTOS_DEST, file);
      if (!existsSync(dest)) {
        copyFileSync(src, dest);
        copied++;
      }
    }
  }
  
  console.log(`📸 Copied ${copied} photos to public/photos/`);
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log('🔍 Parsing messages.html...');
  const html = readFileSync(HTML_PATH, 'utf-8');
  
  const posts = parseMessages(html);
  
  // Stats
  const stats = {
    total: posts.length,
    instagram: posts.filter(p => p.platform === 'instagram').length,
    twitter: posts.filter(p => p.platform === 'twitter').length,
    tiktok: posts.filter(p => p.platform === 'tiktok').length,
    unknown: posts.filter(p => p.platform === 'unknown').length,
    withPhotos: posts.filter(p => p.photos.length > 0).length,
    withText: posts.filter(p => p.text.length > 0).length,
    totalPhotos: posts.reduce((sum, p) => sum + p.photos.length, 0),
    analytics: posts.filter(p => p.isAnalytics).length,
  };
  
  console.log('\n📊 Extraction Stats:');
  console.log(`   Total posts: ${stats.total}`);
  console.log(`   Instagram:   ${stats.instagram}`);
  console.log(`   Twitter:     ${stats.twitter}`);
  console.log(`   TikTok:      ${stats.tiktok}`);
  console.log(`   Unknown:     ${stats.unknown}`);
  console.log(`   With photos: ${stats.withPhotos}`);
  console.log(`   With text:   ${stats.withText}`);
  console.log(`   Total photos: ${stats.totalPhotos}`);
  console.log(`   Analytics:   ${stats.analytics}`);
  
  // Write data
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, 'posts.json'), JSON.stringify(posts, null, 2));
  console.log(`\n✅ Wrote ${posts.length} posts to src/data/posts.json`);
  
  // Copy photos
  console.log('\n📸 Copying photos...');
  copyPhotos();
  
  console.log('\n🎉 Done!');
}

main();

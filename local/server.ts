/**
 * Local site server: Bun.serve wrapping the built SSR entry + the photo
 * bridge. Run: `bun local/server.ts` (needs `bun run build.local` first).
 *
 * Route order mirrors the worker entry:
 *   /photos/<file> → media-cache disk hit, else servePhoto (Telegram CDN
 *                    via the same src/lib/photo-source.ts, buffered once
 *                    into the disk cache) — 404/502 shapes preserved.
 *   static assets  → dist/ (client build).
 *   everything     → Qwik City router with the local platform env.
 *
 * The route env deliberately omits TELEGRAM_BOT_TOKEN/SECRET: the /api/telegram
 * self-heal must never point the real webhook at a local origin. The photo
 * bridge gets the token through its own env object instead.
 */

import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { openLocalStack } from "./platform";
import { MEDIA_CACHE_DIR } from "./classify";
import { servePhoto } from "../src/lib/photo-source";

const REPO_ROOT = join(import.meta.dir, "..");
const DIST_SERVER_ENTRY = process.env.RCNS_LOCAL_ENTRY ?? join(REPO_ROOT, "server", "entry.local.js");
const STATIC_ROOT = join(REPO_ROOT, "dist");
const PORT = Number(process.env.RCNS_LOCAL_PORT ?? 8788); // 8787 is taken by a local bb service

if (!existsSync(DIST_SERVER_ENTRY)) {
  console.error(`[server] missing SSR bundle: ${DIST_SERVER_ENTRY} — run \`bun run build.local\` first`);
  process.exit(1);
}

const { createLocalApp } = (await import(DIST_SERVER_ENTRY)) as {
  createLocalApp: typeof import("../src/entry.local").createLocalApp;
};

const { store, kv, env } = openLocalStack();
const app = createLocalApp(env, { staticRoot: STATIC_ROOT });

const photoEnv = {
  DB: env.DB,
  CACHE: kv,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
};

mkdirSync(MEDIA_CACHE_DIR, { recursive: true });

/** Disk-first photo bridge: one upstream fetch per photo, forever after local. */
async function servePhotoCached(fileName: string): Promise<Response> {
  const cachePath = join(MEDIA_CACHE_DIR, fileName);
  if (fileName.includes("..") || fileName.includes("/")) {
    return new Response("Media Not Found", { status: 404 });
  }
  if (existsSync(cachePath)) {
    const bytes = readFileSync(cachePath);
    return new Response(bytes, {
      headers: {
        "Content-Type": fileName.endsWith(".png") ? "image/png" : "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Photo-Source": "disk",
      },
    });
  }
  const res = await servePhoto(fileName, photoEnv);
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    try {
      writeFileSync(cachePath, buf);
    } catch {
      // cache write failure is non-fatal — serve anyway
    }
    return new Response(buf, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Photo-Source": "telegram",
      },
    });
  }
  return res;
}

console.log(`[server] rcns local — http://localhost:${PORT} (db via platform, photos via disk/Telegram)`);
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.log("[server] note: no TELEGRAM_BOT_TOKEN — cold /photos/ lookups will 404 until cutover sets it");
}

Bun.serve({
  port: PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/photos/")) {
      return servePhotoCached(url.pathname.slice("/photos/".length));
    }
    const staticRes = await app.staticFile(request);
    if (staticRes) return staticRes;
    const routerRes = await app.router(request);
    if (routerRes) return routerRes;
    return app.notFound(request);
  },
});

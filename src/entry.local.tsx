/**
 * Local SSR entry — the Bun middleware pattern with a platform env injected
 * at runtime.
 *
 * The shipped @builder.io/qwik-city/middleware/bun router hardcodes
 * `platform: { ssr: true }` with no way to pass bindings, and this site's
 * loaders read `platform.env` (DB/CACHE/CLASSIFY_QUEUE). So this entry
 * replicates that router (~45 lines, same request-handler core every
 * adapter uses) with `platform: { ssr: true, env }`.
 *
 * Build: `vite build --ssr src/entry.local.tsx` (see package.json
 * build.local). Consume: local/server.ts imports the built bundle and calls
 * createLocalApp(env, { staticRoot }).
 */

import { requestHandler, mergeHeadersCookies } from "@builder.io/qwik-city/middleware/request-handler";
import { getNotFound } from "@qwik-city-not-found-paths";
import { isStaticPath } from "@qwik-city-static-paths";
import qwikCityPlan from "@qwik-city-plan";
// make sure qwikCityPlan is imported before entry
import render from "./entry.ssr";
import { _deserializeData, _serializeData, _verifySerializable } from "@builder.io/qwik";
import { extname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const MIME_TYPES: Record<string, string> = {
  css: "text/css", htm: "text/html", html: "text/html", ico: "image/x-icon",
  js: "application/javascript", json: "application/json", jpeg: "image/jpeg",
  jpg: "image/jpeg", png: "image/png", svg: "image/svg+xml", webp: "image/webp",
  woff: "font/woff", woff2: "font/woff2", txt: "text/plain",
};

export interface LocalAppEnv {
  [key: string]: unknown;
}

export interface LocalApp {
  router: (request: Request) => Promise<Response | null>;
  notFound: (request: Request) => Promise<Response>;
  staticFile: (request: Request) => Promise<Response | null>;
}

function getRequestUrl(request: Request, origin: string | undefined): URL {
  const url = new URL(request.url);
  if (!origin) return url;
  return new URL(`${url.pathname}${url.search}${url.hash}`, origin);
}

/** Factory: inject the platform env and static root at runtime. */
export function createLocalApp(
  env: LocalAppEnv,
  opts: { staticRoot: string; origin?: string; cacheControl?: string } = { staticRoot: "dist" },
): LocalApp {
  const qwikSerializer = { _deserializeData, _serializeData, _verifySerializable };
  const origin = opts.origin ?? process.env.ORIGIN;

  async function router(request: Request): Promise<Response | null> {
    try {
      const url = getRequestUrl(request, origin);
      const serverRequestEv = {
        mode: "server" as const,
        locale: undefined,
        url,
        env: { get(key: string) { return process.env[key]; } },
        request,
        getWritableStream: (
          status: number,
          headers: Headers,
          cookies: any,
          resolve: (r: Response) => void,
        ) => {
          const { readable, writable } = new TransformStream();
          const response = new Response(readable, {
            status,
            headers: mergeHeadersCookies(headers, cookies),
          });
          resolve(response);
          return writable;
        },
        platform: { ssr: true, env: env as any },
        getClientConn: () => ({}),
      };
      const handled = await requestHandler(serverRequestEv, { render, qwikCityPlan }, qwikSerializer);
      if (handled) {
        handled.completion.then((v) => {
          if (v) console.error(v);
        });
        const response = await handled.response;
        if (response) {
          const status = response.status;
          const location = response.headers.get("Location");
          if (status >= 301 && status <= 308 && location) {
            return new Response(null, response);
          }
          return response;
        }
      }
      return null;
    } catch (e) {
      console.error(e);
      return new Response(String(e || "Error"), {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-Error": "local-server" },
      });
    }
  }

  async function notFound(request: Request): Promise<Response> {
    try {
      const url = getRequestUrl(request, origin);
      const notFoundHtml = isStaticPath(request.method || "GET", url)
        ? "Not Found"
        : getNotFound(url.pathname);
      return new Response(notFoundHtml, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Not-Found": url.pathname },
      });
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  }

  async function staticFile(request: Request): Promise<Response | null> {
    try {
      const url = getRequestUrl(request, origin);
      if (!isStaticPath(request.method || "GET", url)) return null;
      const pathname = url.pathname;
      const fileName = pathname.slice(pathname.lastIndexOf("/"));
      let filePath: string;
      if (fileName.includes(".")) {
        filePath = join(opts.staticRoot, pathname);
      } else if ((qwikCityPlan as any).trailingSlash) {
        filePath = join(opts.staticRoot, pathname + "index.html");
      } else {
        filePath = join(opts.staticRoot, pathname, "index.html");
      }
      if (!existsSync(filePath)) {
        return new Response("Not Found", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8", "X-Not-Found": pathname },
        });
      }
      const ext = extname(filePath).replace(/^\./, "");
      return new Response(readFileSync(filePath), {
        status: 200,
        headers: {
          "content-type": MIME_TYPES[ext] || "text/plain; charset=utf-8",
          "Cache-Control": opts.cacheControl || "max-age=3600",
        },
      });
    } catch (e) {
      console.error(e);
      return new Response(String(e || "Error"), {
        status: 500,
        headers: { "X-Error": "local-static" },
      });
    }
  }

  return { router, notFound, staticFile };
}

export default createLocalApp;

# local/ — the local-first pipeline

The site's content pipeline, moved off Cloudflare onto this machine. One
SQLite file, one process, generated JSON read models, and (post-cutover)
local ingestion + classification + serving.

## What runs where

| Concern | Owner |
|---|---|
| Telegram ingestion | webhook → worker → D1 **(pre-cutover)**; `poller.ts` **(post-cutover)** |
| Classification | live queue consumer **(pre-cutover)**; `classify.ts` **(post-cutover)** |
| Gallery read models | worker KV nightly + local JSON (parity-proven 2026-11-12) |
| Photo bytes | Telegram CDN; local disk cache (`media-cache/`) post-cutover |
| Serving | Cloudflare worker **(pre-cutover)**; `bun local/server.ts` post-cutover |

`local/` **mirrors** D1 (read-only incremental pulls by tx_id) and builds
the same five gallery read models through the *worker's own builder*
(`src/lib/gallery.ts`, unmodified). Nothing here writes to Cloudflare.

## Files

| File | Role |
|---|---|
| `d1-remote.ts` | Read-only D1 REST client (chunked pulls, watermarks) |
| `sqlite-store.ts` | bun:sqlite + schema + the D1-shaped adapter + meta table |
| `mirror.ts` | Full export / incremental sync — also the `export` CLI entry |
| `build.ts` | Five galleries → JSON files (the KV replacement) |
| `run.ts` | Nightly mirror entry: watermark probe → mirror → build |
| `parity.ts` | Diffs local JSON vs live KV values, classifies diffs |
| `kv.ts` | FileKV: CF-KV-shaped cache (`get(key,"json")`, TTL, delete) |
| `poller.ts` | Telegram getUpdates poller — the webhook POST handler ported |
| `classify.ts` | classification_jobs drain → inferhub/Gemini → media_facts |
| `platform.ts` | D1Stmt (with bind) + env assembly for the local server |
| `server.ts` | Bun.serve: /photos bridge, static dist/, Qwik router |
| `tick.ts` | One pipeline pass: poll → classify → build |
| `local.test.ts`, `poller.test.ts`, `classify.test.ts` | `bun test local/` |

`src/entry.local.tsx` (in src/, built by `vite build --ssr`) is the local
SSR entry: the Bun middleware router replica with `platform.env` injected
at runtime.

## Environment (`~/.opencrabs/projects/rotary-local/.env.sh`, chmod 600)

```sh
export CLOUDFLARE_ACCOUNT_ID=...   # mirror only
export CLOUDFLARE_EMAIL=...
export CLOUDFLARE_API_KEY=...      # global key (read-only use here)
export D1_DATABASE_ID=2353e3b0-47a4-4fad-bbdf-11d02e3037d6
export RCNS_KV_NAMESPACE=f92d9b7c7de04b4eaa0fba93f36c95bb   # parity only
export INFERSHUB_API_KEY=...       # classification main path
export GEMINI_API_KEY=...          # classification fallback
export TELEGRAM_BOT_TOKEN=...      # REQUIRED FOR CUTOVER (see below)
# optional:
export RCNS_LOCAL_DB / RCNS_LOCAL_OUT / RCNS_LOCAL_ROOT / RCNS_LOCAL_PORT(=8788)
```

## Commands

```sh
bun local/mirror.ts      # full export / incremental (idempotent)
bun local/build.ts       # rebuild the five gallery JSONs
bun local/parity.ts      # compare vs live KV (benign window = OK)
bun local/run.ts         # nightly mirror: skip-if-unchanged
bun local/tick.ts        # poll → classify → build (the post-cutover cron shape)
bun local/poller.ts      # one getUpdates pass (needs TELEGRAM_BOT_TOKEN)
bun local/classify.ts    # drain classification jobs
bun run build.local      # client + SSR bundle (dist/ + server/entry.local.js)
bun run local:serve      # serve the site on :8788
bun test local/          # the local test suite
```

## Cutover: COMPLETED 2026-11-13 (17:00 UTC)

The flip ran end-to-end on the owner's token:

1. Token verified via `getMe` → **@rotaryrcnsbot** (the channel-admin bot
   named from the admin list). `getWebhookInfo`: live receiver, 0 pending.
2. Final mirror (21 rows, today's delta) → local == D1 at cut time.
3. `deleteWebhook` (pending kept) → **Cloudflare ingestion stopped**.
4. `rcns-local-poll` cron ENABLED (*/5, trigger-gated: fires only on
   new posts/photos/failures; quiet ticks are one getUpdates call).
5. Local server verified live on :8788 incl. cold photo via bot token.

Post-flip hardening (PR #21): `pollOnce` self-heals a re-armed webhook
(409 → deleteWebhook → retry) — guards against the CF worker's
`/api/telegram` self-heal re-registering it. Quiet ticks skip the rebuild.

**State now:** D1 is the cold archive (nightly mirror reports
`skipped: true` forever — that's the freeze proof). The CF worker serves
its last-published KV state at `rotarynairobis.iamkingori.workers.dev`
(dormant fallback). The public domain points at the local tunnel — see
**Public serving** below.

Runbook for a fresh machine / restart:

```sh
# poller + classifier + builder (the cron does this every 5 min):
cd ~/src/rotarynairobis && source ~/.opencrabs/projects/rotary-local/.env.sh && bun local/tick.ts
# site: launchd manages it now (see Public serving); manual: bun run build.local && bun run local:serve
```

## Public serving: LIVE 2026-11-13 (Cloudflare Tunnel)

`rotarynairobis.com` → CF edge → named tunnel **`rcns-local`**
(`f41f65e9-565a-469b-90cf-4b184f5f2d41`) → `http://localhost:8788`.

- **DNS**: zone `a4e5deb…`; root CNAME → `f41f65e9….cfargotunnel.com`,
  proxied. The worker's custom-domain attachment on the root was deleted
  (the workers.dev URL still serves the frozen fallback).
  `club.`/`jaipur.` custom domains belong to *other* workers — untouched.
- **Tunnel**: locally managed. Config
  `~/.opencrabs/projects/rotary-local/tunnel/config.yml`, credentials
  `tunnel/creds.json` (600 — connector secret; rotate by deleting +
  recreating the tunnel if it ever leaks).
- **launchd (survives reboot, KeepAlive)**: `com.rcns.server` →
  `local/run-server.sh` (sources the 600-perm env file, execs bun);
  `com.rcns.tunnel` → cloudflared. Logs:
  `~/.opencrabs/projects/rotary-local/logs/{server,tunnel}*.log`.
- **Ops**: `launchctl load -w ~/Library/LaunchAgents/com.rcns.{server,tunnel}.plist`
  (`unload -w` to stop).
- **Rollback to the CF worker**: delete the root CNAME, re-attach the
  custom domain in the dashboard (Workers → rotarynairobis → Domains),
  `bun run deploy`. Nothing else changed.
- **Latency reality**: TTFB from this Mac ~1.2s (its route to the CF edge
  is ~500ms RTT; the tunnel adds edge→Mac hops; local server is 24ms).
  Static assets edge-cache after first hit (`CF-Cache-Status: HIT`).
  Future knob: `Cache-Control: s-maxage` on HTML.
- **Uptime dependency**: the site dies when this Mac sleeps or powers
  off. Content freshness also needs the OpenCrabs `rcns-local-poll` cron
  (*/5). Photos keep serving regardless — the server holds the token.

## Verified (2026-11-12)

- Mirror: local == live D1 exactly (4,135 / 3,856 / 3,804; newest fact
  today 16:15 UTC — pipeline live).
- Parity vs live KV: exact counts on tiktok/birthdays/twitter; instagram
  +1 (today's post, after the live publish), recaps -1 (a re-classification
  postdates the KV snapshot — local is the newer truth). Same benign-window
  class as the 2026-11-12 parity gate.
- Local server: all 9 routes 200 (2-70ms), static assets served, `/api/sync`
  serves local facts, `/api/publish` fails closed, `/api/telegram` inert
  (no token in route env — self-heal can never repoint the real webhook).
- Tests: 24/24 bun local (self-heal + quiet-tick pins); repo suite + tsc clean at each commit.

## Verified (2026-11-13, the flip)

- `getMe` → @rotaryrcnsbot; webhook was live with 0 pending updates.
- Final mirror 21 rows; `deleteWebhook` → `getWebhookInfo.url` empty.
- First post-flip tick: `polled: 0` (correct — mirror already had today's
  16:15 post), full chain ran clean.
- Server on :8788: `/twitter/` 200 in 74ms; cold photo 200/230KB in 1.8s
  via Telegram (token path proven), warm 0.7ms from disk cache.
- Legacy R2-era filenames (e.g. `photo_616@…`) 404 locally — their bytes
  lived in suspended R2 and were already broken on the public site; not a
  flip regression.

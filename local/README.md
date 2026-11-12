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

## Cutover runbook (everything is built; the flip needs one input)

The one missing secret is the **site bot token** — the bot that is admin of
the `@rotarynairobis` channel and currently holds the live webhook. It is
a worker secret (unreadable by design) and is NOT on this machine (hunted:
session DB, keys.toml, .dev.vars, repo copies — none). Two ways to supply:

- **(a) existing bot**: @BotFather → the RCNS bot → copy its token into
  `.env.sh` as `TELEGRAM_BOT_TOKEN`. Find the bot's name in the channel's
  admin list.
- **(b) fresh bot** (arguably cleaner): @BotFather `/newbot`, add it as
  admin of the channel, put its token in `.env.sh`. The old bot's webhook
  keeps writing to D1 as a dormant fallback until you remove it.

Then the flip, in order:

1. `deleteWebhook` on the poller bot (only for (a); with (b) skip — two
   bots can coexist, only one needs getUpdates).
2. Enable the `rcns-local-poll` cron (created DISABLED, trigger-gated:
   fires only when posts/photos/errors land, zero-token quiet ticks).
3. `bun run local:serve` under a supervisor (launchd) — site live on :8788.
4. Point the domain at it — two options: a Cloudflare Tunnel from this
   Mac (free, needs cloudflared), or keep Cloudflare as static host with
   the generated output (needs the static render + photo warm-all).
5. D1 becomes the cold archive (nightly mirror then no-ops: local
   outgrows remote, delta pulls zero rows).

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
- Tests: 22/22 bun local; repo suite + tsc clean at each commit.

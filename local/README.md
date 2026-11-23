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
| `classify.ts` | classification_jobs drain → OpenRouter Decisions / inferhub / Gemini → media_facts |
| `smoke-openrouter.ts` | one-photo Decisions smoke test (shares production criteria) |
| `platform.ts` | D1Stmt (with bind) + env assembly for the local server |
| `server.ts` | Bun.serve: /photos bridge, static dist/, Qwik router |
| `tick.ts` | One pipeline pass: poll → classify → build |
| `poll-receipt.ts` | tick + receipt straight to the Bot API — the LLM-free cron shape |
| `poll-receipt.sh` | Launcher (cron `trigger_cmd`): env, bot token, log rotation |
| `local.test.ts`, `poller.test.ts`, `classify.test.ts`, `poll-receipt.test.ts` | `bun test local/` |

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
export INFERSHUB_API_KEY=...       # classification fallback #1 (main model disabled upstream)
export GEMINI_API_KEY=...          # classification fallback #2 (placeholder — invalid)
export OPENROUTER_API_KEY=...      # classification MAIN path (Decisions API)
export TELEGRAM_BOT_TOKEN=...      # REQUIRED FOR CUTOVER (see below)
# optional:
export OPENROUTER_MODEL=...        # default perplexity/pplx-decider-v1.3:free
export CLASSIFY_PACE_MS=...        # delay between classify calls (free-tier pacing)
export RCNS_LOCAL_DB / RCNS_LOCAL_OUT / RCNS_LOCAL_ROOT / RCNS_LOCAL_PORT(=8788)
```

## Commands

```sh
bun local/mirror.ts      # full export / incremental (idempotent)
bun local/build.ts       # rebuild the five gallery JSONs
bun local/parity.ts      # compare vs live KV (benign window = OK)
bun local/run.ts         # nightly mirror: skip-if-unchanged
bun local/tick.ts        # poll → classify → build (library entry)
bash local/poll-receipt.sh   # the cron shape: tick + receipt, no LLM involved
bun local/poller.ts      # one getUpdates pass (needs TELEGRAM_BOT_TOKEN)
bun local/classify.ts    # drain classification jobs (CLASSIFY_PACE_MS=3200 to pace)
bun local/smoke-openrouter.ts [photo]   # one-photo Decisions smoke test
bun run build.local      # client + SSR bundle (dist/ + server/entry.local.js)
bun run local:serve      # serve the site on :8788
bun test local/          # the local test suite
```

## Classifier: OpenRouter Decisions (recovered 2026-11-21)

Classification had been **dead since Nov 14, 21:50** — galleries frozen while
ingestion kept working. Two stacked failures (issue #25): the inferhub main
model `ag/gemini-3.8-flash-high` is disabled upstream (403), and the Gemini
fallback key was a 16-char placeholder (`API_KEY_INVALID`). 60 jobs failed.

**Fix (PR #26):** the main path is now the **OpenRouter Decisions API** —
`perplexity/pplx-decider-v1.3:free`, a System One decision model. It answers a
typed `choice` question over the image at `POST /api/alpha/decisions` (NOT
chat/completions — that 400s for decision models) and returns the winning
category + calibrated confidence (0.95–0.997 on samples). Chain:
**OpenRouter → inferhub → Gemini**.

- Decision models emit **no text**, so the snippet is the human post caption
  (`captionMap`), not an AI guess. `parseGeminiResponse` boundary unchanged.
- Drain is **429-safe** (rate limits back off without failing the job) and
  accepts `CLASSIFY_PACE_MS` for free-tier pacing.
- Requeued + drained all 60 stuck photos: **done 20 → 80, failed 0**.
  Galleries unfrozen (newest Nov 20–21). The `:free` tier handled 60 calls.
- Also fixed the cache bridge: `build.ts` now writes gallery keys into the
  same FileKV the server reads (the `generated/` files were orphaned).

If inferhub's main model is re-enabled in the dashboard later, it remains
fallback #1 automatically — no code change needed.

## Ingestion invariant: content flow never depends on a model provider (2026-11-23)

**The rule:** the poll → classify → build chain runs in plain `bun`, on the
scheduler's `trigger_cmd`, and posts its own receipt through the Bot API. No
LLM session may sit between Telegram and the database. Classification is the
one step that wants a model, and it is a *queue*: if every provider is down,
jobs stay `pending`, retry after their cooldown, and ingestion keeps running.

Why the rule exists: `rcns-local-poll` used to run *inside* an agent turn. On
2026-11-23 09:15 UTC every provider in the fallback chain returned 503, the
cron session died before its first tool call, and **Telegram ingestion stopped
with it for ~6 hours** — a narration failure had become a data failure.

Shape of the runner:

| Stream | Carries | Consumed by |
|---|---|---|
| stderr | every tick line, receipt posted/failed | `logs/poll-receipt.log` (rotates at 512 KB) |
| stdout | escalation text **only** | the cron trigger — non-empty is what wakes an agent |

- `renderReceipt` returns `""` when nothing moved, so "nothing to report" and
  "report nothing" are one fact. A quiet tick prints nothing to stdout: **zero
  tokens, no agent woken.**
- Escalation path: if the direct Bot API send fails, the receipt text goes to
  stdout so the cron agent can post it — degraded, not silent. The agent's
  prompt is a one-message relay with an explicit "never re-run the tick".
- Secrets: the site token and classifier keys come from the 600-perm
  `.env.sh`; the receipt token is read from `keys.toml` at run time by the
  launcher. Nothing here echoes a value, and no key lives in this repo.
- Cron wiring (`cron_manage`, job `rcns-local-poll`, */5 UTC):
  `trigger_cmd = bash /Users/moe/src/rotarynairobis/local/poll-receipt.sh`,
  `trigger_on = non_empty`, `deliver_to = telegram:-1004427473737:6322`.

**Known limit, stated not hidden:** a bot never receives its own `sendMessage`,
so receipts posted this way are absent from OpenCrabs' channel log —
`channel_search` will not show them. Proof of delivery is the
`[receipt] posted: …` line in `logs/poll-receipt.log`.

Related, same theme: classification jobs no longer terminate. Three failed
attempts used to set status `failed`, which nothing ever read again, stranding
a photo forever on one transient blip (#28). Now: short backoff, then a 6 h
cooldown, always `pending`, with legacy `failed` rows revived on startup — and
the receipt says `unclassified N`, never `failed N`.

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
(409 → deleteWebhook → retry). Quiet ticks skip the rebuild.

The CF worker's `/api/telegram` GET used to re-register the webhook to
whatever origin served it, unauthenticated — the hazard PR #21 defended
against. PR #30 removed the mutation: that handler now only reports
alignment, behind the secret Telegram posts with. The poller remains the
only thing that re-arms a webhook, and it does so by deleting it.

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
  (no token in route env — the worker's self-heal could never repoint the real
  webhook from here; that whole mutation is gone as of #29).
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

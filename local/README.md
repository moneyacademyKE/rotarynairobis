# local/ — the local-first pipeline (mirror mode)

The site's content pipeline, moved off Cloudflare onto this machine. One
SQLite file, one process, generated JSON read models. The live Cloudflare
site keeps serving untouched until cutover — this directory **writes
nothing to Cloudflare**.

## What runs where (current state)

| Concern | Owner |
|---|---|
| Telegram ingestion → D1 facts | **still the live worker webhook** |
| Classification (inferhub main / Gemini fallback) | **still the live queue consumer** |
| Gallery read models | **both**: worker KV nightly, local JSON on demand (parity-proven 2026-11-12) |
| Photo bytes | Telegram CDN (worker bridge); local copies not needed |

`local/` **mirrors** D1 (read-only incremental pulls by tx_id) and builds
the same five gallery read models through the *worker's own builder*
(`src/lib/gallery.ts`, unmodified, via a D1-shaped SQLite adapter).

## Files

| File | Role |
|---|---|
| `d1-remote.ts` | Read-only D1 REST client (chunked pulls, watermarks) |
| `sqlite-store.ts` | bun:sqlite + schema + the D1-shaped adapter + meta table |
| `mirror.ts` | Full export / incremental sync (same op, different starting point) — also the `export` CLI entry |
| `build.ts` | Five galleries → JSON files (the KV replacement) |
| `run.ts` | Nightly entry: watermark probe → mirror → build (skips when unchanged) |
| `parity.ts` | Diffs local JSON vs live KV values, classifies diffs |
| `local.test.ts` | `bun test local/` — adapter contract, dedupe/retraction semantics, watermark skip |

## Environment

```sh
export CLOUDFLARE_ACCOUNT_ID=...   # read from the mirror only
export CLOUDFLARE_EMAIL=...
export CLOUDFLARE_API_KEY=...      # global key (read-only use here)
export D1_DATABASE_ID=2353e3b0-47a4-4fad-bbdf-11d02e3037d6
export RCNS_KV_NAMESPACE=f92d9b7c7de04b4eaa0fba93f36c95bb   # parity only
# optional:
export RCNS_LOCAL_DB=~/.opencrabs/projects/rotary-local/rcns.sqlite
export RCNS_LOCAL_OUT=~/.opencrabs/projects/rotary-local/generated
```

## Commands

```sh
bun local/mirror.ts    # one-time full export (idempotent: re-runs pull deltas)
bun local/build.ts     # rebuild the five gallery JSONs
bun local/parity.ts    # compare vs live KV (benign sliding-window = OK)
bun local/run.ts       # nightly shape: skip-if-unchanged, mirror, build
bun test local/        # the local test suite
```

## Verified

2026-11-12: counts match live D1 exactly (4,135 / 3,856 / 3,804 rows);
parity vs live KV = 1 identical + 4 benign sliding windows (today's
post-publish arrivals), **zero shared-row value mismatches** — the local
builder output is byte-identical to production for the same data.

## Cutover checklist (NOT built yet — build when cutting over)

1. **Local poller** (`poll.ts`, to write): Telegram `getUpdates` replaces
   the webhook. Requires `TELEGRAM_BOT_TOKEN` (a worker secret today —
   owner must supply once) and `deleteWebhook` first (Telegram rejects
   getUpdates while a webhook is set). Replicate the webhook semantics
   from `src/routes/api/telegram/index.ts` exactly: raw fact insert,
   reply-merge-into-photo-only-parent, photos_json naming
   (`telegram_<file_unique_id>.jpg`), queue push → local job table.
2. **Local classifier** (`classify.ts`, to write): poll local job table for
   photos missing `media_facts`; `classifyImage()` from
   `src/lib/classify-client.ts` works as-is under bun. Mirror mode does
   NOT run it (the live queue already classifies — double spend).
3. **Static serving**: `generated/*.json` + the Qwik static routes. The
   site's data flows become local files; Cloudflare (or any host) serves
   finished bytes.
4. **D1 becomes cold archive**: keep the last export as the recovery copy.

Until 1-3 land, D1 reads continue via the mirror (a few thousand rows per
night, indexed and incremental — well inside free tier).

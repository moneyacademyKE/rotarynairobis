#!/bin/bash
# Pre-flight trigger for the rcns-local-poll cron job (cron_manage:
# trigger_cmd = "bash <repo>/local/poll-receipt.sh", trigger_on = non_empty).
# Secrets and logs stay outside the repo, in $HOME/.opencrabs/projects/rotary-local.
#
# The tick used to run inside an LLM-backed cron session, so a provider 503
# ("all candidate nodes failed or capacity exhausted") stopped Telegram
# ingestion along with the narration. Here the pipeline runs in plain bun and
# posts its own receipt through the Bot API. stdout stays empty on a normal
# run: trigger_cmd output is what wakes an agent, so a quiet tick costs zero
# tokens and no model has to be healthy for the site to update.
#
# Streams: stderr -> log file (durable record), stdout -> the cron trigger
# (escalation only, when the direct send failed and an agent is last resort).
#
# The OpenCrabs bot token is read from keys.toml at run time, never echoed.
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

HOME_DIR="${HOME:-/Users/moe}"
# The runner lives beside this script, so locate the repo from here rather than
# hardcoding a clone path that moves.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$HOME_DIR/.opencrabs/projects/rotary-local"
LOG="$STATE/logs/poll-receipt.log"

mkdir -p "$STATE/logs"
if [ -f "$LOG" ]; then
    size=$(stat -f %z "$LOG" 2>/dev/null || echo 0)
    if [ "$size" -gt 524288 ]; then
        : > "$LOG"
    fi
fi

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >>"$LOG"; }

# Site bot token + classifier keys (600 perms; values never printed).
if [ -f "$STATE/.env.sh" ]; then
    # shellcheck disable=SC1091
    . "$STATE/.env.sh"
else
    log "missing $STATE/.env.sh — poll will be skipped"
fi

# The receipt goes out through the OpenCrabs bot: it is the member of the
# destination topic, the site bot is not.
RCNS_RECEIPT_TOKEN="$(awk '
  /^\[channels\.telegram\]/   { f = 1; next }
  /^\[/                       { f = 0 }
  f && /^[ \t]*token[ \t]*=/  { sub(/^[^=]*=[ \t]*/, ""); gsub(/["'\'']/, ""); print; exit }
' "$HOME_DIR/.opencrabs/keys.toml" 2>/dev/null)"
export RCNS_RECEIPT_TOKEN
export RCNS_RECEIPT_CHAT_ID="-1004427473737"
export RCNS_RECEIPT_THREAD_ID="6322"

if [ ! -d "$REPO" ]; then
    log "no repo at $REPO"
    exit 0
fi
cd "$REPO" || exit 0

if [ -z "$RCNS_RECEIPT_TOKEN" ]; then
    log "no OpenCrabs telegram token in keys.toml — receipt would be lost"
fi

log "tick start"
bun local/poll-receipt.ts 2>>"$LOG"
log "tick exit=$?"
exit 0

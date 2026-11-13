#!/bin/bash
# Persistent runner for the local RCNS site server (launchd entry).
# Secrets live only in the 600-perm env file sourced below.
export PATH="/opt/homebrew/bin:$PATH"
. "$HOME/.opencrabs/projects/rotary-local/.env.sh"
cd "$HOME/src/rotarynairobis"
exec bun local/server.ts

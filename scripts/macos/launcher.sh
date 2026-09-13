#!/bin/bash
#
# DailyHub.app launcher.
#
# A .app opened from Finder inherits a bare PATH (/usr/bin:/bin:/usr/sbin:/sbin),
# so nvm, Volta, Homebrew and ~/.local/bin are all invisible here. Everything this
# script calls is either an absolute path or something it resolved itself.
#
# Built by scripts/build-macos-app.sh — edit that, not the copy inside the bundle.

set -uo pipefail

PORT="${DAILYHUB_PORT:-9999}"
URL="http://127.0.0.1:${PORT}"

# Set DAILYHUB_APP_MODE=1 for a chromeless Chrome window instead of a browser tab.
APP_MODE="${DAILYHUB_APP_MODE:-0}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# The @latest tag is load-bearing: a bare spec lets npx serve whatever it has
# cached for this working directory, which can be an ancient build.
PACKAGE="@baselhusam/daily-hub@latest"
REPO_CLI="__REPO_CLI__"
DATA_DIR="${DAILYHUB_DATA_DIR:-$HOME/.daily-hub}"
LOG="$DATA_DIR/launcher.log"

mkdir -p "$DATA_DIR"
exec 2>>"$LOG"
echo "--- launch $(date) ---" >>"$LOG"

# Messages must not contain double quotes — they are interpolated into AppleScript.
die() {
  echo "FATAL: $1" >>"$LOG"
  /usr/bin/osascript \
    -e "display dialog \"$1\" with title \"DailyHub\" buttons {\"Show log\", \"OK\"} default button \"OK\" with icon stop" \
    -e "if button returned of result is \"Show log\" then do shell script \"open -a Console '$LOG'\"" \
    >/dev/null 2>&1
  exit 1
}

server_up() {
  /usr/bin/curl -sf -o /dev/null --max-time 2 "$URL"
}

open_ui() {
  if [ "$APP_MODE" = "1" ] && [ -x "$CHROME" ]; then
    "$CHROME" --app="$URL" >/dev/null 2>&1 &
  else
    /usr/bin/open "$URL"
  fi
}

find_node() {
  local candidate
  for candidate in \
    "$HOME/.local/bin/node" \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    "$HOME/.volta/bin/node" \
    "$HOME/.asdf/shims/node"; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  # nvm keeps one directory per version; take the highest, not the first alphabetically.
  candidate="$(/bin/ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | /usr/bin/sort -V | /usr/bin/tail -1)"
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    echo "$candidate"
    return 0
  fi

  return 1
}

# Already running? Just show it. Done before anything else so a missing Node
# cannot stop you reaching a server that is up.
if server_up; then
  echo "already running on $PORT" >>"$LOG"
  open_ui
  exit 0
fi

NODE="$(find_node)" || die "DailyHub needs Node 22 or newer, and could not find it. Install Node from nodejs.org, then open DailyHub again."

NODE_BIN="$(/usr/bin/dirname "$NODE")"
export PATH="$NODE_BIN:/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "node: $NODE ($("$NODE" -v 2>/dev/null))" >>"$LOG"

# Prefer a global install, then this checkout if it has been built, then npx.
#
# Always from a neutral directory: npx resolves against the current working
# directory, so launching from inside a checkout of the package itself makes it
# pick up a local or cached build instead of the published one.
run_cli() {
  cd "$DATA_DIR" || cd / || return 1
  if command -v daily-hub >/dev/null 2>&1; then
    echo "cli: global daily-hub" >>"$LOG"
    daily-hub "$@"
  elif [ -n "$REPO_CLI" ] && [ -f "$REPO_CLI" ] && [ -f "${REPO_CLI%/bin/daily-hub.js}/.next/standalone/server.js" ]; then
    echo "cli: $REPO_CLI" >>"$LOG"
    "$NODE" "$REPO_CLI" "$@"
  elif [ -x "$NODE_BIN/npx" ]; then
    echo "cli: npx $PACKAGE" >>"$LOG"
    "$NODE_BIN/npx" -y "$PACKAGE" "$@"
  else
    return 127
  fi
}

echo "starting on port $PORT" >>"$LOG"
if ! run_cli start --detach --no-open --port "$PORT" >>"$LOG" 2>&1; then
  die "DailyHub could not start. The log has the details."
fi

# First run through npx downloads the package, so allow a generous window.
for _ in $(seq 1 180); do
  if server_up; then
    echo "up on $PORT" >>"$LOG"
    open_ui
    exit 0
  fi
  sleep 1
done

die "DailyHub did not come up within three minutes. The log has the details."

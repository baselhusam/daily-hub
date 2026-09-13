#!/bin/bash
#
# Builds dist/DailyHub.app — a launcher that starts the DailyHub server in the
# background and opens the app, so DailyHub has a Dock icon and a Spotlight entry.
#
# This is the development-side builder: it re-rasterises the icon from icon.svg,
# which needs Chrome. Users get the same bundle from `daily-hub install-app`,
# which assembles it from the committed PNG and needs nothing but macOS.
#
# It is not a packaged app: there is no bundled runtime and no window of its own.
# See CLAUDE.md for what a real Electron build would involve.
#
# Usage: ./scripts/build-macos-app.sh [--app-mode]
#   --app-mode  Open a chromeless Chrome window instead of a browser tab.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/scripts/macos"
OUT="$REPO_ROOT/dist"
APP="$OUT/DailyHub.app"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

APP_MODE=0
for arg in "$@"; do
  case "$arg" in
    --app-mode) APP_MODE=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

VERSION="$(node -p "require('$REPO_ROOT/package.json').version")"
echo "Building DailyHub.app $VERSION"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# --- Info.plist -------------------------------------------------------------
sed "s/__VERSION__/$VERSION/g" "$SRC/Info.plist" > "$APP/Contents/Info.plist"
plutil -lint "$APP/Contents/Info.plist" >/dev/null

# --- launcher ---------------------------------------------------------------
# The repo's own CLI is a fallback for when the package is not installed
# globally; it only works once `npm run prepack` has produced .next/standalone.
sed -e "s|__REPO_CLI__|$REPO_ROOT/bin/daily-hub.js|g" "$SRC/launcher.sh" \
  > "$APP/Contents/MacOS/DailyHub"
if [ "$APP_MODE" = "1" ]; then
  sed -i '' 's|^APP_MODE="${DAILYHUB_APP_MODE:-0}"|APP_MODE="${DAILYHUB_APP_MODE:-1}"|' \
    "$APP/Contents/MacOS/DailyHub"
fi
chmod +x "$APP/Contents/MacOS/DailyHub"

# --- icon -------------------------------------------------------------------
# sips cannot read SVG, so Chrome rasterises it first. The SVG is inlined into a
# zero-margin page because Chrome would otherwise render it inset by the body margin.
ICONSET="$(mktemp -d)/DailyHub.iconset"
mkdir -p "$ICONSET"
SHOT_DIR="$(mktemp -d)"

{
  echo '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>'
  cat "$SRC/icon.svg"
} > "$SHOT_DIR/icon.html"

if [ ! -x "$CHROME" ]; then
  echo "Google Chrome is required to rasterise the icon. Install it, or drop a 1024x1024 icon.png into $SRC." >&2
  exit 1
fi

"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 \
  --screenshot="$SHOT_DIR/icon.png" \
  --window-size=1024,1024 \
  "file://$SHOT_DIR/icon.html" >/dev/null 2>&1

[ -f "$SHOT_DIR/icon.png" ] || { echo "Chrome produced no icon.png" >&2; exit 1; }

# Keep the committed raster in step with the SVG. `daily-hub install-app` builds
# the same bundle from this PNG on a user's machine, where there is no Chrome to
# rasterise with, so this is the file that actually ships.
cp "$SHOT_DIR/icon.png" "$SRC/icon-1024.png"

for spec in "16 icon_16x16" "32 icon_16x16@2x" "32 icon_32x32" "64 icon_32x32@2x" \
            "128 icon_128x128" "256 icon_128x128@2x" "256 icon_256x256" \
            "512 icon_256x256@2x" "512 icon_512x512" "1024 icon_512x512@2x"; do
  size="${spec% *}"
  name="${spec#* }"
  sips -z "$size" "$size" "$SHOT_DIR/icon.png" --out "$ICONSET/$name.png" >/dev/null
done

iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/DailyHub.icns"
rm -rf "$SHOT_DIR" "$(dirname "$ICONSET")"

# --- finish -----------------------------------------------------------------
# Ad-hoc signature so Gatekeeper treats it as a stable identity rather than
# re-prompting on every launch. Not a Developer ID: this is not distributable.
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || \
  echo "warning: ad-hoc signing failed; the app will still run" >&2

touch "$APP"

echo
echo "Built $APP"
echo "Install with:  cp -R \"$APP\" /Applications/"
[ "$APP_MODE" = "1" ] && echo "Mode: chromeless Chrome window"

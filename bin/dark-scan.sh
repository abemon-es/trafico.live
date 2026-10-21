#!/usr/bin/env bash
# dark-scan.sh — Find light boxes left in dark mode, page by page
#
# The visual evidence the BACKLOG's bulk-refactor rule asks for: run it before
# and after a dark-mode change, on the pages it touches. bin/dark-scan.mjs
# opens each path in headless Chromium with dark mode on and lists every
# element of at least 16×16 px with a light background on a dark parent.
#
# Runs ON compute (no multi-request sweeps from the Mac). From the Mac:
#   scp bin/dark-scan.sh bin/dark-scan.mjs compute:/tmp/dark-scan/
#   ssh compute 'bash /tmp/dark-scan/dark-scan.sh /espana /estadisticas'
#
# Usage:
#   bash bin/dark-scan.sh PATH [PATH...]
#
# Environment:
#   DARK_SCAN_PARALLEL   browsers in parallel (default 4)
#   PLAYWRIGHT_IMAGE     default mcr.microsoft.com/playwright:v1.48.0-jammy
#
# Exit codes:
#   0  No light islands on any page
#   1  Light islands found
#   2  A page could not be scanned (never turned dark, or failed to load)

set -uo pipefail

if [[ $# -eq 0 || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,24p' "$0" | sed 's/^# \?//'
  exit 0
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.48.0-jammy}"
PARALLEL="${DARK_SCAN_PARALLEL:-4}"
# Traefik answers on the host; the browser reaches it through the bridge gateway.
HOST_IP="$(docker network inspect bridge -f '{{(index .IPAM.Config 0).Gateway}}')"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

# Round-robin the paths over the browsers (one file of paths per browser;
# not GROUPS, which bash reserves).
i=0
for path in "$@"; do
  printf '%s\n' "$path" >> "$OUT/paths.$((i % PARALLEL))"
  i=$((i + 1))
done

BUCKETS=()
for f in "$OUT"/paths.*; do
  g="${f##*.}"
  BUCKETS+=("$g")
  mapfile -t paths < "$f"
  docker run --rm -e HOST_IP="$HOST_IP" -e CHROMIUM_PATH=/ms-playwright/chromium-1140/chrome-linux/chrome \
    -v "$DIR/dark-scan.mjs:/scan/dark-scan.mjs:ro" "$IMAGE" \
    sh -c 'cd /tmp && npm i --silent --no-audit --no-fund playwright-core@1.48.0 >/dev/null 2>&1 \
      && cp /scan/dark-scan.mjs /tmp/ && timeout 900 node /tmp/dark-scan.mjs "$@"' sh "${paths[@]}" \
    > "$OUT/$g.log" 2>&1 &
  echo $! > "$OUT/$g.pid"
done

status=0
for g in "${BUCKETS[@]}"; do
  wait "$(cat "$OUT/$g.pid")"
  rc=$?
  cat "$OUT/$g.log"
  [[ $rc -gt $status ]] && status=$rc
done
exit "$status"

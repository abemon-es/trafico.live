#!/usr/bin/env bash
# check-internal-redirects.sh — find internal links and sitemap URLs that redirect.
#
# Every internal link that answers 3xx costs a crawler a request and tells it
# our own pages disagree about the canonical URL. In Sep–Oct 2026 the edge log
# held 3,000+ 308s for /gasolineras/maritimas alone, and Googlebot — which
# visited 285× less than Bingbot — spent ~3 % of its few requests on 308s.
#
# What it does:
#   1. Fetches the HTML of the seed pages (bin/mobile-routes.json + hubs).
#   2. Extracts same-origin hrefs, de-duplicates them.
#   3. Requests each once WITHOUT following redirects.
#   4. Samples sitemap URLs (first N per shard) the same way.
#   5. Prints every 3xx as: status  link  →  location  (linked from: page)
#
# Usage:
#   bin/check-internal-redirects.sh                 # prod, default seeds
#   bin/check-internal-redirects.sh --sitemap-sample 40
#   BASE=https://staging.trafico.live bin/check-internal-redirects.sh
#
# Exit code: 0 if no internal redirect found, 1 otherwise (usable as a gate).
# Requires: curl, jq. macOS + Linux.

set -u
set -o pipefail

BASE="${BASE:-https://trafico.live}"
SAMPLE=25
while (( $# > 0 )); do
  case "$1" in
    --sitemap-sample) SAMPLE="${2:-25}"; shift ;;
    --help|-h) sed -n '2,22p' "$0" | sed 's/^# \?//'; exit 0 ;;
  esac
  shift
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
UA="cto-loop-linkcheck/1.0 (+https://trafico.live)"

# ── Seeds ────────────────────────────────────────────────────────────────────
{
  jq -r '.routes[].path' "$REPO_ROOT/bin/mobile-routes.json" 2>/dev/null
  printf '%s\n' /espana /incidencias /carreteras /radares /camaras /carga-ev \
    /gasolineras/mapa /trenes/estaciones /trenes/lineas /noticias
} | sort -u > "$TMP/seeds"

# ── Collect links from seed pages ────────────────────────────────────────────
: > "$TMP/links"   # "<link>\t<source page>"
while IFS= read -r page; do
  html="$(curl -s --max-time 30 -A "$UA" "$BASE$page")" || continue
  # same-origin hrefs: relative "/..." or absolute on our host; drop anchors/query
  grep -o -E 'href="(/[^"#?]*|https://trafico\.live/[^"#?]*)' <<<"$html" \
    | sed -E 's#^href="##; s#^https://trafico\.live##' \
    | grep -v -E '^/(_next|api|monitoring)/|\.(png|jpg|jpeg|svg|webp|ico|xml|txt|json|css|js|pdf)$' \
    | sort -u | sed "s#\$#	$page#" >> "$TMP/links"
done < "$TMP/seeds"

# ── Sitemap sample ───────────────────────────────────────────────────────────
curl -s --max-time 30 -A "$UA" "$BASE/sitemap.xml" \
  | grep -o -E '<loc>[^<]+' | sed 's#<loc>##' > "$TMP/shards"
while IFS= read -r shard; do
  curl -s --max-time 60 -A "$UA" "$shard" \
    | grep -o -E '<loc>[^<]+' | sed -E 's#<loc>https://trafico\.live##' \
    | head -n "$SAMPLE" | sed "s#\$#	sitemap:${shard##*/}#" >> "$TMP/links"
done < "$TMP/shards"

# ── Check each unique target once, no redirect following ─────────────────────
cut -f1 "$TMP/links" | sed 's#^$#/#' | sort -u > "$TMP/targets"
total=$(wc -l < "$TMP/targets" | tr -d ' ')
: > "$TMP/redirects"
while IFS= read -r path; do
  out="$(curl -s -o /dev/null --max-time 20 -A "$UA" \
          -w '%{http_code} %{redirect_url}' "$BASE$path")"
  code="${out%% *}"
  if [[ "$code" =~ ^3 ]]; then
    loc="${out#* }"; loc="${loc#$BASE}"
    from="$(awk -F'\t' -v p="$path" '$1==p {print $2}' "$TMP/links" | sort -u | head -3 | paste -sd, -)"
    printf '%s  %s  →  %s  (from: %s)\n' "$code" "$path" "$loc" "$from" >> "$TMP/redirects"
  fi
done < "$TMP/targets"

n=$(wc -l < "$TMP/redirects" | tr -d ' ')
echo "checked $total internal URLs from $(wc -l < "$TMP/seeds" | tr -d ' ') seed pages + sitemap sample ($SAMPLE/shard): $n redirect"
sort "$TMP/redirects"
(( n == 0 ))

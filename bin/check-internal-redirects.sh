#!/usr/bin/env bash
# check-internal-redirects.sh — find internal links and sitemap URLs that redirect or break.
#
# Every internal link that answers 3xx costs a crawler a request and tells it
# our own pages disagree about the canonical URL. In Sep–Oct 2026 the edge log
# held 3,000+ 308s for /gasolineras/maritimas alone, and Googlebot — which
# visited 285× less than Bingbot — spent ~3 % of its few requests on 308s.
#
# Runs ON COMPUTE, not from the Mac. The first version fired ~900 requests from
# the Mac and CrowdSec banned the office IP (http-crawl-non_statics, 2026-10-19
# 00:49), cutting SSH to compute for every session — and, worse, it counted the
# resulting 429s as "no redirect" and reported a clean 0. Now:
#   - the script ships itself to compute and requests trafico.live through the
#     local Traefik (curl --resolve …:127.0.0.1), with a pause between requests;
#   - anything that is neither 2xx nor 3xx is reported, never silently passed:
#     404 = broken link, 429/5xx/timeout = UNVERIFIED.
#
# Usage:
#   bin/check-internal-redirects.sh                    # seeds + 25 URLs per shard
#   bin/check-internal-redirects.sh --sitemap-sample 40
#
# Exit: 0 clean · 1 redirects or broken links found · 2 some URLs unverified
#       (the run proves nothing about those — do not read it as green).
# Requires locally: ssh access to compute, jq. On compute: curl, grep, sed, awk.

set -u
set -o pipefail

BASE_HOST="${BASE_HOST:-trafico.live}"
REMOTE="${CTO_REMOTE_HOST:-compute}"
SAMPLE="${SAMPLE:-25}"
DELAY="${DELAY:-0.2}"
ON_REMOTE=0
while (( $# > 0 )); do
  case "$1" in
    --sitemap-sample) SAMPLE="${2:-25}"; shift ;;
    --on-remote) ON_REMOTE=1 ;;
    --help|-h) sed -n '2,27p' "$0" | sed 's/^# \?//'; exit 0 ;;
  esac
  shift
done

# ── Local half: build the seed list from the repo, then hand over to compute ─
if (( ON_REMOTE == 0 )); then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  SEEDS_B64="$(
    {
      jq -r '.routes[].path' "$REPO_ROOT/bin/mobile-routes.json" 2>/dev/null
      printf '%s\n' /espana /incidencias /carreteras /radares /camaras /carga-ev \
        /gasolineras/mapa /trenes/estaciones /trenes/lineas /noticias
    } | sort -u | base64 | tr -d '\n'
  )"
  exec ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE" \
    "SEEDS_B64='$SEEDS_B64' SAMPLE='$SAMPLE' DELAY='$DELAY' BASE_HOST='$BASE_HOST' bash -s -- --on-remote" \
    < "${BASH_SOURCE[0]}"
fi

# ── Remote half (compute) ────────────────────────────────────────────────────
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
UA="cto-loop-linkcheck/2.0 (+https://trafico.live; on-host)"
CURL=(curl -s --max-time 30 --resolve "$BASE_HOST:443:127.0.0.1" -A "$UA")
fetch() { sleep "$DELAY"; "${CURL[@]}" "https://$BASE_HOST$1"; }

printf '%s' "$SEEDS_B64" | base64 -d > "$TMP/seeds"

# Collect same-origin links from the seed pages: "<link>\t<source page>"
: > "$TMP/links"
while IFS= read -r page; do
  html="$(fetch "$page")" || continue
  grep -o -E 'href="(/[^"#?]*|https://trafico\.live/[^"#?]*)' <<<"$html" \
    | sed -E 's#^href="##; s#^https://trafico\.live##' \
    | grep -v -E '^/(_next|api|monitoring)/|\.(png|jpg|jpeg|svg|webp|ico|xml|txt|json|css|js|pdf)$' \
    | sort -u | sed "s#\$#	$page#" >> "$TMP/links"
done < "$TMP/seeds"

# Sitemap sample: the first $SAMPLE URLs of every shard
fetch /sitemap.xml | grep -o -E '<loc>[^<]+' | sed 's#<loc>##' > "$TMP/shards"
while IFS= read -r shard; do
  fetch "${shard#https://$BASE_HOST}" \
    | grep -o -E '<loc>[^<]+' | sed -E 's#<loc>https://trafico\.live##' \
    | head -n "$SAMPLE" | sed "s#\$#	sitemap:${shard##*/}#" >> "$TMP/links"
done < "$TMP/shards"

# Check each unique target once, without following redirects
cut -f1 "$TMP/links" | sed 's#^$#/#' | sort -u > "$TMP/targets"
: > "$TMP/redirects"; : > "$TMP/broken"; : > "$TMP/unverified"
from_of() { awk -F'\t' -v p="$1" '$1==p {print $2}' "$TMP/links" | sort -u | head -3 | paste -sd, -; }
while IFS= read -r path; do
  sleep "$DELAY"
  out="$("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "https://$BASE_HOST$path")"
  code="${out%% *}"; loc="${out#* }"; loc="${loc#https://$BASE_HOST}"
  case "$code" in
    2??) ;;
    3??) printf '%s  %s  →  %s  (from: %s)\n' "$code" "$path" "$loc" "$(from_of "$path")" >> "$TMP/redirects" ;;
    404|410) printf '%s  %s  (from: %s)\n' "$code" "$path" "$(from_of "$path")" >> "$TMP/broken" ;;
    *) printf '%s  %s\n' "$code" "$path" >> "$TMP/unverified" ;;
  esac
done < "$TMP/targets"

total=$(wc -l < "$TMP/targets" | tr -d ' ')
nr=$(wc -l < "$TMP/redirects" | tr -d ' '); nb=$(wc -l < "$TMP/broken" | tr -d ' ')
nu=$(wc -l < "$TMP/unverified" | tr -d ' ')
echo "checked $total internal URLs ($(wc -l < "$TMP/seeds" | tr -d ' ') seed pages + $SAMPLE/shard sitemap sample, on-host): $nr redirect · $nb broken · $nu UNVERIFIED"
sort "$TMP/redirects"
sort "$TMP/broken"
(( nu > 0 )) && { echo "-- unverified (429/5xx/timeout: these prove nothing) --"; sort "$TMP/unverified" | head -20; }
(( nu > 0 )) && exit 2
(( nr + nb > 0 )) && exit 1
exit 0

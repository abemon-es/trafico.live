#!/usr/bin/env bash
# post-gtfs-hook.sh — Regenerate GTFS-related PMTiles after a collector run
#
# Runs on the TILE HOST. Called by a webhook listener (e.g. a tiny HTTP server
# such as webhook, adnanh/webhook, or a simple nc/socat loop) that receives
# the POST from post-hook.ts in the collector container.
#
# Usage:
#   ./post-gtfs-hook.sh --layers=transit-stops,transit-routes,portugal-gas
#   ./post-gtfs-hook.sh --layers=ferry-stops,ferry-routes
#   ./post-gtfs-hook.sh --layers=railway-stations,railway-routes
#   ./post-gtfs-hook.sh --all
#
# Required env:
#   DATABASE_URL   — PostgreSQL connection string (read from .env or passed in)
#   OUTPUT_DIR     — Where PMTiles files are written (default: /data/tiles)
#
# Optional env:
#   WORK_DIR       — Scratch space for GeoJSON intermediates (default: /tmp/tiles-work)
#   GENERATE_SCRIPT — Path to generate-pmtiles.sh (default: same dir as this script)
#   LOG_FILE       — Append output to this file in addition to stdout
#
# ## Integration
#
# The tile host needs a webhook receiver that:
#   1. Validates the Authorization: Bearer <PMTILES_REGEN_TOKEN> header
#   2. Parses the JSON body for the "layers" array
#   3. Calls this script:  post-gtfs-hook.sh --layers=<comma-joined layers>
#
# Option A (recommended) — adnanh/webhook (single binary):
#   Install: https://github.com/adnanh/webhook
#   Config snippet (hooks.json):
#     {
#       "id": "pmtiles-regen",
#       "execute-command": "/opt/trafico/tiles/post-gtfs-hook.sh",
#       "pass-arguments-to-command": [
#         { "source": "payload", "name": "layers" }   <- join on collector side
#       ],
#       "trigger-rule": {
#         "match": { "type": "value", "value": "<PMTILES_REGEN_TOKEN>",
#                    "parameter": { "source": "header", "name": "Authorization" } }
#       }
#     }
#   Note: collector sends layers as a JSON array; the adnanh webhook hook must
#   join them into "--layers=a,b,c" before passing to this script, or you can
#   call the script with individual --layer=X args instead (see generate-pmtiles.sh).
#
# Option B — simple curl-triggered cron (no persistent daemon needed):
#   On the tile host, run an SSH-exposed script endpoint. The collector would
#   use SSH rather than HTTP — adjust post-hook.ts accordingly.
#
# In both cases, set on the tile host:
#   PMTILES_REGEN_TOKEN=<same secret set in collector env>
#   DATABASE_URL=<connection string to primary postgres>
#   OUTPUT_DIR=/opt/trafico/tiles/tiles   (or wherever nginx serves from)

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATE_SCRIPT="${GENERATE_SCRIPT:-${SCRIPT_DIR}/generate-pmtiles.sh}"
LOG_FILE="${LOG_FILE:-}"

_log() {
  local msg="[post-gtfs-hook] $(date -u '+%Y-%m-%dT%H:%M:%SZ') $*"
  echo "$msg"
  if [[ -n "$LOG_FILE" ]]; then
    echo "$msg" >> "$LOG_FILE"
  fi
}

_die() {
  _log "ERROR: $*"
  exit 1
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

LAYERS_CSV=""
USE_ALL=false

for arg in "$@"; do
  case "$arg" in
    --layers=*) LAYERS_CSV="${arg#--layers=}" ;;
    --all)      USE_ALL=true ;;
    --help|-h)
      echo "Usage: $0 --layers=a,b,c | --all"
      echo ""
      echo "Env:"
      echo "  DATABASE_URL   (required)"
      echo "  OUTPUT_DIR     (default: /data/tiles)"
      echo "  WORK_DIR       (default: /tmp/tiles-work)"
      echo "  GENERATE_SCRIPT (default: <script-dir>/generate-pmtiles.sh)"
      echo "  LOG_FILE       (optional: append log lines here too)"
      exit 0
      ;;
    *) _die "Unknown argument: $arg" ;;
  esac
done

if [[ "$USE_ALL" == false && -z "$LAYERS_CSV" ]]; then
  _die "Specify --layers=a,b,c or --all"
fi

# ---------------------------------------------------------------------------
# Validate environment
# ---------------------------------------------------------------------------

if [[ -z "${DATABASE_URL:-}" ]]; then
  _die "DATABASE_URL is not set"
fi

OUTPUT_DIR="${OUTPUT_DIR:-/data/tiles}"
if [[ ! -d "$OUTPUT_DIR" ]]; then
  _die "OUTPUT_DIR does not exist: $OUTPUT_DIR"
fi

if [[ ! -x "$GENERATE_SCRIPT" ]]; then
  _die "generate-pmtiles.sh not found or not executable: $GENERATE_SCRIPT"
fi

# ---------------------------------------------------------------------------
# Build argument list for generate-pmtiles.sh
# ---------------------------------------------------------------------------

GEN_ARGS=()

if [[ "$USE_ALL" == true ]]; then
  GEN_ARGS+=("--all")
else
  # Split comma-separated layers into individual --layer= flags
  IFS=',' read -ra LAYER_ARRAY <<< "$LAYERS_CSV"
  for layer in "${LAYER_ARRAY[@]}"; do
    layer="${layer// /}"   # strip any stray spaces
    if [[ -n "$layer" ]]; then
      GEN_ARGS+=("--layer=${layer}")
    fi
  done
fi

if [[ ${#GEN_ARGS[@]} -eq 0 ]]; then
  _die "No layers resolved from input: '$LAYERS_CSV'"
fi

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

_log "Starting PMTiles regen"
_log "Layers arg: ${GEN_ARGS[*]}"
_log "Output dir: $OUTPUT_DIR"
_log "Script:     $GENERATE_SCRIPT"

OVERALL_START=$(date +%s)

# Pass OUTPUT_DIR and WORK_DIR as env overrides so generate-pmtiles.sh picks
# them up; the script also accepts --output= and --work-dir= flags but env is
# simpler for this wrapper.
export OUTPUT_DIR
export WORK_DIR="${WORK_DIR:-/tmp/tiles-work}"
export DATABASE_URL

_log "Invoking generate-pmtiles.sh ..."
LAYER_START=$(date +%s)

"$GENERATE_SCRIPT" "${GEN_ARGS[@]}"

LAYER_END=$(date +%s)
_log "generate-pmtiles.sh finished in $((LAYER_END - LAYER_START))s"

# ---------------------------------------------------------------------------
# Optional: signal nginx to pick up new files (if running in same container)
# ---------------------------------------------------------------------------
# Nginx serves static files directly — no reload needed, the file swap done by
# generate-pmtiles.sh (cp to OUTPUT_DIR) is atomic enough for a tile server.
# If you are running a Martin dynamic layer, restart is not needed either.

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

OVERALL_END=$(date +%s)
_log "=============================================="
_log " PMTiles regen complete"
_log " Elapsed: $((OVERALL_END - OVERALL_START))s"
_log " Files in ${OUTPUT_DIR}:"

# List only the layers we (re)generated
if [[ "$USE_ALL" == true ]]; then
  ls -lh "${OUTPUT_DIR}"/*.pmtiles 2>/dev/null | while read -r line; do
    _log "  $line"
  done
else
  for layer in "${LAYER_ARRAY[@]}"; do
    layer="${layer// /}"
    f="${OUTPUT_DIR}/${layer}.pmtiles"
    if [[ -f "$f" ]]; then
      size=$(du -h "$f" | cut -f1)
      _log "  ${layer}.pmtiles  (${size})"
    else
      _log "  WARNING: ${layer}.pmtiles not found after generation"
    fi
  done
fi

_log "=============================================="

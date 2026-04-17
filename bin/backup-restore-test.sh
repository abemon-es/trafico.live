#!/usr/bin/env bash
# backup-restore-test.sh — Weekly restore test for trafico.live DR validation
# Runs on: hetzner-dev (staging server)
# Purpose: Pull latest dump from R2, restore to scratch DB, run canary queries, drop scratch.
# Cron:    0 3 * * 1 /opt/trafico/bin/backup-restore-test.sh >> /var/log/trafico-restore-test.log 2>&1
#
# Prerequisites:
#   - rclone configured with "r2" remote pointing to "trafico-backups" bucket
#   - PostgreSQL client (pg_restore, psql) accessible
#   - DB superuser or role with CREATE DATABASE privilege
#   - R2 bucket contains dumps under daily/ prefix (written by backup-verify.sh)

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"          # superuser for CREATE/DROP DATABASE
DB_RESTORE_USER="${DB_RESTORE_USER:-trafico_admin}"
SCRATCH_DB="${SCRATCH_DB:-le_trafico_restoretest}"
DOWNLOAD_DIR="${DOWNLOAD_DIR:-/tmp/trafico-restore-test}"
R2_REMOTE="${R2_REMOTE:-r2}"
R2_BUCKET="${R2_BUCKET:-trafico-backups}"
R2_PREFIX="${R2_PREFIX:-daily}"

# Canary tables — name as they appear in Postgres (snake_case via Prisma)
CANARY_TABLES=(
  "traffic_incidents"
  "vessel_positions"
  "collector_heartbeats"
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "ERROR: $*"; exit 1; }

START_EPOCH=$(date +%s)

log "=== backup-restore-test.sh starting ==="

# ---------------------------------------------------------------------------
# 1. Find the latest dump on R2
# ---------------------------------------------------------------------------
log "Listing R2 ${R2_REMOTE}:${R2_BUCKET}/${R2_PREFIX}/ ..."

command -v rclone >/dev/null 2>&1 || fail "rclone not installed"
rclone listremotes 2>/dev/null | grep -q "^${R2_REMOTE}:" \
  || fail "rclone remote '${R2_REMOTE}' not configured — run: rclone config"

LATEST_DUMP=$(rclone ls "${R2_REMOTE}:${R2_BUCKET}/${R2_PREFIX}/" \
  --include "*.dump" \
  2>/dev/null \
  | sort -k2 \
  | tail -1 \
  | awk '{print $2}')

[ -n "$LATEST_DUMP" ] || fail "No .dump files found in ${R2_REMOTE}:${R2_BUCKET}/${R2_PREFIX}/"
log "Latest dump: $LATEST_DUMP"

# Extract dump age for RTO reporting
DUMP_DATESTAMP=$(basename "$LATEST_DUMP" .dump | cut -c1-8)
log "Dump datestamp: $DUMP_DATESTAMP (today=$(date -u +%Y%m%d))"

# ---------------------------------------------------------------------------
# 2. Download dump
# ---------------------------------------------------------------------------
mkdir -p "$DOWNLOAD_DIR"
LOCAL_DUMP="$DOWNLOAD_DIR/$(basename "$LATEST_DUMP")"

if [ -f "$LOCAL_DUMP" ]; then
  log "Dump already downloaded: $LOCAL_DUMP — using cached copy"
else
  log "Downloading from R2 ..."
  rclone copy "${R2_REMOTE}:${R2_BUCKET}/${R2_PREFIX}/$(basename "$LATEST_DUMP")" \
    "$DOWNLOAD_DIR/" \
    --progress \
    --stats-one-line
  log "Download complete: $(du -sh "$LOCAL_DUMP" | cut -f1)"
fi

# ---------------------------------------------------------------------------
# 3. Verify dump readability before attempting restore
# ---------------------------------------------------------------------------
log "Pre-restore readability check (pg_restore --list | head) ..."
RESTORE_HEADER=$(pg_restore --list "$LOCAL_DUMP" 2>&1 | head -5)
[ -n "$RESTORE_HEADER" ] || fail "pg_restore --list returned empty — dump is corrupt, aborting"
log "Dump header OK"

# ---------------------------------------------------------------------------
# 4. Drop + create scratch database
# ---------------------------------------------------------------------------
log "Dropping scratch database if it exists: $SCRATCH_DB ..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  -c "DROP DATABASE IF EXISTS ${SCRATCH_DB};" postgres

log "Creating scratch database: $SCRATCH_DB ..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  -c "CREATE DATABASE ${SCRATCH_DB};" postgres

# Enable PostGIS if available
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$SCRATCH_DB" \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null \
  && log "PostGIS extension enabled" \
  || log "WARN: PostGIS not available on staging — some restore warnings expected"

# ---------------------------------------------------------------------------
# 5. Restore dump into scratch DB
# ---------------------------------------------------------------------------
log "Restoring $LOCAL_DUMP into $SCRATCH_DB ..."
RESTORE_START=$(date +%s)

pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$SCRATCH_DB" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$LOCAL_DUMP" \
  2>&1 | grep -v "^pg_restore: warning" | while IFS= read -r line; do log "  pg_restore: $line"; done || true

RESTORE_END=$(date +%s)
RESTORE_DURATION=$(( RESTORE_END - RESTORE_START ))
log "Restore phase duration: ${RESTORE_DURATION}s"

# ---------------------------------------------------------------------------
# 6. Canary queries — row count + latest timestamp
# ---------------------------------------------------------------------------
log "Running canary queries ..."

CANARY_PASS=0
CANARY_FAIL=0

# Map Prisma model names to Postgres table names (snake_case)
declare -A TABLE_MAP
TABLE_MAP["traffic_incidents"]="traffic_incidents"
TABLE_MAP["vessel_positions"]="vessel_positions"
TABLE_MAP["collector_heartbeats"]="collector_heartbeats"

# Timestamp columns per table
declare -A TIMESTAMP_COL
TIMESTAMP_COL["traffic_incidents"]="\"updatedAt\""
TIMESTAMP_COL["vessel_positions"]="timestamp"
TIMESTAMP_COL["collector_heartbeats"]="\"lastRunAt\""

for TABLE in "${CANARY_TABLES[@]}"; do
  PG_TABLE="${TABLE_MAP[$TABLE]:-$TABLE}"
  TS_COL="${TIMESTAMP_COL[$TABLE]:-created_at}"

  ROW_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$SCRATCH_DB" \
    -t -c "SELECT COUNT(*) FROM \"${PG_TABLE}\";" 2>/dev/null | tr -d ' ' || echo "ERROR")

  LATEST_TS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$SCRATCH_DB" \
    -t -c "SELECT MAX(${TS_COL}) FROM \"${PG_TABLE}\";" 2>/dev/null | tr -d ' ' || echo "ERROR")

  if [[ "$ROW_COUNT" =~ ^[0-9]+$ ]] && [ "$ROW_COUNT" -gt 0 ]; then
    log "CANARY OK  | $PG_TABLE | rows=$ROW_COUNT | latest_ts=$LATEST_TS"
    (( CANARY_PASS++ )) || true
  elif [[ "$ROW_COUNT" = "0" ]]; then
    log "CANARY WARN| $PG_TABLE | rows=0 (table empty or not restored)"
    (( CANARY_FAIL++ )) || true
  else
    log "CANARY FAIL| $PG_TABLE | error querying table: $ROW_COUNT"
    (( CANARY_FAIL++ )) || true
  fi
done

# ---------------------------------------------------------------------------
# 7. Drop scratch database
# ---------------------------------------------------------------------------
log "Dropping scratch database: $SCRATCH_DB ..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  -c "DROP DATABASE IF EXISTS ${SCRATCH_DB};" postgres
log "Scratch database dropped"

# ---------------------------------------------------------------------------
# 8. Cleanup downloaded dump
# ---------------------------------------------------------------------------
rm -f "$LOCAL_DUMP"
log "Local dump file removed"

# ---------------------------------------------------------------------------
# 9. Duration report
# ---------------------------------------------------------------------------
END_EPOCH=$(date +%s)
TOTAL_DURATION=$(( END_EPOCH - START_EPOCH ))
log "Total restore-test duration: ${TOTAL_DURATION}s (RTO target: 14400s / 4h)"

if [ "${TOTAL_DURATION}" -gt 14400 ]; then
  log "WARN: Restore duration exceeded RTO target of 4h — investigate"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log "Canary results: ${CANARY_PASS} passed, ${CANARY_FAIL} failed"

if [ "$CANARY_FAIL" -gt 0 ]; then
  log "=== restore-test FAILED — $CANARY_FAIL canary table(s) failed ==="
  exit 1
else
  log "=== restore-test PASSED — restore verified, all canary tables OK ==="
  exit 0
fi

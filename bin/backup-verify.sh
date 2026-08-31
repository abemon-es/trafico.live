#!/usr/bin/env bash
# backup-verify.sh — Nightly Postgres backup + verification for trafico.live
# Runs on: primary (10.100.0.3) as postgres user or root/admin
# Cron:    0 1 * * * /opt/trafico/bin/backup-verify.sh >> /var/log/trafico-backup.log 2>&1
#
# Dependencies: pg_dump, pg_restore, rclone (optional), curl (optional)
#
# Off-site upload defaults to the self-hosted MinIO on Hetzner compute.
# Configure an rclone remote named "minio" before the first run:
#   rclone config → new remote → type=s3 → provider=Minio
#                 → endpoint=https://s3.abemon.es
#                 → access_key/secret from /opt/apps/compute-minio/.env
# (The remote name and bucket can be overridden via env vars below.)

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — override via environment variables if needed
# ---------------------------------------------------------------------------
DB_NAME="${DB_NAME:-le_trafico}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-trafico_admin}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/trafico}"
PROM_FILE="${PROM_FILE:-/var/lib/node_exporter/textfile_collector/trafico_backup.prom}"
# Remote upload target. BACKUP_* preferred; R2_* kept for backwards compat.
REMOTE_NAME="${BACKUP_REMOTE:-${R2_REMOTE:-minio}}"
REMOTE_BUCKET="${BACKUP_BUCKET:-${R2_BUCKET:-trafico-backups}}"
REMOTE_PREFIX="${BACKUP_PREFIX:-${R2_PREFIX:-daily}}"
BACKUP_PULSE_URL="${BACKUP_PULSE_URL:-https://trafico.live/api/health/backup-pulse}"
KEEP_DAILY=7
KEEP_WEEKLY=4   # Sundays
KEEP_MONTHLY=3  # 1st of month

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "ERROR: $*"; exit 1; }

# ---------------------------------------------------------------------------
# Prepare backup directory
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M)"
DUMP_FILE="$BACKUP_DIR/${TIMESTAMP}.dump"

log "=== trafico.live backup-verify.sh starting ==="
log "Target: $DB_NAME@$DB_HOST:$DB_PORT → $DUMP_FILE"

# ---------------------------------------------------------------------------
# 1. Run pg_dump
# ---------------------------------------------------------------------------
log "Running pg_dump (-Fc -Z6 -j4) ..."
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -Fc \
  -Z 6 \
  -j 4 \
  -f "$DUMP_FILE" \
  "$DB_NAME" \
  || fail "pg_dump exited non-zero"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
log "Dump complete: $DUMP_FILE ($DUMP_SIZE)"

# ---------------------------------------------------------------------------
# 2. Verify dump readability via pg_restore --list
# ---------------------------------------------------------------------------
log "Verifying dump readability (pg_restore --list | head) ..."
RESTORE_CHECK=$(pg_restore --list "$DUMP_FILE" 2>&1 | head -20)
if [ -z "$RESTORE_CHECK" ]; then
  log "FAIL: pg_restore --list returned empty output — dump may be corrupt"
  BACKUP_STATUS=0
else
  log "OK: pg_restore --list successful. First entries:"
  echo "$RESTORE_CHECK" | while IFS= read -r line; do log "  $line"; done
  BACKUP_STATUS=1
fi

# ---------------------------------------------------------------------------
# 3. Retention: 7 daily, 4 weekly (Sundays), 3 monthly (1st of month)
# ---------------------------------------------------------------------------
log "Applying retention policy ..."

DAY_OF_WEEK=$(date -u +%u)    # 1=Mon … 7=Sun
DAY_OF_MONTH=$(date -u +%-d)  # 1-31

# Tag dump for long-term retention if Sunday or 1st of month
if [ "$DAY_OF_WEEK" = "7" ]; then
  WEEKLY_FILE="$BACKUP_DIR/weekly-${TIMESTAMP}.dump"
  cp "$DUMP_FILE" "$WEEKLY_FILE"
  log "Weekly copy created: $WEEKLY_FILE"
fi
if [ "$DAY_OF_MONTH" = "1" ]; then
  MONTHLY_FILE="$BACKUP_DIR/monthly-${TIMESTAMP}.dump"
  cp "$DUMP_FILE" "$MONTHLY_FILE"
  log "Monthly copy created: $MONTHLY_FILE"
fi

# Prune daily dumps (files matching YYYYMMDDTHHMI.dump, not weekly/monthly)
DAILY_LIST=$(ls -1t "$BACKUP_DIR"/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9].dump 2>/dev/null || true)
if [ -n "$DAILY_LIST" ]; then
  echo "$DAILY_LIST" | tail -n +$((KEEP_DAILY + 1)) | while IFS= read -r old; do
    log "Pruning old daily: $old"
    rm -f "$old"
  done
fi

# Prune weekly dumps
WEEKLY_LIST=$(ls -1t "$BACKUP_DIR"/weekly-*.dump 2>/dev/null || true)
if [ -n "$WEEKLY_LIST" ]; then
  echo "$WEEKLY_LIST" | tail -n +$((KEEP_WEEKLY + 1)) | while IFS= read -r old; do
    log "Pruning old weekly: $old"
    rm -f "$old"
  done
fi

# Prune monthly dumps
MONTHLY_LIST=$(ls -1t "$BACKUP_DIR"/monthly-*.dump 2>/dev/null || true)
if [ -n "$MONTHLY_LIST" ]; then
  echo "$MONTHLY_LIST" | tail -n +$((KEEP_MONTHLY + 1)) | while IFS= read -r old; do
    log "Pruning old monthly: $old"
    rm -f "$old"
  done
fi

# ---------------------------------------------------------------------------
# 4. Upload to off-site object storage via rclone (optional — warn if unconfigured)
# ---------------------------------------------------------------------------
REMOTE_OK=0
if command -v rclone >/dev/null 2>&1; then
  if rclone listremotes 2>/dev/null | grep -q "^${REMOTE_NAME}:"; then
    DUMP_BASENAME="$(basename "$DUMP_FILE")"
    log "Uploading $DUMP_BASENAME to ${REMOTE_NAME}:${REMOTE_BUCKET}/${REMOTE_PREFIX}/ ..."
    rclone copy "$DUMP_FILE" "${REMOTE_NAME}:${REMOTE_BUCKET}/${REMOTE_PREFIX}/" \
      --progress \
      --stats-one-line \
      && REMOTE_OK=1 \
      && log "Off-site upload OK (${REMOTE_NAME})" \
      || log "WARN: off-site upload failed — backup remains local only"

    # Also copy weekly/monthly if created this run
    if [ "$DAY_OF_WEEK" = "7" ] && [ -f "${BACKUP_DIR}/weekly-${TIMESTAMP}.dump" ]; then
      rclone copy "${BACKUP_DIR}/weekly-${TIMESTAMP}.dump" \
        "${REMOTE_NAME}:${REMOTE_BUCKET}/weekly/" \
        --stats-one-line \
        || log "WARN: weekly off-site upload failed"
    fi
    if [ "$DAY_OF_MONTH" = "1" ] && [ -f "${BACKUP_DIR}/monthly-${TIMESTAMP}.dump" ]; then
      rclone copy "${BACKUP_DIR}/monthly-${TIMESTAMP}.dump" \
        "${REMOTE_NAME}:${REMOTE_BUCKET}/monthly/" \
        --stats-one-line \
        || log "WARN: monthly off-site upload failed"
    fi
  else
    log "WARN: rclone remote '${REMOTE_NAME}' not configured — skipping off-site upload"
  fi
else
  log "WARN: rclone not installed — skipping off-site upload"
fi

# ---------------------------------------------------------------------------
# 5. Write Prometheus textfile metric
# ---------------------------------------------------------------------------
EPOCH_MS="$(date +%s)000"
PROM_DIR="$(dirname "$PROM_FILE")"
if [ -d "$PROM_DIR" ] || mkdir -p "$PROM_DIR" 2>/dev/null; then
  cat > "$PROM_FILE" <<PROM
# HELP trafico_backup_ok Last backup succeeded (1=ok, 0=fail)
# TYPE trafico_backup_ok gauge
trafico_backup_ok{method="pg_dump"} ${BACKUP_STATUS} ${EPOCH_MS}
# HELP trafico_backup_last_success_timestamp_ms Unix epoch ms of last successful backup
# TYPE trafico_backup_last_success_timestamp_ms gauge
trafico_backup_last_success_timestamp_ms{method="pg_dump"} $([ "$BACKUP_STATUS" = "1" ] && echo "$EPOCH_MS" || echo "0")
PROM
  log "Prometheus textfile written: $PROM_FILE"
else
  log "WARN: cannot write Prometheus textfile at $PROM_FILE (node_exporter may not be configured)"
fi

# ---------------------------------------------------------------------------
# 6. Heartbeat POST to backup-pulse endpoint (optional)
# ---------------------------------------------------------------------------
if command -v curl >/dev/null 2>&1; then
  # Probe the endpoint — only POST if it returns 2xx
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    -X POST "$BACKUP_PULSE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"status\":$([ "$BACKUP_STATUS" = "1" ] && echo '"ok"' || echo '"fail"'),\"dump\":\"$(basename "$DUMP_FILE")\",\"offsite_uploaded\":${REMOTE_OK}}" \
    2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" =~ ^2 ]]; then
    log "Heartbeat POST to $BACKUP_PULSE_URL → HTTP $HTTP_CODE OK"
  else
    log "WARN: Heartbeat endpoint returned HTTP $HTTP_CODE or unreachable — skipping (not fatal)"
  fi
else
  log "WARN: curl not available — skipping heartbeat POST"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
if [ "$BACKUP_STATUS" = "1" ]; then
  log "=== backup-verify.sh completed OK ==="
  exit 0
else
  log "=== backup-verify.sh completed with ERRORS — backup may be corrupt ==="
  exit 1
fi

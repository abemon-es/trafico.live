#!/bin/bash
set -eu

# =============================================================================
# PostgreSQL Backup Script for trafico-dashboard
#
# Dumps the PostgreSQL database, compresses it, uploads to R2 and Google Drive,
# and manages retention policy (7 daily + 4 weekly + 3 monthly).
#
# Required env vars:
#   DATABASE_URL          - PostgreSQL connection URL
#   R2_BUCKET             - R2 bucket name
#   R2_ACCESS_KEY_ID      - R2 access key
#   R2_SECRET_ACCESS_KEY  - R2 secret key
#   R2_ENDPOINT           - R2 endpoint URL
#
# Optional env vars:
#   GOOGLE_CREDENTIALS_JSON - Google service account JSON for Drive upload
#   GDRIVE_FOLDER_ID        - Google Drive folder ID for backups
#   BACKUP_PREFIX           - Prefix for backup files (default: "backups/trafico-db")
#   BACKUP_TIMEOUT          - pg_dump timeout in seconds (default: 300)
#   RETENTION_DAILY         - Days to keep daily backups (default: 7)
#   RETENTION_WEEKLY        - Weeks to keep weekly backups (default: 4)
#   RETENTION_MONTHLY       - Months to keep monthly backups (default: 3)
# =============================================================================

echo "[backup] Starting trafico-dashboard database backup..."
echo "[backup] Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Validate required env vars
for var in DATABASE_URL R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT; do
  eval "val=\${$var:-}"
  if [ -z "$val" ]; then
    echo "[backup] ERROR: Missing required env var: $var"
    exit 1
  fi
done

# Configuration
BACKUP_PREFIX="${BACKUP_PREFIX:-backups/trafico-db}"
BACKUP_TIMEOUT="${BACKUP_TIMEOUT:-300}"
RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-4}"
RETENTION_MONTHLY="${RETENTION_MONTHLY:-3}"

# Generate backup filename with timestamp
TIMESTAMP="$(date -u +"%Y%m%d-%H%M%S")"
FILENAME="trafico-db-${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_PREFIX}/${FILENAME}"
TMP_FILE="/tmp/${FILENAME}"

echo "[backup] Target: r2:${R2_BUCKET}/${BACKUP_PATH}"
echo "[backup] Retention: ${RETENTION_DAILY} daily, ${RETENTION_WEEKLY} weekly, ${RETENTION_MONTHLY} monthly"

# Configure rclone for R2 at runtime (no config file needed)
export RCLONE_CONFIG_R2_TYPE="s3"
export RCLONE_CONFIG_R2_PROVIDER="Cloudflare"
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
export RCLONE_CONFIG_R2_ENDPOINT="${R2_ENDPOINT}"
# R2-specific settings
export RCLONE_CONFIG_R2_NO_CHECK_BUCKET="true"
export RCLONE_CONFIG_R2_NO_HEAD_OBJECT="true"

echo "[backup] R2 endpoint: ${R2_ENDPOINT}"

# Dump PostgreSQL database with compression
echo "[backup] Running pg_dump..."
echo "[backup] Database URL: ${DATABASE_URL:0:50}..."

# Create temp file for error output
ERR_FILE="/tmp/pg_dump_errors.log"

if timeout "${BACKUP_TIMEOUT}" pg_dump "${DATABASE_URL}" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    2>"$ERR_FILE" | gzip > "$TMP_FILE"; then
  echo "[backup] Dump completed successfully"
  # Show any warnings
  if [ -s "$ERR_FILE" ]; then
    echo "[backup] Warnings:"
    cat "$ERR_FILE"
  fi
else
  echo "[backup] ERROR: pg_dump failed"
  echo "[backup] Error details:"
  cat "$ERR_FILE" 2>/dev/null || true
  rm -f "$TMP_FILE" "$ERR_FILE"
  exit 1
fi

# Verify dump file exists and has meaningful content (>1KB)
if [ ! -s "$TMP_FILE" ]; then
  echo "[backup] ERROR: Backup file is empty"
  rm -f "$TMP_FILE"
  exit 1
fi

FILESIZE_BYTES=$(stat -c%s "$TMP_FILE" 2>/dev/null || stat -f%z "$TMP_FILE" 2>/dev/null || echo "0")
if [ "$FILESIZE_BYTES" -lt 1024 ]; then
  echo "[backup] ERROR: Backup file too small (${FILESIZE_BYTES} bytes) - likely empty dump"
  rm -f "$TMP_FILE"
  exit 1
fi

FILESIZE="$(du -h "$TMP_FILE" | cut -f1)"
echo "[backup] Backup size: ${FILESIZE}"

# Upload to R2 using rclone
echo "[backup] Uploading to R2..."
if rclone copyto "$TMP_FILE" "r2:${R2_BUCKET}/${BACKUP_PATH}" --s3-no-head -v; then
  echo "[backup] R2 upload completed successfully"
else
  echo "[backup] ERROR: R2 upload failed"
  rm -f "$TMP_FILE"
  exit 1
fi

# Upload to Google Drive if configured
if [ -n "${GOOGLE_CREDENTIALS_JSON:-}" ] && [ -n "${GDRIVE_FOLDER_ID:-}" ]; then
  echo "[backup] Uploading to Google Drive..."
  if /usr/local/bin/upload_drive.py "$TMP_FILE" "$GDRIVE_FOLDER_ID"; then
    echo "[backup] Google Drive upload completed successfully"
  else
    echo "[backup] WARNING: Google Drive upload failed (R2 backup succeeded)"
  fi
else
  echo "[backup] Skipping Google Drive upload (not configured)"
fi

# Cleanup local temp file
rm -f "$TMP_FILE"

# =============================================================================
# Retention: Apply tiered retention policy
# - Keep last N daily backups
# - Keep last N weekly backups (every Sunday)
# - Keep last N monthly backups (1st of month)
# =============================================================================
echo "[backup] Applying retention policy..."

# Get all backup files sorted by date (newest first)
backups=$(rclone lsf "r2:${R2_BUCKET}/${BACKUP_PREFIX}/" --files-only 2>/dev/null | sort -r)

daily_count=0
weekly_count=0
monthly_count=0

echo "$backups" | while IFS= read -r filename; do
  [ -z "$filename" ] && continue

  # Extract date from filename (format: trafico-db-YYYYMMDD-HHMMSS.sql.gz)
  file_date=$(echo "$filename" | grep -oE '[0-9]{8}' | head -1)
  [ -z "$file_date" ] && continue

  year=${file_date:0:4}
  month=${file_date:4:2}
  day=${file_date:6:2}

  # Check if it's a monthly backup (1st of month)
  if [ "$day" = "01" ]; then
    monthly_count=$((monthly_count + 1))
    if [ "$monthly_count" -le "$RETENTION_MONTHLY" ]; then
      echo "[backup] Keeping monthly: $filename"
      continue
    fi
  fi

  # Check if it's a weekly backup (Sunday)
  # Note: date command behavior varies between GNU and BSD
  dow=$(date -d "${year}-${month}-${day}" +%w 2>/dev/null || date -j -f "%Y-%m-%d" "${year}-${month}-${day}" +%w 2>/dev/null || echo "-1")
  if [ "$dow" = "0" ]; then
    weekly_count=$((weekly_count + 1))
    if [ "$weekly_count" -le "$RETENTION_WEEKLY" ]; then
      echo "[backup] Keeping weekly: $filename"
      continue
    fi
  fi

  # Daily backup
  daily_count=$((daily_count + 1))
  if [ "$daily_count" -le "$RETENTION_DAILY" ]; then
    echo "[backup] Keeping daily: $filename"
    continue
  fi

  # Delete old backup
  echo "[backup] Deleting old: $filename"
  rclone deletefile "r2:${R2_BUCKET}/${BACKUP_PREFIX}/${filename}" --quiet || true
done

echo "[backup] SUCCESS: Backup completed"
echo "[backup] Location: r2:${R2_BUCKET}/${BACKUP_PATH}"
exit 0

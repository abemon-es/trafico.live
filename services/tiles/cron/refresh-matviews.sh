#!/usr/bin/env bash
# Refresh trafico tiles materialized views. Silent on success, logs errors with timestamps.
set -u
LOG=/opt/trafico/tiles/matview-refresh.log
ENV_FILE=/opt/trafico/tiles/.env

if [ ! -r "$ENV_FILE" ]; then
    echo "$(date -Iseconds) FATAL env file missing: $ENV_FILE" >> "$LOG"
    exit 1
fi

DBURL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
if [ -z "$DBURL" ]; then
    echo "$(date -Iseconds) FATAL DATABASE_URL not in $ENV_FILE" >> "$LOG"
    exit 1
fi

OUT=$(psql "$DBURL" -v ON_ERROR_STOP=1 -qtAX -c 'SELECT refresh_latest_sensors()' 2>&1)
rc=$?
if [ $rc -ne 0 ]; then
    echo "$(date -Iseconds) FAILED rc=$rc: $OUT" >> "$LOG"
    exit $rc
fi
exit 0

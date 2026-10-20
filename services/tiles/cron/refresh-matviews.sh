#!/usr/bin/env bash
# Refresh trafico tiles materialized views. Silent on success, logs errors with timestamps.
#   refresh-matviews.sh            mv_latest_sensors + mv_sensor_clusters (every 5 min)
#   refresh-matviews.sh vessels    vessel_latest, read by the vessels map layers (every minute)
# Both go through SECURITY DEFINER functions owned by trafico_admin
# (services/martin/migrations/006_vessel_latest_refresh.sql).
set -u
TARGET="${1:-sensors}"
case "$TARGET" in
    sensors) SQL='SELECT refresh_latest_sensors()' ;;
    vessels) SQL='SELECT refresh_vessel_latest()' ;;
    *) echo "usage: $0 [sensors|vessels]" >&2; exit 2 ;;
esac
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

OUT=$(psql "$DBURL" -v ON_ERROR_STOP=1 -qtAX -c "$SQL" 2>&1)
rc=$?
if [ $rc -ne 0 ]; then
    echo "$(date -Iseconds) FAILED $TARGET rc=$rc: $OUT" >> "$LOG"
    exit $rc
fi
exit 0

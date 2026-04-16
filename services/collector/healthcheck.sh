#!/bin/sh
# Collector healthcheck — verifies a cron job ran recently
#
# Uses the container's own uptime (PID 1 start time from /proc/1 mtime)
# instead of /proc/uptime (which reflects HOST uptime, not container).
#
# Each crontab tier has different staleness thresholds:
#   realtime: 10 min (runs every 2-5 min)
#   frequent: 8 hours (runs every 6h)
#   fuel:     10 hours (runs 3x daily)
#   daily:    26 hours (runs daily)
#   weekly:   8 days (runs weekly)
#
# The dispatcher touches /tmp/last-run on every successful execution.

TIER="${CRONTAB_TIER:-realtime}"
MARKER="/tmp/last-run"

case "$TIER" in
  realtime) MAX_AGE=600 ;;     # 10 min
  frequent) MAX_AGE=28800 ;;   # 8 hours
  fuel)     MAX_AGE=36000 ;;   # 10 hours
  daily)    MAX_AGE=93600 ;;   # 26 hours
  weekly)   MAX_AGE=691200 ;;  # 8 days
  *)        MAX_AGE=3600 ;;
esac

NOW=$(date +%s)

# If no marker yet, allow MAX_AGE of container uptime as grace period.
# This handles both fresh starts and recreates (tmpfs /tmp is wiped by
# docker on every container recreation, losing the previous marker).
if [ ! -f "$MARKER" ]; then
  START=$(stat -c %Y /proc/1 2>/dev/null || stat -f %m /proc/1 2>/dev/null || echo "$NOW")
  UPTIME=$(( NOW - START ))
  if [ "$UPTIME" -lt "$MAX_AGE" ]; then
    exit 0  # still within one cron cycle of container start
  fi
  echo "UNHEALTHY: no run within ${MAX_AGE}s of container start (tier ${TIER})"
  exit 1
fi

# Check file age
LAST=$(stat -c %Y "$MARKER" 2>/dev/null || stat -f %m "$MARKER" 2>/dev/null || echo 0)
AGE=$(( NOW - LAST ))

if [ "$AGE" -gt "$MAX_AGE" ]; then
  echo "UNHEALTHY: last run ${AGE}s ago (max ${MAX_AGE}s for tier ${TIER})"
  exit 1
fi

exit 0

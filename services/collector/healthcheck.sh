#!/bin/sh
# Collector healthcheck — verifies a cron job ran recently
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

# If no marker yet, allow a grace period after container start
if [ ! -f "$MARKER" ]; then
  UPTIME_SECONDS=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)
  # Grace period: 10 min for realtime, 1 hour for others
  case "$TIER" in
    realtime) GRACE=600 ;;
    *)        GRACE=3600 ;;
  esac
  if [ "$UPTIME_SECONDS" -lt "$GRACE" ]; then
    exit 0  # still in grace period
  fi
  exit 1  # past grace, no run yet = unhealthy
fi

# Check file age
NOW=$(date +%s)
LAST=$(stat -c %Y "$MARKER" 2>/dev/null || stat -f %m "$MARKER" 2>/dev/null || echo 0)
AGE=$(( NOW - LAST ))

case "$TIER" in
  realtime) MAX_AGE=600 ;;     # 10 min
  frequent) MAX_AGE=28800 ;;   # 8 hours
  fuel)     MAX_AGE=36000 ;;   # 10 hours
  daily)    MAX_AGE=93600 ;;   # 26 hours
  weekly)   MAX_AGE=691200 ;;  # 8 days
  *)        MAX_AGE=3600 ;;
esac

if [ "$AGE" -gt "$MAX_AGE" ]; then
  echo "UNHEALTHY: last run ${AGE}s ago (max ${MAX_AGE}s for tier ${TIER})"
  exit 1
fi

exit 0

#!/usr/bin/env bash
# deploy-collectors.sh — deploy docker-compose.collectors.yml without killing
# a run in flight.
#
# A bare `docker compose build && up -d` recreates every collector whose image
# changed at once, killing whatever cron task each one was running. On
# 2026-10-22 that cost a voyage-detector run and the 06:00 gas-station run;
# prices stayed 17 h old until it was re-run by hand. This script:
#
#   1. builds the services;
#   2. for each collector whose image changed, waits until nothing with a
#      TASK= runs inside it, then recreates that service alone. It looks in
#      /proc/*/cmdline: the image has no ps, and ps would see nothing. The wait
#      is capped at MAX_WAIT (900 s); a service still busy then is skipped
#      (exit 1) unless FORCE=1. Tasks scheduled every minute (`* * * * *` in
#      the container's own crontab) don't count: the next run is under a
#      minute away, and collector-realtime is never idle without them.
#      collector-ais is a single always-on task, so it is recreated without
#      waiting;
#   3. prints, per recreated service, the crontab entries that were due while
#      it was down (bin/cron-window.mjs), so they can be re-run.
#
# Usage, on the host, in the checkout of the collectors stack:
#   bin/deploy-collectors.sh                     # every collector
#   bin/deploy-collectors.sh collector-fuel      # just these
#   DRY_RUN=1 bin/deploy-collectors.sh           # build, then say what it would do
#   MAX_WAIT=600 FORCE=1 bin/deploy-collectors.sh

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.collectors.yml)
MAX_WAIT="${MAX_WAIT:-900}"
FORCE="${FORCE:-0}"
DRY_RUN="${DRY_RUN:-0}"
ALWAYS_ON=" collector-ais "

log() { printf '[deploy-collectors %s] %s\n' "$(date -u +%H:%M:%SZ)" "$*"; }

if [ "$#" -gt 0 ]; then
  services=("$@")
else
  mapfile -t services < <("${COMPOSE[@]}" config --services | grep '^collector-')
fi
project="$("${COMPOSE[@]}" config --format json | jq -r .name)"

# The tasks running inside a container right now, from their command lines,
# leaving out those its crontab runs every minute.
running_tasks() {
  local every_minute
  every_minute="$(docker exec "$1" sh -c 'cat "/app/crontabs/$CRONTAB_TIER" 2>/dev/null' \
    | awk '$1=="*" && $2=="*" && $3=="*" && $4=="*" && $5=="*"' | grep -oE 'TASK=[A-Za-z0-9_-]+' | sort -u || true)"
  docker exec "$1" sh -c 'for f in /proc/[0-9]*/cmdline; do tr "\000" " " < "$f" 2>/dev/null; echo; done' 2>/dev/null \
    | grep -oE 'TASK=[A-Za-z0-9_-]+' | sort -u | grep -vxF -f <(printf '%s\n' "$every_minute" | sed '/^$/d') | tr '\n' ' ' || true
}

declare -A old_image
for svc in "${services[@]}"; do
  old_image[$svc]="$(docker inspect -f '{{.Image}}' "$svc" 2>/dev/null || echo none)"
done

log "building: ${services[*]}"
"${COMPOSE[@]}" build "${services[@]}"

skipped=()
recreated=()
for svc in "${services[@]}"; do
  new="$(docker image inspect -f '{{.Id}}' "${project}-${svc}" 2>/dev/null || echo none)"
  if [ "$new" = "${old_image[$svc]}" ]; then
    log "$svc: image unchanged, left running"
    continue
  fi

  if [[ "$ALWAYS_ON" != *" $svc "* ]] && [ "${old_image[$svc]}" != "none" ]; then
    start=$(date +%s)
    while :; do
      tasks="$(running_tasks "$svc")"
      [ -z "$tasks" ] && break
      waited=$(( $(date +%s) - start ))
      if [ "$waited" -ge "$MAX_WAIT" ]; then
        if [ "$FORCE" = "1" ]; then
          log "$svc: still running ${tasks}after ${waited}s; FORCE=1, recreating anyway"
          break
        fi
        log "$svc: still running ${tasks}after ${waited}s; skipped (re-run later, or FORCE=1)"
        skipped+=("$svc")
        continue 2
      fi
      log "$svc: waiting for ${tasks}(${waited}s)"
      sleep 5
    done
  fi

  if [ "$DRY_RUN" = "1" ]; then
    log "$svc: would recreate now (DRY_RUN)"
    continue
  fi
  stopped_at=$(date +%s)
  "${COMPOSE[@]}" up -d --no-deps "$svc"
  started_at=$(date -d "$(docker inspect -f '{{.State.StartedAt}}' "$svc")" +%s)
  recreated+=("$svc")
  log "$svc: recreated (down ${stopped_at}→${started_at})"

  tier="$(docker exec "$svc" printenv CRONTAB_TIER 2>/dev/null || true)"
  if [ -n "$tier" ]; then
    missed="$(docker exec -i "$svc" node --input-type=module - "/app/crontabs/$tier" "$stopped_at" "$started_at" < bin/cron-window.mjs || true)"
    if [ -n "$missed" ]; then
      log "$svc: due while it was down, re-run these:"
      printf '%s\n' "$missed" | sed 's/^/    /'
    fi
  fi
done

log "recreated: ${recreated[*]:-none}; skipped: ${skipped[*]:-none}"
[ "${#skipped[@]}" -eq 0 ]

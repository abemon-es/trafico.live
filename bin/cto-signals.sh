#!/usr/bin/env bash
# cto-signals.sh — one-shot signal collector for the 24/7 CTO loop.
#
# Gathers every observability surface trafico.live has into a single JSON blob
# so one loop iteration can triage from evidence instead of guessing:
#
#   prod health · smoke test · container state · silent-failure detection ·
#   collector heartbeats · Loki error volume · GlitchTip · GSC/GA4 · git state
#
# Usage:
#   bin/cto-signals.sh                # full sweep, JSON to stdout
#   bin/cto-signals.sh --quick        # skip smoke test (fast, ~15s)
#   bin/cto-signals.sh --no-remote    # public endpoints only (no SSH)
#   bin/cto-signals.sh --pretty       # human-readable summary instead of JSON
#
# Exit code is always 0 — a failed probe is a *signal*, not a script error.
# Every section carries its own "ok" field; consumers read that, not $?.
#
# Requires: curl, jq, ssh access to `compute`.

set -u
set -o pipefail

BASE="${CTO_BASE_URL:-https://trafico.live}"
REMOTE="${CTO_REMOTE_HOST:-compute}"
APP_DIR="/opt/apps/trafico-live"

QUICK=0
NO_REMOTE=0
PRETTY=0
for arg in "$@"; do
  case "$arg" in
    --quick)     QUICK=1 ;;
    --no-remote) NO_REMOTE=1 ;;
    --pretty)    PRETTY=1 ;;
    --help|-h)   sed -n '2,22p' "$0" | sed 's/^# \?//'; exit 0 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 0

CURL=(curl --silent --max-time 20 --location -A "cto-loop/1.0")
SSH=(ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE")

# jq -n helper that never emits invalid JSON, even if a probe returned garbage.
json_or_null() { jq -e . >/dev/null 2>&1 <<<"$1" && printf '%s' "$1" || printf 'null'; }

# ── 1. Prod health ────────────────────────────────────────────────────────────
# /api/health already aggregates all 51+ collector heartbeats with per-task
# staleness thresholds, so it is the single richest probe we have.
HEALTH_RAW="$("${CURL[@]}" "$BASE/api/health" 2>/dev/null)"
HEALTH="$(json_or_null "$HEALTH_RAW")"
# Public HTTP status, kept separately: when the edge-cache holds a stale
# upstream IP the body is a 502 error page, not JSON, and HEALTH collapses to
# null — indistinguishable from "probe failed" unless we record the code.
PUBLIC_CODE="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/api/health" 2>/dev/null || echo 000)"

# ── 2. Smoke test ─────────────────────────────────────────────────────────────
# Status codes, SEO basics, sitemap, canonical. Skipped in --quick.
if (( QUICK )); then
  SMOKE='{"skipped":true}'
else
  SMOKE_OUT="$(bash bin/smoke-test.sh "$BASE" --quiet 2>&1)"
  SMOKE_RC=$?
  SMOKE="$(jq -n --arg out "$SMOKE_OUT" --argjson rc "$SMOKE_RC" \
    '{ok: ($rc == 0), exit_code: $rc, output: $out}')"
fi

# ── 3. Remote: containers, Loki, SEO snapshot ────────────────────────────────
CONTAINERS='null'; LOKI='null'; SEO='null'; COLLECTOR_LOGS='null'; ORIGIN='null'
if (( NO_REMOTE == 0 )); then

  # Container state — name, status, health.
  CONTAINERS_RAW="$("${SSH[@]}" \
    'docker ps -a --format "{{.Names}}|{{.State}}|{{.Status}}" 2>/dev/null' 2>/dev/null \
    | jq -R -s 'split("\n") | map(select(length>0) | split("|") |
        {name: .[0], state: .[1], status: .[2],
         healthy: (.[2] | test("healthy")),
         unhealthy: (.[2] | test("unhealthy"))})')"
  CONTAINERS="$(json_or_null "$CONTAINERS_RAW")"

  # Loki error volume per container, last 1h. Catches error storms that never
  # reach a heartbeat (uncaught throws, OOM kills, restart loops).
  # NB: the LogQL line filter uses a double-quoted regex, never backticks —
  # backticks inside the SSH command string get substituted by the remote shell.
  #
  # Label taxonomy: Vector (exp-vector) tails every container's json-file logs
  # and ships them to Loki under the `service` label — collector-* and the web
  # app land there. The `container` label only exists for streams shipped other
  # ways (compose-labeled infra). An earlier version of this probe queried
  # `container` only and concluded collector logs never reached Loki at all —
  # they did, under the other label, for months.
  LOKI_QUERY='sum by (service) (count_over_time({service=~"collector-.*|trafico-.*"} |~ "(?i)error" [1h]))'
  LOKI_RAW="$("${SSH[@]}" \
    "curl -sG --max-time 15 'http://10.100.0.2:3100/loki/api/v1/query' \
      --data-urlencode 'query=${LOKI_QUERY}'" 2>/dev/null \
    | jq '[.data.result[]? | {container: .metric.service, errors_1h: (.value[1] | tonumber)}]
          | sort_by(-.errors_1h)' 2>/dev/null)"
  LOKI="$(json_or_null "$LOKI_RAW")"

  # Recent error/warn lines from every collector container — the "why".
  LOGS_RAW="$("${SSH[@]}" \
    'for c in collector-realtime collector-frequent collector-daily collector-weekly collector-fuel collector-ais trafico-live; do
       echo "### $c"
       docker logs --since 2h "$c" 2>&1 | grep -iE "error|fatal|not set|failed|refused" | tail -8
     done' 2>/dev/null)"
  COLLECTOR_LOGS="$(jq -R -s '.' <<<"$LOGS_RAW")"

  # Origin health, measured at the container — NOT through the public URL.
  #
  # On 2026-08-16 a bad image left trafico-live crash-looping for 25 minutes
  # while Cloudflare kept serving 200s from cache. The public probe above said
  # everything was fine; only a direct origin check saw it. Trust this section
  # over `health` when they disagree.
  ORIGIN_RAW="$("${SSH[@]}" \
    'st=$(docker inspect trafico-live --format "{{.State.Status}}" 2>/dev/null || echo missing);
     hl=$(docker inspect trafico-live --format "{{.State.Health.Status}}" 2>/dev/null || echo none);
     rc=$(docker inspect trafico-live --format "{{.RestartCount}}" 2>/dev/null || echo -1);
     code=$(docker exec trafico-live node -e "fetch(\"http://localhost:3000/api/health\").then(r=>{console.log(r.status);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})" 2>/dev/null | tail -1);
     printf "%s|%s|%s|%s" "$st" "$hl" "$rc" "${code:-0}"' 2>/dev/null \
    | jq -R 'split("|") | {
        state: .[0], health: .[1],
        restarts: ((.[2] // "-1") | tonumber),
        direct_status: ((.[3] // "0") | tonumber),
        ok: (.[0] == "running" and ((.[3] // "0") | tonumber) == 200)
      }')"
  ORIGIN="$(json_or_null "$ORIGIN_RAW")"

  # GSC/GA4 snapshot freshness — the SEO growth loop is blind without this.
  # NB: no coalesce here — in Postgres "" is an identifier, not an empty string.
  # psql -At already renders NULL as an empty field, which is what we want.
  SEO_RAW="$("${SSH[@]}" \
    "set -a; . $APP_DIR/.env 2>/dev/null; set +a;
     psql \"\$DATABASE_URL\" -At -F '|' -c \
     'select count(*), max(\"capturedAt\"), max(\"gscClicks30d\"), max(\"ga4Sessions30d\") from \"SeoSnapshot\";'" 2>/dev/null \
    | head -1 \
    | jq -R 'split("|") | {rows: (.[0] // "0" | tonumber),
                           latest: (.[1] // ""),
                           gsc_clicks_30d: (.[2] // ""),
                           ga4_sessions_30d: (.[3] // ""),
                           ok: ((.[0] // "0" | tonumber) > 0)}')"
  SEO="$(json_or_null "$SEO_RAW")"
fi

# ── 4. Silent-failure detection ───────────────────────────────────────────────
# The failure class that caused the May AIS blackout and recurred in August:
# a container reports `healthy` (its healthcheck only proves PID 1 is alive)
# while its data has been stale for days. Cross-reference the two surfaces —
# neither alone catches it.
SILENT="$(jq -n \
  --argjson health "$HEALTH" \
  --argjson containers "${CONTAINERS:-null}" '
  if ($health == null) then []
  else
    # Any collector container currently reporting unhealthy to Docker.
    ($containers // [] | map(select(.name | startswith("collector-")))) as $cc
    | ($cc | map(select(.unhealthy)) | map(.name)) as $sick
    | ($health.collectors // [])
      | map(select(.status != "ok" or .stale == true))
      | map(. + {
          # True silent failure: data is stale, yet Docker sees nothing wrong
          # anywhere. This is the AIS blackout signature — a healthcheck that
          # only proves PID 1 is alive while the data pipeline is dead.
          silent_failure: (.stale == true and ($sick | length) == 0),
          unhealthy_containers: $sick
        })
      | sort_by(if .status == "error" then 0 elif .stale then 1 else 2 end)
  end' 2>/dev/null)"
SILENT="$(json_or_null "$SILENT")"

# ── 5. Git / deploy state ─────────────────────────────────────────────────────
GIT="$(jq -n \
  --arg branch  "$(git branch --show-current 2>/dev/null)" \
  --arg head    "$(git rev-parse --short HEAD 2>/dev/null)" \
  --arg dirty   "$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')" \
  --arg ahead   "$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)" \
  --arg behind  "$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0)" \
  '{branch: $branch, head: $head, uncommitted: ($dirty|tonumber),
    ahead: ($ahead|tonumber), behind: ($behind|tonumber)}')"

# ── 6. Assemble ───────────────────────────────────────────────────────────────
RESULT="$(jq -n \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg base "$BASE" \
  --argjson health "$HEALTH" \
  --argjson smoke "$SMOKE" \
  --arg public_code "$PUBLIC_CODE" \
  --argjson containers "$CONTAINERS" \
  --argjson loki "$LOKI" \
  --argjson seo "$SEO" \
  --argjson origin "$ORIGIN" \
  --argjson silent "$SILENT" \
  --argjson git "$GIT" \
  --argjson logs "${COLLECTOR_LOGS:-null}" \
  '{
    captured_at: $ts,
    base_url: $base,
    health: $health,
    smoke: $smoke,
    containers: $containers,
    loki_errors_1h: $loki,
    seo_snapshot: $seo,
    origin: $origin,
    degraded_collectors: $silent,
    recent_error_logs: $logs,
    git: $git,
    summary: {
      overall: ($health.status // "unreachable"),
      collectors_total: ($health.totalCollectors // 0),
      collectors_degraded: ($silent | length),
      silent_failures: ([$silent[]? | select(.silent_failure)] | length),
      stale_count: ($health.staleCount // 0),
      # NB: never use `//` on booleans here — jq treats `false` as absent, so
      # `.ok // null` turns a *broken* signal into an *unknown* one and the loop
      # stops seeing real outages. Test presence explicitly instead.
      smoke_ok: (if ($smoke|type) == "object" and ($smoke|has("ok")) then $smoke.ok else null end),
      seo_pipeline_ok: (if ($seo|type) == "object" and ($seo|has("ok")) then $seo.ok else null end),
      origin_ok: (if ($origin|type) == "object" and ($origin|has("ok")) then $origin.ok else null end),
      public_code: $public_code,
      # Routing fault: the container serves fine but the public URL does not.
      # Neither number alone shows it — this is exactly the shape of both
      # 2026-08-18 outages (edge-cache holding a stale container IP after an
      # out-of-band restart), where the app was healthy throughout and the
      # container healthcheck was correct to say so.
      routing_fault: (
        (if ($origin|type) == "object" and ($origin|has("ok")) then $origin.ok else false end)
        and ($public_code != "200")
      ),
      db_ok: (if ($health|type) == "object" and ($health.db|type) == "object" then $health.db.ok else null end),
      redis_ok: (if ($health|type) == "object" and ($health.redis|type) == "object" then $health.redis.ok else null end)
    }
  }')"

if (( PRETTY )); then
  jq -r '
    "── trafico.live signals @ \(.captured_at) ──",
    "overall:     \(.summary.overall)   db=\(.summary.db_ok) redis=\(.summary.redis_ok)",
    "collectors:  \(.summary.collectors_degraded)/\(.summary.collectors_total) degraded, \(.summary.stale_count) stale, \(.summary.silent_failures) SILENT",
    (if .summary.routing_fault then "⚠ ROUTING FAULT: container healthy but public returns \(.summary.public_code) — edge-cache likely holds a stale upstream IP; notify CTO" else empty end),
    "public:      \(.summary.public_code)",
    "origin:      \(.summary.origin_ok)   (container=\(.origin.state // "?") health=\(.origin.health // "?") restarts=\(.origin.restarts // "?") direct=\(.origin.direct_status // "?"))",
    "smoke:       \(.summary.smoke_ok)",
    "seo pipe:    \(.summary.seo_pipeline_ok)   (snapshots=\(.seo_snapshot.rows // "?"))",
    "git:         \(.git.branch) @\(.git.head) (\(.git.uncommitted) uncommitted)",
    "",
    "degraded collectors:",
    (.degraded_collectors[]? |
      "  \(if .silent_failure then "[SILENT] " else "" end)\(.task)  status=\(.status) stale=\(.stale) age=\(.ageSeconds)s  \(.errorMessage // "")"),
    "",
    "top loki error sources (1h):",
    (.loki_errors_1h[]? | "  \(.container): \(.errors_1h)")
  ' <<<"$RESULT"
else
  printf '%s\n' "$RESULT"
fi

exit 0

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
GLITCHTIP_PROJECT="${CTO_GLITCHTIP_PROJECT:-9}"   # trafico-live on errors.abemon.es
# Loki, GlitchTip and its read-only token, as compute reaches them. They are
# internal, so this public repo doesn't carry them: each comes from the
# environment or from a local file of KEY=value lines (CTO_REMOTE_ENV). A probe
# whose value is missing reports itself as failed, never as quiet.
CTO_REMOTE_ENV="${CTO_REMOTE_ENV:-${XDG_CONFIG_HOME:-$HOME/.config}/trafico-cto-loop/remote.env}"
REMOTE_KEYS="CTO_LOKI_HTTP CTO_GT_HTTP CTO_GT_TOKEN_FILE"
if [[ -r "$CTO_REMOTE_ENV" ]]; then
  while IFS='=' read -r k v; do
    case " $REMOTE_KEYS " in
      *" $k "*) [[ -n "${!k:-}" ]] || printf -v "$k" '%s' "${v%$'\r'}" ;;
    esac
  done < "$CTO_REMOTE_ENV"
fi
LOKI_HTTP="${CTO_LOKI_HTTP:-}"
GT_HTTP="${CTO_GT_HTTP:-}"
GT_TOKEN_FILE="${CTO_GT_TOKEN_FILE:-}"
REMOTE_MISSING=""
for k in $REMOTE_KEYS; do [[ -n "${!k:-}" ]] || REMOTE_MISSING="$REMOTE_MISSING $k"; done
REMOTE_MISSING="${REMOTE_MISSING# }"
# Lifetime counts from the previous probe, so each run can report a rate.
GT_STATE="${XDG_CACHE_HOME:-$HOME/.cache}/trafico-cto-loop/glitchtip-counts.json"

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

# The HOMEPAGE, probed separately and with a bounded redirect budget.
#
# Until 2026-08-24 "public" above was the only public probe, and it asks
# /api/health — which the edge-cache serves from its no-cache catch-all. The
# homepage sits in its own cached `location = /`, so an outage confined to the
# homepage was invisible here: the loop ran for hours reporting public 200.
# curl exits 47 when it exhausts --max-redirs, which is the loop's signature; a
# self-referential 301 chain otherwise looks like a healthy redirect.
HOME_CODE="$(curl --silent --max-time 20 --location --max-redirs 5 \
  -A "cto-loop/1.0" -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null)"
HOME_CURL_RC=$?
if [ "$HOME_CURL_RC" -eq 47 ]; then
  HOME_STATE="redirect_loop"
elif [ "$HOME_CODE" = "200" ]; then
  HOME_STATE="ok"
else
  HOME_STATE="http_${HOME_CODE:-000}"
fi
# Which build is actually serving, versus what main says it should be. A deploy
# that reports SUCCESS while the old container keeps serving looks identical to
# a healthy site from every other angle.
LIVE_COMMIT="$(jq -r '.commit // "unknown"' <<<"$HEALTH" 2>/dev/null || echo unknown)"
# Compare against origin/main, NOT local HEAD: the playbook has this loop commit
# freely and push once per cycle, so a local unpushed commit is the normal state
# and comparing it to the deployed build cried wolf on every held commit (it did
# exactly that in the 2026-08-21 handover). What deploys is what origin/main has.
git fetch --quiet origin main 2>/dev/null || true
HEAD_COMMIT="$(git rev-parse --short origin/main 2>/dev/null || echo unknown)"

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
CONTAINERS='null'; LOKI='null'; SEO='null'; COLLECTOR_LOGS='null'; ORIGIN='null'; GLITCHTIP='null'; JOBFAIL='null'
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
  #
  # What counts as an error line (2026-10-19). Keyed on content, not on the
  # level: supercronic logs all job output as level=info (crontabs merge stderr
  # with 2>&1) and logError() adds no level, so `level=error` alone misses most
  # real failures. A bare (?i)error was worse: ~80% of its hits were count
  # summaries ("skipped (no coords/error): N", "Errors: 0", "(N errors)").
  #   counts:  "Error:" (incl. TypeError:/ImportError:), "Error [", [error],
  #            failed/failure, fatal, exception, unhandled, rejected,
  #            out of memory, killed, and a JSON or supercronic level=error.
  #   ignores: zero counters ("errors: 0", "0 failed"), retry/backoff notices
  #            and Next's "Read more: …" doc links.
  # Plural only in the zero-counter rule: "ImportError: 0 documents imported"
  # is a real failure. No backslashes on purpose: the query crosses bash, ssh
  # and a LogQL string literal.
  LOKI_ERR='(?i)(level[^a-z0-9]{1,8}error|[[]error[]]|error:|error [[]|failed|failure|fatal|exception|unhandled|rejected|out of memory|killed)'
  LOKI_NOISE='(?i)((^|[^0-9])0 (failed|errors|rejected)|(failed|errors|rejected): 0([^0-9]|$)|read more: https?://|backoff|retrying)'
  LOKI_QUERY="sum by (service) (count_over_time({service=~\"collector-.*|trafico-.*\"} |~ \"${LOKI_ERR}\" !~ \"${LOKI_NOISE}\" [1h]))"
  # Anything but a successful answer is null, which prints as a failed probe:
  # an error body must not read as zero errors.
  LOKI_RAW=""
  [[ -n "$LOKI_HTTP" ]] && LOKI_RAW="$("${SSH[@]}" \
    "curl -sG --max-time 15 '${LOKI_HTTP}/loki/api/v1/query' \
      --data-urlencode 'query=${LOKI_QUERY}'" 2>/dev/null \
    | jq 'if .status == "success" then
            [.data.result[]? | {container: .metric.service, errors_1h: (.value[1] | tonumber)}]
            | sort_by(-.errors_1h)
          else empty end' 2>/dev/null)"
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

  # GlitchTip — what the app and collectors actually throw.
  #
  # The header of this script listed GlitchTip from the start, but no probe
  # ever read it: the tracker was a write-only sink. When the loop restarted on
  # 2026-10-18 it held ~5,300 events of `DGT Panel … 404` (since 2026-09-30)
  # and an `ArcGIS 499: Token Required` from transit-rt-valencia, none of which
  # any signal here had surfaced as a cause.
  #
  # Read-only token `sentinel-ro` (shared with the CSO pulse) lives only on
  # compute; the request runs there so the value never leaves the host.
  # `count` is lifetime and the API returns no per-period stats, so the rate is
  # the delta against the previous probe (GT_STATE).
  if [[ -z "$GT_HTTP" || -z "$GT_TOKEN_FILE" ]]; then
    GT_RAW='{"error":"not configured: CTO_GT_HTTP and CTO_GT_TOKEN_FILE (see CTO_REMOTE_ENV)"}'
  else GT_RAW="$("${SSH[@]}" \
    'T=$(cat '"$GT_TOKEN_FILE"' 2>/dev/null)
     [ -n "$T" ] || { echo "{\"error\":\"token file '"$GT_TOKEN_FILE"' missing on compute\"}"; exit 0; }
     curl -s --max-time 15 -H "Authorization: Bearer $T" \
       "'"$GT_HTTP"'/api/0/organizations/abemon/issues/?project='"$GLITCHTIP_PROJECT"'&query=is%3Aunresolved&sort=-last_seen&limit=100"' 2>/dev/null)"
  fi
  GT_PREV="$(json_or_null "$(cat "$GT_STATE" 2>/dev/null)")"
  GT_NOW="$(date +%s)"
  GLITCHTIP="$(jq --argjson prev "$GT_PREV" --argjson now "$GT_NOW" '
    def t: sub("\\.[0-9]+"; "") | sub("\\+00:00$"; "Z") | fromdateiso8601;
    if type != "array" then
      {ok: false, error: ((.error? // .detail? // "unexpected response") | tostring)}
    else
      (($prev // {}).counts // {}) as $pc
      | map({
          id, short: .shortId,
          title: (.title | tostring | gsub("\n"; " ") | .[0:110]),
          source: ((.metadata.filename? // .culprit // "") | tostring
                   | sub("^/app/"; "")),
          count: (.count | tonumber),
          first: (.firstSeen | t), last: (.lastSeen | t),
          url: .permalink
        })
      | map(. + {delta: (if $pc[.id] == null then null else .count - $pc[.id] end)})
      | . as $i
      | {
          ok: true,
          unresolved: ($i | length),
          capped: (($i | length) >= 100),
          since_prev_s: (if ($prev | type) == "object" and ($prev | has("at")) then $now - $prev.at else null end),
          events_since_prev: ([$i[] | .delta // 0] | add // 0),
          active_24h: ([$i[] | select(.last > $now - 86400)] | length),
          new_24h:    ([$i[] | select(.first > $now - 86400)] | length),
          new_7d:     ([$i[] | select(.first > $now - 604800)] | length),
          # Ranked by growth since the previous probe, then lifetime count —
          # a quiet issue with a huge history must not outrank a fresh storm.
          active: ([$i[] | select(.last > $now - 86400)]
                   | sort_by(-(.delta // 0), -.count) | .[0:8]
                   | map(. + {first: (.first | todate), last: (.last | todate)})),
          new_7d_issues: ([$i[] | select(.first > $now - 604800)]
                   | sort_by(-.count) | .[0:8]
                   | map(. + {first: (.first | todate), last: (.last | todate)})),
          counts: (map({(.id): .count}) | add // {}),
          # supercronic has had no DSN since #198 (collectors recreated
          # 2026-10-22T09:27:08Z). Its issues cannot be resolved with the
          # read-only token, so they stay open and quiet: a lastSeen after
          # the cutoff means a job reached the Sentry of supercronic without
          # the dispatcher.
          supercronic_regression: ([$i[]
                   | select((.title | test("^error running command: exit status"))
                            and .last > ("2026-10-22T09:27:08Z" | fromdateiso8601))]
                   | map({short, count, last: (.last | todate)}))
        }
    end' <<<"${GT_RAW:-null}" 2>/dev/null)"
  GLITCHTIP="$(json_or_null "$GLITCHTIP")"
  # Persist counts only from a good read, so one failed probe cannot zero the
  # baseline and make the next run report every lifetime event as new.
  if [[ "$(jq -r '.ok' <<<"$GLITCHTIP" 2>/dev/null)" == "true" ]]; then
    mkdir -p "$(dirname "$GT_STATE")" \
      && jq --argjson now "$GT_NOW" '{at: $now, counts: .counts}' <<<"$GLITCHTIP" > "$GT_STATE.tmp" \
      && mv "$GT_STATE.tmp" "$GT_STATE"
  fi
  GLITCHTIP="$(jq 'del(.counts)' <<<"$GLITCHTIP" 2>/dev/null || printf 'null')"

  # Process deaths: collector jobs that failed in the last hour with no
  # GlitchTip event from their task (bin/job-failures.mjs; decision in BACKLOG
  # cycle 125). supercronic has no DSN since #198, so a task that dies outright
  # (OOM, a recreate's kill, node failing to start) only shows here.
  # Without all three it would flag every failing task, so it doesn't run.
  if [[ -n "$REMOTE_MISSING" ]]; then
    JOBFAIL="{\"ok\":false,\"error\":\"not configured: $REMOTE_MISSING (see CTO_REMOTE_ENV)\"}"
  else
  JOBFAIL_RAW="$("${SSH[@]}" sh -s -- "$LOKI_HTTP" "$GT_HTTP" "$GT_TOKEN_FILE" "$GLITCHTIP_PROJECT" 2>/dev/null <<'REMOTE'
out=/tmp/cto-jobfail.$$.json
code=$(curl -s -o "$out" -w "%{http_code}" -G --max-time 20 "$1/loki/api/v1/query_range" \
  --data-urlencode 'query={service=~"collector-.+"} |~ "error running command|upstream still failing"' \
  --data-urlencode "since=1h" --data-urlencode "limit=5000")
T=$(cat "$3" 2>/dev/null)
cut=$(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%S)
tasks="[]"
if [ -n "$T" ]; then
  ids=$(curl -s --max-time 15 -H "Authorization: Bearer $T" "$2/api/0/organizations/abemon/issues/?project=$4&query=is%3Aunresolved&sort=-last_seen&limit=30" \
    | jq -r --arg c "$cut" '.[]? | select(.lastSeen > $c) | .id')
  tasks=$(for i in $ids; do
      curl -s --max-time 10 -H "Authorization: Bearer $T" "$2/api/0/issues/$i/events/latest/" | jq -r '(.tags // []) | from_entries | .task // empty'
    done | sort -u | jq -R . | jq -sc .)
fi
jq -nc --arg code "$code" --argjson tasks "${tasks:-[]}" --slurpfile loki "$out" \
  '{lokiOk: ($code == "200"), lines: [$loki[0].data.result[]?.values[]?[1]], gtTasks: $tasks}' 2>/dev/null || echo '{"lokiOk":false}'
rm -f "$out"
REMOTE
)"
  JOBFAIL="$(jq -nc --argjson raw "$(json_or_null "$JOBFAIL_RAW")" --argjson health "$HEALTH" \
    '{lokiOk: ($raw.lokiOk // false), lines: ($raw.lines // null), gtTasks: ($raw.gtTasks // []),
      upstreamTasks: [($health.collectors // [])[] | select(.cause == "upstream") | .task]}' \
    | node "$(dirname "$0")/job-failures.mjs" 2>/dev/null)"
  fi
  JOBFAIL="$(json_or_null "$JOBFAIL")"
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
          # True silent failure: data is stale, yet nothing anywhere says so.
          # This is the AIS blackout signature — a healthcheck that only proves
          # PID 1 is alive while the data pipeline is dead. A task whose last
          # run recorded "error" is failing loudly, not silently: since
          # lastSuccessAt (#197) it is stale while it keeps running and
          # reporting its error.
          silent_failure: (.stale == true and .status != "error" and ($sick | length) == 0),
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
  --arg home_state "$HOME_STATE" \
  --arg home_code "$HOME_CODE" \
  --arg live_commit "$LIVE_COMMIT" \
  --arg head_commit "$HEAD_COMMIT" \
  --argjson containers "$CONTAINERS" \
  --argjson loki "$LOKI" \
  --argjson seo "$SEO" \
  --argjson glitchtip "$GLITCHTIP" \
  --argjson origin "$ORIGIN" \
  --argjson silent "$SILENT" \
  --argjson jobfail "${JOBFAIL:-null}" \
  --argjson git "$GIT" \
  --argjson logs "${COLLECTOR_LOGS:-null}" \
  --argjson remote "$(( NO_REMOTE == 0 ))" \
  --arg remote_missing "$REMOTE_MISSING" \
  '{
    captured_at: $ts,
    remote_probed: ($remote == 1),
    remote_config_missing: ($remote_missing | split(" ") | map(select(length > 0))),
    base_url: $base,
    health: $health,
    smoke: $smoke,
    containers: $containers,
    loki_errors_1h: $loki,
    seo_snapshot: $seo,
    glitchtip: $glitchtip,
    origin: $origin,
    degraded_collectors: $silent,
    job_failures: $jobfail,
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
      glitchtip_ok: (if ($glitchtip|type) == "object" and ($glitchtip|has("ok")) then $glitchtip.ok else null end),
      glitchtip_active_24h: ($glitchtip.active_24h? // null),
      glitchtip_new_24h: ($glitchtip.new_24h? // null),
      origin_ok: (if ($origin|type) == "object" and ($origin|has("ok")) then $origin.ok else null end),
      public_code: $public_code,
      home_state: $home_state,
      home_code: $home_code,
      # A homepage that never resolves is a total outage for users even while
      # every API probe stays green.
      homepage_down: ($home_state != "ok"),
      live_commit: $live_commit,
      head_commit: $head_commit,
      # True only when both are known and differ — an unknown build (older
      # image, before commit stamping) must not masquerade as a mismatch.
      commit_drift: (
        $live_commit != "unknown" and $head_commit != "unknown"
        and $live_commit != $head_commit
      ),
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
    (if .summary.commit_drift then "⚠ COMMIT DRIFT: serving \(.summary.live_commit) but origin/main is \(.summary.head_commit) — a deploy reported success without swapping" else empty end),
    "public:      \(.summary.public_code)   build=\(.summary.live_commit)",
    (if .summary.homepage_down then "🚨 HOMEPAGE DOWN: / is \(.summary.home_state) — users cannot load the site even though the API answers" else "homepage:    ok" end),
    "origin:      \(.summary.origin_ok)   (container=\(.origin.state // "?") health=\(.origin.health // "?") restarts=\(.origin.restarts // "?") direct=\(.origin.direct_status // "?"))",
    "smoke:       \(.summary.smoke_ok)",
    "seo pipe:    \(.summary.seo_pipeline_ok)   (snapshots=\(.seo_snapshot.rows // "?"))",
    "git:         \(.git.branch) @\(.git.head) (\(.git.uncommitted) uncommitted)",
    (if .remote_probed and (.remote_config_missing | length) > 0 then "⚠ PROBE CONFIG MISSING: \(.remote_config_missing | join(" ")) — set them in CTO_REMOTE_ENV (default ~/.config/trafico-cto-loop/remote.env); the Loki, GlitchTip and job-failure probes are off" else empty end),
    "",
    "degraded collectors:",
    (.degraded_collectors[]? |
      "  \(if .silent_failure then "[SILENT] " else "" end)\(.task)  status=\(.status) stale=\(.stale) \(if .ageSeconds == null then "no success on record" else "age=\(.ageSeconds)s" end)\(if .lastRunAt and .ageSeconds == null then " (ran \(now - (.lastRunAt | sub("\\.[0-9]+"; "") | fromdateiso8601) | floor)s ago)" else "" end)\(if .cause then " cause=\(.cause)" else "" end)  \(.errorMessage // "")\(if .running == true then "  running, slow but alive: last progress \(.progressAgeSeconds)s ago" elif (.meta | type) == "object" and .meta.runStartedAt then "  run started \(.meta.runStartedAt), not finished (running, or killed mid-run)" else "" end)"),
    "",
    (if .remote_probed | not then "job failures: not probed"
     elif (.job_failures | type) != "object" or .job_failures.ok != true
     then "⚠ JOB-FAILURE PROBE FAILED: \(.job_failures.error? // "no answer") (a dead query is not «no failures»)"
     else "job failures (1h): total=\(.job_failures.total) in \(.job_failures.tasks | length) tasks · flagged (no GlitchTip event)=\(.job_failures.flagged | length)\(if (.job_failures.flagged | length) > 0 then " ⚠ " + ([.job_failures.flagged[] | "\(.task):\(.failures)"] | join(" ")) else "" end)\(if (.job_failures.upstream | length) > 0 then " · upstream, reported at start: " + ([.job_failures.upstream[] | "\(.task):\(.failures)"] | join(" ")) else "" end)" end),
    "",
    "top loki error sources (1h):",
    (if (.loki_errors_1h | type) == "array" then (.loki_errors_1h[] | "  \(.container): \(.errors_1h)")
     elif .remote_probed then "  ⚠ LOKI PROBE FAILED (not configured, or no successful answer)"
     else "  not probed" end),
    "",
    (if (.glitchtip|type) != "object" then "glitchtip:   not probed"
     elif .glitchtip.ok != true then "⚠ GLITCHTIP PROBE FAILED: \(.glitchtip.error // "?")"
     else
       (if ((.glitchtip.supercronic_regression // []) | length) > 0
        then "⚠ SUPERCRONIC REPORTING AGAIN (no DSN since #198): \([.glitchtip.supercronic_regression[] | "[\(.short)] last \(.last)"] | join(", "))"
        else empty end),
       "glitchtip:   \(.glitchtip.unresolved)\(if .glitchtip.capped then "+" else "" end) unresolved · active24h=\(.glitchtip.active_24h) new24h=\(.glitchtip.new_24h) new7d=\(.glitchtip.new_7d) · \(if .glitchtip.since_prev_s == null then "first probe, no rate yet" else "+\(.glitchtip.events_since_prev) events in \((.glitchtip.since_prev_s / 60) | floor)m" end)",
       (.glitchtip.active[]? |
         "  \(if .delta == null then "   ?" else "+\(.delta)" end)  n=\(.count)  [\(.short)] \(.title[0:70])  ← \(.source)"),
       (if (.glitchtip.new_7d_issues | length) > 0 then "  new in 7d:" else empty end),
       (.glitchtip.new_7d_issues[]? |
         "    \(.first[0:10]) n=\(.count) [\(.short)] \(.title[0:70])")
     end)
  ' <<<"$RESULT"
else
  printf '%s\n' "$RESULT"
fi

exit 0

#!/usr/bin/env bash
# lighthouse-mobile.sh — Run Lighthouse mobile audits on top routes
#
# Usage:
#   bash bin/lighthouse-mobile.sh [BASE_URL]
#   bash bin/lighthouse-mobile.sh https://trafico.live
#   bash bin/lighthouse-mobile.sh http://localhost:3000
#
# Options:
#   --help      Print usage and exit
#   --dry-run   Print URLs to audit without running Lighthouse
#
# Environment:
#   LIGHTHOUSE_OUTPUT_DIR   Directory for JSON/HTML reports (default: .lighthouse-reports)
#   ROUTES_FILE             Path to routes config JSON (default: bin/mobile-routes.json)
#
# Dependencies:
#   - lighthouse  (npm install -g lighthouse)
#   - jq          (brew install jq)
#
# Exit codes:
#   0  All routes pass all thresholds
#   1  One or more routes fail a threshold
#   2  Missing dependency or bad arguments

set -euo pipefail

# ─── Help ─────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,24p' "$0" | sed 's/^# \?//'
  exit 0
fi

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_URL="${1:-https://trafico.live}"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" || "${2:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  [[ "${1:-}" == "--dry-run" ]] && BASE_URL="https://trafico.live"
fi

# Normalise: strip trailing slash
BASE_URL="${BASE_URL%/}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROUTES_FILE="${ROUTES_FILE:-${SCRIPT_DIR}/mobile-routes.json}"
OUTPUT_DIR="${LIGHTHOUSE_OUTPUT_DIR:-${SCRIPT_DIR}/../.lighthouse-reports}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="${OUTPUT_DIR}/${TIMESTAMP}"

# ─── Dependency checks ────────────────────────────────────────────────────────
check_dep() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' is not installed." >&2
    case "$1" in
      lighthouse) echo "  Install: npm install -g lighthouse" >&2 ;;
      jq)         echo "  Install: brew install jq" >&2 ;;
    esac
    exit 2
  fi
}

check_dep jq

# ─── Read routes config ───────────────────────────────────────────────────────
if [[ ! -f "${ROUTES_FILE}" ]]; then
  echo "ERROR: routes config not found at ${ROUTES_FILE}" >&2
  exit 2
fi

# Parse thresholds
THRESH_PERF=$(jq -r '.thresholds.performance // 80' "${ROUTES_FILE}")
THRESH_A11Y=$(jq -r '.thresholds.accessibility // 80' "${ROUTES_FILE}")
THRESH_SEO=$(jq  -r '.thresholds.seo // 80' "${ROUTES_FILE}")
THRESH_BP=$(jq   -r '.["thresholds"]["best-practices"] // 75' "${ROUTES_FILE}")

# Build parallel arrays from JSON (bash 3.2 compatible — no mapfile)
ROUTE_COUNT=$(jq -r '.routes | length' "${ROUTES_FILE}")

ROUTE_PATHS=()
ROUTE_LABELS=()
for idx in $(seq 0 $((ROUTE_COUNT - 1))); do
  ROUTE_PATHS+=("$(jq -r ".routes[${idx}].path" "${ROUTES_FILE}")")
  ROUTE_LABELS+=("$(jq -r ".routes[${idx}].label" "${ROUTES_FILE}")")
done

# ─── Header ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  trafico.live — Lighthouse Mobile Audit"
echo "  Target: ${BASE_URL}"
echo "  Routes: ${#ROUTE_PATHS[@]}"
echo "  Thresholds: Performance >=${THRESH_PERF}  Accessibility >=${THRESH_A11Y}  SEO >=${THRESH_SEO}  Best Practices >=${THRESH_BP}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "[dry-run] URLs to audit:"
  for path in "${ROUTE_PATHS[@]}"; do
    echo "  ${BASE_URL}${path}"
  done
  echo ""
  echo "[dry-run] No audits run. Remove --dry-run to execute."
  exit 0
fi

# After dry-run gate, check lighthouse exists
check_dep lighthouse

# ─── Create output directory ──────────────────────────────────────────────────
mkdir -p "${RUN_DIR}"
echo "Reports will be saved to: ${RUN_DIR}"
echo ""

# ─── Run audits ───────────────────────────────────────────────────────────────
FAILURES=0
PASS_COUNT=0
FAIL_COUNT=0

# Table header
printf "%-30s %4s  %4s  %4s  %4s  %s\n" "Route" "Perf" "A11y" "SEO" "BP" "Status"
printf "%-30s %4s  %4s  %4s  %4s  %s\n" "------------------------------" "----" "----" "---" "--" "------"

for i in "${!ROUTE_PATHS[@]}"; do
  path="${ROUTE_PATHS[$i]}"
  label="${ROUTE_LABELS[$i]}"
  url="${BASE_URL}${path}"

  # Sanitise path to a safe filename
  safe_name="$(echo "${path}" | tr '/' '_' | sed 's/^_//')"
  [[ -z "${safe_name}" ]] && safe_name="home"
  report_json="${RUN_DIR}/${safe_name}.json"

  # Run Lighthouse — mobile preset, headless Chrome, JSON output
  lighthouse_exit=0
  lighthouse "${url}" \
    --preset=perf \
    --form-factor=mobile \
    --throttling-method=simulate \
    --output=json \
    --output-path="${report_json}" \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
    --quiet \
    2>/dev/null || lighthouse_exit=$?

  if [[ ${lighthouse_exit} -ne 0 ]] || [[ ! -f "${report_json}" ]]; then
    printf "%-30s %4s  %4s  %4s  %4s  %s\n" "${label:0:30}" "ERR" "ERR" "ERR" "ERR" "FAIL (lighthouse error)"
    FAILURES=$((FAILURES + 1))
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi

  # Extract scores (0-1 float => multiply x 100 => int)
  score_perf=$(jq -r '(.categories.performance.score // 0) * 100 | floor' "${report_json}")
  score_a11y=$(jq -r '(.categories.accessibility.score // 0) * 100 | floor' "${report_json}")
  score_seo=$(jq  -r '(.categories.seo.score // 0) * 100 | floor' "${report_json}")
  score_bp=$(jq   -r '(.categories["best-practices"].score // 0) * 100 | floor' "${report_json}")

  # Threshold check
  route_fail=0
  fail_reasons=""

  if [[ ${score_perf} -lt ${THRESH_PERF} ]]; then
    route_fail=1; fail_reasons="${fail_reasons}Perf(${score_perf}<${THRESH_PERF}) "
  fi
  if [[ ${score_a11y} -lt ${THRESH_A11Y} ]]; then
    route_fail=1; fail_reasons="${fail_reasons}A11y(${score_a11y}<${THRESH_A11Y}) "
  fi
  if [[ ${score_seo} -lt ${THRESH_SEO} ]]; then
    route_fail=1; fail_reasons="${fail_reasons}SEO(${score_seo}<${THRESH_SEO}) "
  fi
  if [[ ${score_bp} -lt ${THRESH_BP} ]]; then
    route_fail=1; fail_reasons="${fail_reasons}BP(${score_bp}<${THRESH_BP}) "
  fi

  if [[ ${route_fail} -eq 1 ]]; then
    status="FAIL -- ${fail_reasons}"
    FAILURES=$((FAILURES + 1))
    FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    status="PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi

  printf "%-30s %4d  %4d  %4d  %4d  %s\n" \
    "${label:0:30}" "${score_perf}" "${score_a11y}" "${score_seo}" "${score_bp}" "${status}"
done

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary: ${PASS_COUNT} passed  ${FAIL_COUNT} failed  ${#ROUTE_PATHS[@]} total"
echo "  Reports: ${RUN_DIR}/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ ${FAILURES} -gt 0 ]]; then
  echo "RESULT: FAIL -- ${FAILURES} route(s) did not meet Lighthouse thresholds." >&2
  exit 1
fi

echo "RESULT: PASS -- all routes meet Lighthouse thresholds."
exit 0

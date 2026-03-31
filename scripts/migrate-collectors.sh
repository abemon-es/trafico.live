#!/usr/bin/env bash
# migrate-collectors.sh — Migrate Coolify from legacy standalone collectors
# to unified collector image.
#
# Prerequisites:
#   - SSH access to hetzner-prod (Coolify host)
#   - Coolify CLI or API access
#
# This script documents the migration steps. Run interactively — do NOT pipe to bash.

set -euo pipefail

echo "=== Unified Collector Migration ==="
echo ""
echo "Overview:"
echo "  BEFORE: 9 separate Docker images, each with own Dockerfile + package.json"
echo "  AFTER:  1 Docker image (trafico-collector), 10 Coolify scheduled tasks"
echo ""

# ── Step 1: Build the unified image ────────────────────────────────
echo "Step 1: Build unified collector image"
echo "  On the Coolify host or in Coolify UI:"
echo ""
echo '  docker build -f services/collector/Dockerfile -t trafico-collector:latest .'
echo ""

# ── Step 2: Create Coolify scheduled tasks ─────────────────────────
echo "Step 2: Create Coolify scheduled tasks (one per collector)"
echo ""
echo "  For each task below, create a Coolify 'Scheduled Task':"
echo "  - Image: trafico-collector:latest"
echo "  - Env: DATABASE_URL, REDIS_URL (from app's shared env)"
echo "  - Set TASK= and cron schedule as shown"
echo ""

cat <<'TABLE'
  ┌──────────────┬────────────────────┬───────────────────────────────────┐
  │ TASK=        │ Cron               │ Description                       │
  ├──────────────┼────────────────────┼───────────────────────────────────┤
  │ incident     │ */5 * * * *        │ DGT/SCT/Euskadi/Madrid incidents  │
  │ v16          │ */5 * * * *        │ V16 beacon activations            │
  │ panel        │ */5 * * * *        │ Variable message sign panels      │
  │ weather      │ */30 * * * *       │ AEMET weather conditions + alerts │
  │ insights     │ 15 7,14,21 * * *   │ Price change + trend insights     │
  │ gas-station  │ 0 6,13,20 * * *    │ MINETUR fuel prices (terrestrial) │
  │ camera       │ 0 4 * * *          │ DGT traffic cameras               │
  │ radar        │ 0 3 * * *          │ DGT speed radars + enrichment     │
  │ charger      │ 0 6 * * *          │ EV charging stations              │
  │ speedlimit   │ 0 3 * * 0          │ DGT speed limit segments (weekly) │
  └──────────────┴────────────────────┴───────────────────────────────────┘
TABLE

echo ""

# ── Step 3: Verify new tasks run ───────────────────────────────────
echo "Step 3: Verify each task runs successfully"
echo ""
echo '  # Test one task manually:'
echo '  docker run --rm --env-file .env -e TASK=incident trafico-collector:latest'
echo ""
echo '  # Check logs in Coolify UI after first cron trigger'
echo ""

# ── Step 4: Disable legacy services ───────────────────────────────
echo "Step 4: Disable legacy standalone collector services in Coolify"
echo "  (Do NOT delete yet — keep as rollback option for 48h)"
echo ""
echo "  Legacy services to disable:"

for svc in incident-collector v16-collector panel-collector weather-collector \
           gas-station-collector camera-collector radar-collector \
           charger-collector speedlimit-collector; do
  echo "    - $svc"
done

echo ""

# ── Step 5: Cleanup (after 48h) ───────────────────────────────────
echo "Step 5: After 48h with no issues, delete legacy services and files:"
echo ""
echo "  In Coolify: delete the 9 disabled legacy services"
echo ""
echo "  In repo (optional — can keep for history):"
echo "    git rm -r services/camera-collector/"
echo "    git rm -r services/charger-collector/"
echo "    git rm -r services/gas-station-collector/"
echo "    git rm -r services/incident-collector/"
echo "    git rm -r services/panel-collector/"
echo "    git rm -r services/radar-collector/"
echo "    git rm -r services/speedlimit-collector/"
echo "    git rm -r services/v16-collector/"
echo "    git rm -r services/weather-collector/"
echo "    git rm Dockerfile.incident-collector Dockerfile.v16-collector"
echo ""

echo "=== Migration plan complete ==="

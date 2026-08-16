#!/usr/bin/env bash
set -euo pipefail

APP_NAME="trafico-live"
IMAGE="trafico-web:latest"
ENV_FILE="/opt/apps/trafico-live/.env"

# Give the build a real DATABASE_URL.
#
# `next build` prerenders the ~177 pages that query Postgres server-side. Without
# a reachable database those prerenders are produced with no data, and the empty
# HTML is baked into the image and served until ISR regenerates each route — up
# to 24 h on pages using revalidate=86400. Confirmed on 2026-08-16: a new
# server-rendered station directory deployed with zero links despite 1,506
# stations existing, because the build could not read the database.
#
# Passed as a BuildKit secret rather than a build arg so it never lands in the
# image history. If the value is missing the build still runs exactly as before,
# so a malformed env file degrades to the old behaviour instead of blocking deploys.
DBURL_FILE="$(mktemp)"
chmod 600 "$DBURL_FILE"
trap 'rm -f "$DBURL_FILE"' EXIT
grep -E '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- > "$DBURL_FILE" || true
if [ -s "$DBURL_FILE" ]; then
  echo "Build will use DATABASE_URL from $ENV_FILE (prerender with real data)"
else
  echo "WARNING: no DATABASE_URL in $ENV_FILE — DB-backed pages will prerender empty"
fi

echo "Building $IMAGE..."
DOCKER_BUILDKIT=1 docker build --memory 4096m --memory-swap 4096m \
  --secret id=database_url,src="$DBURL_FILE" \
  -f Dockerfile -t "$IMAGE" .

echo "Removing old container (if any)..."
docker rm -f "$APP_NAME" 2>/dev/null || true

echo "Starting $APP_NAME..."
docker run -d \
  --name "$APP_NAME" \
  --restart unless-stopped \
  --network web \
  --env-file "$ENV_FILE" \
  -e NODE_ENV=production \
  --memory 4096m \
  --memory-reservation 1024m \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.trafico-live.rule=Host(\`trafico.live\`) || Host(\`www.trafico.live\`)" \
  -l "traefik.http.routers.trafico-live.entrypoints=https" \
  -l "traefik.http.routers.trafico-live.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.trafico-live.loadbalancer.server.port=3000" \
  --health-cmd "node -e \"fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))\"" \
  --health-interval 30s \
  --health-timeout 5s \
  --health-start-period 30s \
  --health-retries 3 \
  "$IMAGE"

echo "Connecting to trafico-routing network (OSRM/OTP/Valhalla)..."
docker network connect trafico-routing "$APP_NAME" 2>/dev/null || true

echo "Waiting for health check..."
sleep 15
STATUS=$(docker inspect "$APP_NAME" --format "{{.State.Health.Status}}" 2>/dev/null || echo "unknown")
if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "starting" ]; then
  echo "Deploy OK: $APP_NAME is $STATUS"
else
  echo "Deploy WARNING: $APP_NAME status is $STATUS"
  docker logs --tail 20 "$APP_NAME" 2>&1
  exit 1
fi

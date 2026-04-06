#!/usr/bin/env bash
set -euo pipefail

APP_NAME="trafico-live"
IMAGE="trafico-web:latest"
ENV_FILE="/opt/apps/trafico-live/.env"

echo "Building $IMAGE..."
DOCKER_BUILDKIT=0 docker build -f Dockerfile -t "$IMAGE" .

echo "Stopping old container..."
docker stop "$APP_NAME" 2>/dev/null || true
docker rm "$APP_NAME" 2>/dev/null || true

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
  --health-cmd "node -e \"fetch(http://localhost:3000/api/health).then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))\"" \
  --health-interval 30s \
  --health-timeout 5s \
  --health-start-period 30s \
  --health-retries 3 \
  "$IMAGE"

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

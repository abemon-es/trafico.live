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
  --build-arg GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)" \
  -f Dockerfile -t "$IMAGE" .

# ─── Zero-downtime swap ───────────────────────────────────────────────────────
#
# The old sequence was `docker rm -f` then `docker run`, so the site was down
# for the whole of container start + Next.js boot. Two consequences, both
# observed on 2026-08-16: the infra monitoring repeatedly opened incidents for
# ~30 s gaps that were simply deploys, and a build that produced a broken image
# took production down with it because the healthy container had already been
# destroyed.
#
# Now the new container is started alongside, kept off the `web` network so
# Traefik cannot route to it, and only joined once it actually serves traffic.
# The old container is not touched until then, so a bad image costs nothing.
NEW="${APP_NAME}-next"
HEALTH_TIMEOUT=240

# Recover from a deploy that died between retiring the old container and the
# rename: the live name is gone but the staging container is the one actually
# serving. Adopt it instead of destroying production.
if ! docker inspect "$APP_NAME" >/dev/null 2>&1 && docker inspect "$NEW" >/dev/null 2>&1; then
  echo "Recovering: $NEW is serving under the staging name — renaming to $APP_NAME"
  docker rename "$NEW" "$APP_NAME"
fi

docker rm -f "$NEW" 2>/dev/null || true   # leftover from an aborted deploy

echo "Starting $NEW (off the web network until it is healthy)..."
docker run -d \
  --name "$NEW" \
  --restart unless-stopped \
  --network trafico-routing \
  --env-file "$ENV_FILE" \
  -e NODE_ENV=production \
  --memory 4096m \
  --memory-reservation 1024m \
  -l "traefik.enable=true" \
  -l "traefik.docker.network=web" \
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

# Ask the app directly rather than waiting on Docker's 30 s healthcheck cadence.
echo "Waiting for $NEW to serve /api/health (timeout ${HEALTH_TIMEOUT}s)..."
READY=0
for _ in $(seq 1 $((HEALTH_TIMEOUT / 3))); do
  if docker exec "$NEW" node -e \
      "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 3
done

if [ "$READY" != "1" ]; then
  echo "Deploy ABORTED: $NEW never became healthy — leaving the running container untouched"
  docker logs --tail 30 "$NEW" 2>&1
  docker rm -f "$NEW" 2>/dev/null || true
  exit 1
fi

echo "$NEW is serving — joining the web network so Traefik routes to it..."
docker network connect web "$NEW"

# Both containers now back the same Traefik service, so requests are served
# throughout the swap — but only once Traefik has actually noticed the new one.
# It learns from the Docker event stream, which is fast but not instantaneous,
# and removing the old container before that lands leaves the load balancer
# pointing at a backend that no longer exists. Being on the network and being
# routed to are not the same thing.
echo "Letting Traefik pick up $NEW before retiring the old container..."
sleep 5

echo "Retiring previous container..."
docker rm -f "$APP_NAME" 2>/dev/null || true

# Wait for the name to actually free up before claiming it. A failed rename
# would leave production running under the staging name, which the next deploy
# treats as a leftover and destroys.
for _ in $(seq 1 10); do
  docker inspect "$APP_NAME" >/dev/null 2>&1 || break
  sleep 1
done

if ! docker rename "$NEW" "$APP_NAME"; then
  echo "Deploy WARNING: $NEW is serving correctly but could not be renamed to $APP_NAME."
  echo "Traffic is fine; fix the name before the next deploy or it will be treated as a leftover."
  exit 1
fi

echo "Deploy OK: $APP_NAME swapped in with no gap in service"

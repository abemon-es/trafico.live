# OTP 2 — OpenTripPlanner multimodal routing for trafico.live
#
# Bundles only the router config; the graph is built externally by
# build-graph.sh and mounted at runtime.
#
# Runtime:
#   docker compose up -d otp
#   (compose passes: --load --serve /var/opentripplanner)
#
# The base image ships its own entrypoint that invokes OTP; we pass flags
# via the command field in docker-compose.otp.yml (no ENTRYPOINT override
# to avoid coupling to upstream jar path changes).

FROM opentripplanner/opentripplanner:latest

# OTP2 looks for {router-config,build-config}.json alongside graph.obj in the
# directory passed via --load / --build. We use /var/opentripplanner (the
# image's standard data path) with no sub-router (single default router).
COPY config/router-config.json /var/opentripplanner/router-config.json
COPY config/build-config.json  /var/opentripplanner/build-config.json

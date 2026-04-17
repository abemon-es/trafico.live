# OTP 2.5 — OpenTripPlanner multimodal routing for trafico.live
#
# Build image bundles only the router config.  The graph itself is built
# externally by build-graph.sh and mounted at runtime from the host at
# /var/otp/graphs/iberia/.
#
# Graph build (separate step, not in this image):
#   build-graph.sh → /var/otp/graphs/iberia/graph.obj
#
# Runtime:
#   java -Xmx7G -jar otp-shaded.jar --load /var/otp/graphs/iberia
#   Exposes HTTP API on :8080.

FROM opentripplanner/opentripplanner:latest

# Copy router configuration into the default graph directory.
# OTP2 looks for router-config.json + build-config.json alongside graph.obj.
COPY config/router-config.json /var/otp/graphs/iberia/router-config.json
COPY config/build-config.json  /var/otp/graphs/iberia/build-config.json

# OTP2 runtime entrypoint — load a pre-built graph and serve.
# Graph file (graph.obj) must be present at container start via volume mount.
ENTRYPOINT ["java", "-Xmx7G", "-jar", "/opt/opentrip-planner.jar", \
            "--load", "/var/otp/graphs/iberia"]

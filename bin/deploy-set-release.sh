#!/usr/bin/env bash
# deploy-set-release.sh
#
# Emit the SENTRY_RELEASE env var for the current commit.
# Usage in the deploy webhook (before `next build`):
#
#   source <(bin/deploy-set-release.sh)
#   npm run build
#
# Or inline:
#   export $(bin/deploy-set-release.sh)
#
# The value follows the format: trafico-live@<short-sha>
# which matches the release string injected into withSentryConfig (next.config.ts)
# and all three Sentry.init() calls.
#
set -euo pipefail

SHA=$(git rev-parse --short HEAD)
echo "SENTRY_RELEASE=trafico-live@${SHA}"

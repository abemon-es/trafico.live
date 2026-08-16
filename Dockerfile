FROM node:24-slim AS builder

WORKDIR /app

COPY . .

# Install all deps including devDeps for build tools
RUN npm install --ignore-scripts --include=dev

# Remove prisma.config.ts to avoid dotenv/ts-node issues during generate
# prisma generate uses schema.prisma directly
RUN mv prisma.config.ts prisma.config.ts.bak || true
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/db" npx prisma generate

ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build with a real DATABASE_URL when deploy.sh supplies one as a BuildKit
# secret, so the ~177 pages that query Postgres prerender with actual data
# instead of baking empty HTML into the image (see deploy.sh for the full
# rationale). The guard keeps local/CI builds without the secret working
# exactly as before.
# Write the secret to .env.production.local rather than only exporting it.
#
# Next.js runs static generation in worker processes that do NOT inherit an
# ad-hoc shell variable: with `DATABASE_URL=... npm run build` the parent shell
# had the value while 63 workers still logged "DATABASE_URL not set at init"
# and every DB-backed page prerendered empty. Next loads .env.production.local
# itself, so the value reaches every worker. Exported too, belt and braces.
#
# The file is created and removed inside this single layer, so the credential
# never reaches the runtime image (which copies only .next, node_modules,
# package.json, public, prisma and data).
RUN --mount=type=secret,id=database_url,required=false \
    echo "[build] secret path exists: $([ -e /run/secrets/database_url ] && echo yes || echo no), size: $(wc -c < /run/secrets/database_url 2>/dev/null || echo 0)"; \
    if [ -s /run/secrets/database_url ]; then \
      printf 'DATABASE_URL=%s\n' "$(cat /run/secrets/database_url)" > .env.production.local; \
      export DATABASE_URL="$(cat /run/secrets/database_url)"; \
      echo "[build] prerendering WITH database"; \
    else \
      echo "[build] prerendering WITHOUT database — DB-backed pages will be empty until ISR heals them"; \
    fi; \
    npm run build; \
    rm -f .env.production.local

FROM node:24-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl wget && \
    rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts.bak ./prisma.config.ts
COPY --from=builder /app/data ./data

RUN chown -R nextjs:nodejs .next && \
    chown -R nextjs:nodejs node_modules/.prisma node_modules/@prisma

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)throw new Error();process.exit(0)}).catch(()=>process.exit(1))"

# Run migrations with MIGRATE_DATABASE_URL overriding DATABASE_URL so Prisma
# connects directly to postgres (bypassing pgbouncer). pgbouncer transaction pooling
# is incompatible with session-level advisory locks that prisma migrate deploy uses.
# Falls back to DATABASE_URL if MIGRATE_DATABASE_URL is not set.
# See: https://pris.ly/d/migrate-advisory-locking
CMD ["sh", "-c", "DATABASE_URL=${MIGRATE_DATABASE_URL:-$DATABASE_URL} npx prisma migrate deploy 2>&1 || echo '[migrate] Skipped'; exec su -s /bin/sh nextjs -c 'npm start'"]

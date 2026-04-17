FROM node:24-slim AS builder

WORKDIR /app

COPY . .

# Install all deps including devDeps for build tools
RUN npm install --ignore-scripts --include=dev

# Remove prisma.config.ts to avoid dotenv/ts-node issues during generate
# prisma generate uses schema.prisma directly
RUN mv prisma.config.ts prisma.config.ts.bak || true
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/db" \
    MIGRATE_DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/db" \
    npx prisma generate

ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

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

# Run migrations using MIGRATE_DATABASE_URL (direct postgres, bypasses pgbouncer)
# so the session-level advisory lock is properly released after migrate completes.
# Falls back to DATABASE_URL if MIGRATE_DATABASE_URL is not set.
# See: https://pris.ly/d/migrate-advisory-locking
CMD ["sh", "-c", "MIGRATE_DATABASE_URL=${MIGRATE_DATABASE_URL:-$DATABASE_URL} npx prisma migrate deploy 2>&1 || echo '[migrate] Skipped'; exec su -s /bin/sh nextjs -c 'npm start'"]

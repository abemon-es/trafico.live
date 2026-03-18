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
RUN npm run build

FROM node:24-slim AS runtime

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]

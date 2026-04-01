# Stage 1: Install deps + generate Prisma client
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files first (layer cache)
COPY services/collector/package.json services/collector/package-lock.json* ./
RUN npm ci --omit=dev

# Generate Prisma client
COPY prisma/schema.prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Stage 2: Runtime image
FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 collector && \
    adduser --system --uid 1001 collector

# Copy deps + prisma from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Copy source code (changes often — last layer)
COPY services/collector/ ./

ENV TZ=Europe/Madrid
ENV NODE_ENV=production

USER collector

ENTRYPOINT []
CMD ["npx", "tsx", "index.ts"]

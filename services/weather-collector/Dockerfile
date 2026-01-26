# Weather Collector Service
# Runs every 30 minutes via Railway cron to update AEMET weather alerts
# Build cache bust: 2026-01-26-v2

FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and config
COPY schema.prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma client
RUN npx prisma generate

# Copy collector scripts
COPY collector.ts ./
COPY aemet-parser.ts ./

# Run collector
CMD ["npx", "tsx", "collector.ts"]

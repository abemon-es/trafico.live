# Weather Collector Service
# Runs every 30 minutes via Railway cron to update AEMET weather alerts

FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files from service
COPY services/weather-collector/package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema from root project
COPY prisma/schema.prisma ./prisma/
COPY prisma/prisma.config.ts ./prisma/ 2>/dev/null || true

# Generate Prisma client
RUN npx prisma generate

# Copy collector scripts
COPY services/weather-collector/collector.ts ./
COPY services/weather-collector/aemet-parser.ts ./

# Run collector
CMD ["npx", "tsx", "collector.ts"]

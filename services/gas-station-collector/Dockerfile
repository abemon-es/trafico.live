# Gas Station Collector Service
# Runs 3x daily via Railway cron

FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files from main project
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and config from root project
COPY prisma/schema.prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma client
RUN npx prisma generate

# Copy collector scripts
COPY services/gas-station-collector/*.ts ./

# Run all collectors
CMD ["sh", "-c", "npx tsx collector.ts && npx tsx maritime.ts && npx tsx aggregator.ts"]

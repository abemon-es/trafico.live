# Radar Collector Service
# Runs daily via Railway cron to update speed camera data

FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema from root project
COPY prisma/schema.prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy collector script
COPY services/radar-collector/collector.ts ./

# Run collector
CMD ["npx", "tsx", "collector.ts"]

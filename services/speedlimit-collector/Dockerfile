# Speed Limit Collector Service
# Runs weekly via Railway cron (speed limits rarely change)

FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and config from root project
COPY prisma/schema.prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma client
RUN npx prisma generate

# Copy collector script
COPY services/speedlimit-collector/collector.ts ./

# Run collector
CMD ["npx", "tsx", "collector.ts"]

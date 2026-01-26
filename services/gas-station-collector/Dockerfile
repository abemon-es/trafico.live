# Gas Station Collector Service
# Runs 3x daily via Railway cron

FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY schema.prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy collector scripts
COPY *.ts ./

# Sync schema and run all collectors
CMD ["sh", "-c", "npx prisma db push && npx tsx collector.ts && npx tsx maritime.ts && npx tsx aggregator.ts"]

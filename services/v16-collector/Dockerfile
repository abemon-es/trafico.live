FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY services/v16-collector/package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema, config and generate client
COPY prisma/schema.prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy service code
COPY services/v16-collector/*.ts ./

# Set timezone
ENV TZ=Europe/Madrid

ENTRYPOINT []
CMD ["npm", "start"]

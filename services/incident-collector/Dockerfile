FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files from incident-collector service
COPY services/incident-collector/package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and generate client
COPY prisma/schema.prisma ./prisma/
RUN npx prisma generate

# Copy service code
COPY services/incident-collector/*.ts ./

# Set timezone
ENV TZ=Europe/Madrid

ENTRYPOINT []
CMD ["npm", "start"]

FROM node:24-slim AS builder

WORKDIR /app

COPY . .
RUN npm install --ignore-scripts
RUN npx prisma generate --schema=./prisma/schema.prisma
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

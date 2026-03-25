import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  const skipDb = process.env.SKIP_DB === "true";

  if (!connectionString || skipDb) {
    // During build time, DATABASE_URL may not be available.
    // Return a proxy that throws on actual DB access but allows
    // module-level imports without crashing the build.
    console.warn("[db] DATABASE_URL not set — DB queries will fail at runtime");
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "then" || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined;
        return new Proxy(() => {}, {
          get() { return () => Promise.reject(new Error("DATABASE_URL not configured")); },
          apply() { return Promise.reject(new Error("DATABASE_URL not configured")); },
        });
      },
    }) as PrismaClient;
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

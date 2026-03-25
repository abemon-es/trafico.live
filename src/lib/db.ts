import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // During build time, DATABASE_URL may not be available.
    // Return a proxy that resolves with empty/null data instead of throwing,
    // so pages can render empty shells at build time and fill via ISR.
    console.warn("[db] DATABASE_URL not set — DB queries will fail at runtime");

    const emptyResult = () => Promise.resolve(null);
    const emptyArray = () => Promise.resolve([]);
    const zeroCount = () => Promise.resolve(0);

    const modelProxy = new Proxy({}, {
      get(_target, method) {
        if (method === "then" || method === Symbol.toPrimitive || method === Symbol.toStringTag) return undefined;
        // Return appropriate empty values for common Prisma methods
        if (method === "count") return zeroCount;
        if (method === "findMany" || method === "groupBy") return emptyArray;
        if (method === "findFirst" || method === "findUnique") return emptyResult;
        if (method === "aggregate") return () => Promise.resolve({ _count: 0, _sum: {}, _avg: {}, _min: {}, _max: {} });
        if (method === "create" || method === "update" || method === "delete") return emptyResult;
        // Default: return a function that resolves to null
        return emptyResult;
      },
    });

    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "then" || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined;
        if (prop === "$connect" || prop === "$disconnect") return () => Promise.resolve();
        if (prop === "$transaction") return (fn: unknown) => typeof fn === "function" ? fn(new Proxy({}, { get: () => modelProxy })) : Promise.resolve([]);
        return modelProxy;
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

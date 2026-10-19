import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as Sentry from "@sentry/nextjs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isUsableDatabaseUrl(url: string | undefined): url is string {
  return !!url && !url.includes("placeholder") && !url.includes("localhost:5432/db");
}

/**
 * True when there is no real database: the Docker `next build`, where the
 * client below is a stub that answers every query with nothing.
 *
 * Use it as the first line of every DB-backed page's generateStaticParams
 * (`if (isBuildWithoutDb()) return [];`). A page prerendered from the stub ships
 * empty, and where "no rows" means notFound() or noindex it ships as a 404 or
 * a noindex page. That copy is served from the ISR cache after every deploy
 * until a visit revalidates it, and the visit that triggers it still gets the
 * stale copy. Seen 2026-10-19: /camaras/<city> served noindex,
 * /peajes/operador/* served "Página no encontrada". With [] those paths render
 * on their first request, with data, and are cached from then on.
 */
export function isBuildWithoutDb(): boolean {
  return !isUsableDatabaseUrl(process.env.DATABASE_URL);
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!isUsableDatabaseUrl(connectionString)) {
    // During build time (Coolify runs `DATABASE_URL='' next build`),
    // return a lazy proxy that re-checks DATABASE_URL on each access.
    // At runtime, DATABASE_URL is set and we create a real client.
    console.warn("[db] DATABASE_URL not set at init — will retry at runtime");

    let realClient: PrismaClient | null = null;

    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        // Check if DATABASE_URL is now available (runtime vs build time)
        if (!realClient && process.env.DATABASE_URL) {
          realClient = createRealClient(process.env.DATABASE_URL);
        }
        if (realClient) {
          return (realClient as unknown as Record<string | symbol, unknown>)[prop];
        }
        // Still no DB — return safe empty stubs for build-time rendering
        if (prop === "then" || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined;
        if (prop === "$connect" || prop === "$disconnect") return () => Promise.resolve();
        if (prop === "$queryRaw" || prop === "$queryRawUnsafe" || prop === "$executeRaw" || prop === "$executeRawUnsafe") return () => Promise.resolve([]);
        const emptyModel = new Proxy({}, {
          get(_t, method) {
            if (method === "then" || method === Symbol.toPrimitive || method === Symbol.toStringTag) return undefined;
            if (method === "count") return () => Promise.resolve(0);
            if (method === "findMany" || method === "groupBy") return () => Promise.resolve([]);
            if (method === "findFirst" || method === "findUnique") return () => Promise.resolve(null);
            if (method === "aggregate") return () => Promise.resolve({ _count: 0, _sum: {}, _avg: {}, _min: {}, _max: {} });
            return () => Promise.resolve(null);
          },
        });
        return emptyModel;
      },
    }) as PrismaClient;
  }

  return createRealClient(connectionString);
}

function createRealClient(connectionString: string): PrismaClient {
  const pool = new Pool({
    connectionString,
    max: 25,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("[db] Pool error:", err.message);
    Sentry.captureException(err, { tags: { layer: "database" } });
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

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { KeysTable } from "@/components/dashboard/KeysTable";
import type { ApiTierName } from "@/lib/api-tiers";
import type { ApiKeyRow } from "@/components/dashboard/KeysTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claves API — Panel de control",
  robots: { index: false, follow: true },
};

function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

export default async function KeysPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [rawKeys, topKeyRow] = await Promise.all([
    prisma.apiKey.findMany({
      where: { email, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        tier: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        rateLimitPerDay: true,
        usage: {
          where: { date: { gte: today } },
          select: { requestCount: true },
        },
      },
    }),

    prisma.apiKey.findFirst({
      where: { email, isActive: true },
      orderBy: { tier: "desc" },
      select: { tier: true },
    }),
  ]);

  const userTier = (topKeyRow?.tier ?? "FREE") as ApiTierName;

  const keys: ApiKeyRow[] = rawKeys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPreview: maskKey(k.key),
    tier: k.tier as ApiTierName,
    isActive: k.isActive,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
    requestsToday: k.usage.reduce((s, u) => s + u.requestCount, 0),
    rateLimitPerDay: k.rateLimitPerDay,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-700 text-foreground">Claves API</h1>
        <p className="text-sm text-tl-500 font-body mt-1">
          Gestiona las claves de acceso a la API de trafico.live
        </p>
      </div>

      {/* Security notice */}
      <div className="rounded-lg bg-tl-50 dark:bg-tl-900/40 border border-tl-200 dark:border-tl-800 px-4 py-3">
        <p className="text-xs text-tl-600 dark:text-tl-300 font-body">
          <strong>Seguridad:</strong> Las claves se muestran enmascaradas. Incluye la cabecera{" "}
          <code className="font-mono bg-tl-100 dark:bg-tl-800 px-1 py-0.5 rounded text-xs">
            x-api-key: tu_clave
          </code>{" "}
          en cada petición a la API.
        </p>
      </div>

      <KeysTable initialKeys={keys} userTier={userTier} />
    </div>
  );
}

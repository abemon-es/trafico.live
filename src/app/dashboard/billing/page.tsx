import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { CreditCard, ExternalLink, Zap } from "lucide-react";
import { PlanCard } from "@/components/dashboard/PlanCard";
import { InvoicesList } from "@/components/dashboard/InvoicesList";
import type { ApiTierName } from "@/lib/api-tiers";
import { API_TIERS } from "@/lib/api-tiers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Facturación — Panel de control | trafico.live",
  robots: { index: false, follow: true },
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;

  const topKey = await prisma.apiKey.findFirst({
    where: { email, isActive: true },
    orderBy: { tier: "desc" },
    select: { tier: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });

  const tier = (topKey?.tier ?? "FREE") as ApiTierName;
  const tierConfig = API_TIERS[tier];
  const isFree = tier === "FREE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-700 text-foreground">Facturación</h1>
        <p className="text-sm text-tl-500 font-body mt-1">
          Gestiona tu suscripción y consulta el historial de pagos
        </p>
      </div>

      {/* Current plan */}
      <PlanCard
        tier={tier}
        stripeCustomerId={topKey?.stripeCustomerId}
      />

      {/* Upgrade section for free users */}
      {isFree && (
        <div className="rounded-xl border border-tl-amber-200 dark:border-tl-amber-800 bg-tl-amber-50 dark:bg-tl-amber-900/20 p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-tl-amber-100 dark:bg-tl-amber-900/40 shrink-0">
              <Zap className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-heading font-600 text-foreground mb-2">
                Actualiza a Pro
              </h2>
              <p className="text-sm text-tl-600 dark:text-tl-300 font-body mb-4">
                Accede a datos históricos, análisis de tendencias, flujos de movilidad O-D,
                microdata de accidentes y hasta{" "}
                <span className="font-mono font-500">
                  {new Intl.NumberFormat("es-ES").format(API_TIERS.PRO.rateLimitPerDay)}
                </span>{" "}
                peticiones diarias.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/api/billing?tier=PRO`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-amber-600 hover:bg-tl-amber-700 text-white text-sm font-medium transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Actualizar a Pro — {API_TIERS.PRO.priceMonthlyEur}€/mes
                </Link>
                <Link
                  href={`/api/billing?tier=ENTERPRISE`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-tl-amber-300 dark:border-tl-amber-700 text-tl-amber-700 dark:text-tl-amber-300 hover:bg-tl-amber-100 dark:hover:bg-tl-amber-900/30 text-sm font-medium transition-colors"
                >
                  Enterprise — {API_TIERS.ENTERPRISE.priceMonthlyEur}€/mes
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage subscription (paid plans) */}
      {!isFree && topKey?.stripeCustomerId && (
        <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-tl-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground font-body">Portal de suscripción</p>
              <p className="text-xs text-tl-500 font-body mt-0.5">
                Cambia de plan, actualiza el método de pago o cancela tu suscripción
              </p>
            </div>
          </div>
          <form action="/api/billing/portal" method="POST" className="shrink-0">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-medium transition-colors"
            >
              Gestionar suscripción
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* VAT info */}
      <div className="rounded-lg bg-tl-50 dark:bg-tl-900/40 border border-tl-100 dark:border-tl-800 px-4 py-3">
        <p className="text-xs text-tl-500 font-body">
          <strong>IVA:</strong> Los precios mostrados son sin IVA. Stripe Tax aplica
          automáticamente el IVA correspondiente a tu país de facturación (21% para España).
          Cada factura incluirá el desglose del IVA.
        </p>
      </div>

      {/* Invoices — server component, fetches Stripe data */}
      <InvoicesList stripeCustomerId={topKey?.stripeCustomerId} />
    </div>
  );
}

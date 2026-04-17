import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import type { ApiTierName } from "@/lib/api-tiers";
import { API_TIERS } from "@/lib/api-tiers";
import { TierBadge } from "./TierBadge";

interface PlanCardProps {
  tier: ApiTierName;
  nextBillingDate?: Date | null;
  stripeCustomerId?: string | null;
}

export function PlanCard({ tier, nextBillingDate, stripeCustomerId }: PlanCardProps) {
  const config = API_TIERS[tier];
  const isFree = tier === "FREE";
  const isEnterprise = tier === "ENTERPRISE";

  const formattedDate = nextBillingDate
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(
        nextBillingDate
      )
    : null;

  return (
    <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-tl-500 dark:text-tl-400 font-body mb-1">Plan actual</p>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xl font-heading font-700 text-foreground">
              {isFree ? "Gratuito" : isEnterprise ? "Enterprise" : "Pro"}
            </h2>
            <TierBadge tier={tier} size="md" />
          </div>
          {config.priceMonthlyEur ? (
            <p className="font-mono text-2xl font-500 text-foreground">
              {config.priceMonthlyEur}
              <span className="text-sm text-tl-500 font-body ml-1">€/mes</span>
            </p>
          ) : (
            <p className="font-mono text-2xl font-500 text-foreground">
              0 <span className="text-sm text-tl-500 font-body ml-1">€/mes</span>
            </p>
          )}
          {formattedDate && (
            <p className="text-sm text-tl-500 dark:text-tl-400 mt-1 font-body">
              Próxima facturación: {formattedDate}
            </p>
          )}
        </div>

        <div className="text-right space-y-1 shrink-0">
          <p className="text-xs text-tl-500 dark:text-tl-400 font-body">Límite diario</p>
          <p className="font-mono font-500 text-foreground text-sm">
            {config.rateLimitPerDay === Number.MAX_SAFE_INTEGER
              ? "Ilimitado"
              : new Intl.NumberFormat("es-ES").format(config.rateLimitPerDay)}{" "}
            <span className="text-tl-500 text-xs">req/día</span>
          </p>
          <p className="text-xs text-tl-500 dark:text-tl-400 font-body">
            {config.rateLimitPerMinute} req/min
          </p>
        </div>
      </div>

      {isFree && (
        <div className="mt-4 pt-4 border-t border-tl-100 dark:border-tl-800 flex items-center justify-between">
          <p className="text-sm text-tl-600 dark:text-tl-300 font-body">
            Actualiza para desbloquear datos históricos, análisis y más endpoints.
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-500 transition-colors shrink-0 ml-4"
          >
            <Zap className="w-4 h-4" />
            Actualizar
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {!isFree && stripeCustomerId && (
        <div className="mt-4 pt-4 border-t border-tl-100 dark:border-tl-800 flex justify-end">
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-500 transition-colors"
          >
            Gestionar suscripción
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import useSWR from "swr";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from "lucide-react";
import { fetcher } from "@/lib/fetcher";

interface TrafficComparisonProps {
  className?: string;
  showLink?: boolean;
}

interface ComparisonData {
  success: boolean;
  data: {
    current: {
      avgIntensity: number;
      avgServiceLevel: number;
      sensorCount: number;
      recordedAt: string;
    } | null;
    predicted: {
      avgIntensity: number;
      avgServiceLevel: number;
      sampleCount: number;
    };
    deviation: {
      intensityPercent: number;
      serviceLevelDelta: number;
      label: "below_normal" | "normal" | "above_normal" | "much_above_normal";
    };
  };
}

type DeviationLabel = "below_normal" | "normal" | "above_normal" | "much_above_normal";

const DEVIATION_CONFIG: Record<
  DeviationLabel,
  {
    textClass: string;
    borderClass: string;
    bgClass: string;
    Icon: React.ComponentType<{ className?: string }>;
    prefix: string;
    label: string;
  }
> = {
  below_normal: {
    textClass: "text-green-600 dark:text-green-400",
    borderClass: "border-l-4 border-green-500",
    bgClass: "bg-green-50 dark:bg-green-900/10",
    Icon: TrendingDown,
    prefix: "-",
    label: "por debajo de lo normal",
  },
  normal: {
    textClass: "text-tl-600 dark:text-tl-400",
    borderClass: "border-l-4 border-tl-500",
    bgClass: "bg-tl-50 dark:bg-tl-900/10",
    Icon: Minus,
    prefix: "",
    label: "dentro de lo normal",
  },
  above_normal: {
    textClass: "text-tl-amber-600 dark:text-tl-amber-400",
    borderClass: "border-l-4 border-tl-amber-500",
    bgClass: "bg-tl-amber-50 dark:bg-tl-amber-900/10",
    Icon: TrendingUp,
    prefix: "+",
    label: "por encima de lo normal",
  },
  much_above_normal: {
    textClass: "text-red-600 dark:text-red-400",
    borderClass: "border-l-4 border-red-500",
    bgClass: "bg-red-50 dark:bg-red-900/10",
    Icon: AlertTriangle,
    prefix: "+",
    label: "muy por encima de lo normal",
  },
};

export function TrafficComparison({ className = "", showLink = true }: TrafficComparisonProps) {
  const { data, error, isLoading } = useSWR<ComparisonData>(
    "/api/trafico/prediccion?mode=comparison",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className={`animate-pulse rounded-lg h-16 bg-gray-100 dark:bg-gray-800 ${className}`} />
    );
  }

  if (error || !data?.success || !data?.data) return null;

  const { current, predicted, deviation } = data.data;

  if (!current) return null;

  const absPercent = Math.abs(deviation.intensityPercent);
  if (absPercent < 10) return null;

  const config = DEVIATION_CONFIG[deviation.label];
  const { Icon, textClass, borderClass, bgClass, prefix, label } = config;

  const pctDisplay = `${prefix}${Math.round(absPercent)}%`;

  const textDescription =
    deviation.label === "normal"
      ? "El tráfico en Madrid está dentro de lo normal en este momento"
      : `El tráfico en Madrid está un ${Math.round(absPercent)}% ${label}`;

  return (
    <div
      className={`rounded-lg px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 ${borderClass} ${bgClass} ${className}`}
    >
      {/* Left: deviation number */}
      <div className={`flex items-center gap-2 shrink-0 ${textClass}`}>
        <Icon className="w-5 h-5" />
        <span className="text-2xl font-mono font-bold leading-none">{pctDisplay}</span>
      </div>

      {/* Center: description */}
      <p className="flex-1 min-w-[160px] text-sm text-gray-700 dark:text-gray-300">
        {textDescription}
      </p>

      {/* Right: actual vs normal */}
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Actual:{" "}
          <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
            {current.avgIntensity.toLocaleString("es-ES")} veh/h
          </span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Normal:{" "}
          <span className="font-mono text-gray-600 dark:text-gray-400">
            {predicted.avgIntensity.toLocaleString("es-ES")} veh/h
          </span>
        </p>
        {showLink && (
          <Link
            href="/prediccion-trafico"
            className={`inline-flex items-center gap-0.5 text-xs mt-1 hover:underline ${textClass}`}
          >
            Ver predicción completa <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

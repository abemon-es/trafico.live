import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Train, Construction, ArrowRight } from "lucide-react";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Trenes en Directo — GPS en Tiempo Real (próximamente) | trafico.live",
  description:
    "Mapa en tiempo real de la red ferroviaria Renfe: AVE, Alvia, Euromed, MD y Cercanías. Funcionalidad completa llegará en S2.",
  alternates: {
    canonical: `${BASE_URL}/trenes/live`,
  },
};

type Brand = "all" | "AVE" | "AVLO" | "Alvia" | "Euromed" | "MD" | "Cercanías";

const BRAND_FILTERS: Brand[] = ["all", "AVE", "AVLO", "Alvia", "Euromed", "MD", "Cercanías"];

export default function TrenesLivePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <section className="border-b border-tl-100 bg-tl-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex max-w-6xl items-center gap-3 text-sm">
          <Construction className="h-4 w-4 text-tl-600 dark:text-tl-300" aria-hidden />
          <p className="text-slate-700 dark:text-slate-300">
            <strong className="font-semibold">Scaffold S0.</strong> Funcionalidad completa llegará en S2.
          </p>
          <Link
            href="/trenes"
            className="ml-auto inline-flex items-center gap-1 font-medium text-tl-700 hover:text-tl-900 dark:text-tl-300 dark:hover:text-tl-100"
          >
            Ver /trenes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="relative h-[calc(100dvh-112px)] w-full">
        <TraficoMap
          preset="trenes"
          controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
          syncUrl
          initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
          className="h-full w-full"
        />
        <p className="sr-only">Mapa en tiempo real de la red ferroviaria española.</p>

        <aside className="absolute left-4 top-4 z-20 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-tl-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mb-3 flex items-center gap-2 text-tl-700 dark:text-tl-200">
            <Train className="h-4 w-4" />
            <span className="font-['Exo_2'] text-sm font-semibold">Marcas</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {BRAND_FILTERS.map((b) => (
              <button
                key={b}
                type="button"
                disabled
                className="cursor-not-allowed rounded-full bg-tl-50 px-2.5 py-1 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                title="Filtrado llegará en S2"
              >
                {b === "all" ? "Todas" : b}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
            Filtrado por marca en S2.
          </p>
        </aside>
      </section>
    </main>
  );
}

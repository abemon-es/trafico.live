import type { Metadata } from "next";
import Link from "next/link";
import { Construction, ArrowRight } from "lucide-react";
import { LiveMap } from "./LiveMap";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Trenes en Directo — GPS en Tiempo Real (próximamente) | trafico.live",
  description:
    "Mapa en tiempo real de la red ferroviaria Renfe: AVE, Alvia, Euromed, MD y Cercanías. Funcionalidad completa llegará en S2.",
  alternates: {
    canonical: `${BASE_URL}/trenes/live`,
  },
};

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

      <LiveMap />
    </main>
  );
}

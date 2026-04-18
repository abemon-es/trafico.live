import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Truck, BarChart3, Settings, LogOut, Map } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard Flotas — trafico.live",
  description: "Panel de control para la gestión de tu flota de vehículos.",
  robots: { index: false, follow: false },
};

interface FleetLayoutProps {
  children: ReactNode;
}

export default function FleetDashboardLayout({ children }: FleetLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-tl-50 dark:bg-tl-950">
      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center gap-4 px-6 bg-white dark:bg-tl-900 border-b border-tl-100 dark:border-tl-800 shrink-0 z-50">
        <Link href="/" className="flex items-center gap-2 mr-auto">
          <Truck className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          <span className="font-heading font-bold text-sm text-foreground">trafico.live</span>
          <span className="text-foreground/20">/</span>
          <span className="text-sm text-foreground/60">Flotas</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/flotas/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground/70 hover:bg-tl-50 dark:hover:bg-tl-800 hover:text-foreground transition-colors"
          >
            <Map className="w-4 h-4" />
            Mapa
          </Link>
          <Link
            href="/flotas/dashboard/reports"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground/70 hover:bg-tl-50 dark:hover:bg-tl-800 hover:text-foreground transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Informes
          </Link>
          <Link
            href="/flotas/dashboard/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground/70 hover:bg-tl-50 dark:hover:bg-tl-800 hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            Ajustes
          </Link>
        </nav>

        <Link
          href="/api/auth/signout"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground/50 hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </Link>
      </header>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import {
  AlertTriangle,
  Camera,
  MapPin,
  Mountain,
  Navigation,
  Globe,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic"; // SSR on every request (no ISR cache)
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Tráfico en Andorra — Incidencias y Cámaras en Directo",
  description:
    "Estado del tráfico en Andorra en tiempo real. Cámaras de tráfico, incidencias y estado de las carreteras. Datos de mobilitat.ad.",
  alternates: {
    canonical: `${BASE_URL}/andorra`,
  },
  openGraph: {
    title: "Tráfico en Andorra — Incidencias y Cámaras en Directo",
    description:
      "Estado del tráfico en Andorra en tiempo real. Cámaras de tráfico, incidencias y estado de las carreteras. Datos de mobilitat.ad.",
    url: `${BASE_URL}/andorra`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Nearby Spanish provinces
// ---------------------------------------------------------------------------

const NEARBY_PROVINCES = [
  { code: "25", name: "Lleida" },
  { code: "08", name: "Barcelona" },
  { code: "17", name: "Girona" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryColor(category: string): {
  bg: string;
  badge: string;
  border: string;
} {
  switch (category.toUpperCase()) {
    case "VERMELL":
    case "RED":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        border: "border-red-300 dark:border-red-800/50",
      };
    case "TARONJA":
    case "ORANGE":
      return {
        bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
        badge:
          "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
        border: "border-tl-amber-300 dark:border-tl-amber-800/50",
      };
    case "GROC":
    case "YELLOW":
      return {
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
        border: "border-yellow-300 dark:border-yellow-800/50",
      };
    default:
      return {
        bg: "bg-tl-sea-50 dark:bg-tl-sea-900/20",
        badge: "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
        border: "border-tl-sea-200 dark:border-tl-sea-800/50",
      };
  }
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    VERMELL: "Rojo — Alta gravedad",
    TARONJA: "Naranja — Media gravedad",
    GROC: "Amarillo — Baja gravedad",
    BLAU: "Informativo",
  };
  return map[category.toUpperCase()] ?? category;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getAndorraData() {
  const [incidents, cameras] = await Promise.all([
    prisma.andorraIncident.findMany({
      where: { isActive: true },
      orderBy: [{ startedAt: "desc" }],
      select: {
        id: true,
        sourceId: true,
        category: true,
        title: true,
        description: true,
        latitude: true,
        longitude: true,
        startedAt: true,
        endedAt: true,
      },
    }),

    prisma.andorraCamera.findMany({
      where: { isActive: true },
      orderBy: [{ route: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        elevation: true,
        route: true,
        imageUrl: true,
      },
    }),
  ]);

  return { incidents, cameras };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AndorraPage() {
  const { incidents, cameras } = await getAndorraData();

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Tráfico en Andorra — Incidencias y Cámaras en Directo",
    description:
      "Estado del tráfico en Andorra en tiempo real con cámaras de tráfico e incidencias de mobilitat.ad.",
    url: `${BASE_URL}/andorra`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  // Group cameras by route
  const camerasByRoute: Record<string, typeof cameras> = {};
  for (const cam of cameras) {
    const route = cam.route ?? "Otras";
    if (!camerasByRoute[route]) camerasByRoute[route] = [];
    camerasByRoute[route].push(cam);
  }
  const routes = Object.keys(camerasByRoute).sort();

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Andorra", href: "/andorra" },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-600) 60%, var(--color-tl-sea-500) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-0 left-1/3 w-56 h-56 rounded-full opacity-5"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Mountain className="w-10 h-10 text-tl-sea-200" />
            <span className="font-heading text-tl-sea-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Andorra
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Tráfico en Andorra
          </h1>
          <p className="text-tl-sea-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            Estado en tiempo real de la red viaria andorrana. Incidencias y cámaras de
            tráfico de las carreteras principales: CG1, CG2, CS, CS2 y más.
          </p>

          <div className="flex flex-wrap gap-6 mt-8 text-tl-sea-200 text-sm">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>
                <strong className="text-white">{incidents.length}</strong> incidencias activas
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              <span>
                <strong className="text-white">{cameras.length}</strong> cámaras activas
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Live incidents                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Incidencias activas en Andorra">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
              Incidencias activas
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300">
              <span className="w-1.5 h-1.5 rounded-full bg-tl-sea-500 animate-pulse" />
              En directo
            </span>
          </div>

          {incidents.length === 0 ? (
            <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 p-8 text-center bg-tl-sea-50 dark:bg-tl-sea-900/20">
              <Navigation className="w-10 h-10 text-tl-sea-400 mx-auto mb-3" />
              <p className="font-heading font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Sin incidencias activas
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                La circulación en Andorra transcurre con normalidad.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {incidents.map((inc) => {
                const colors = categoryColor(inc.category);
                return (
                  <div
                    key={inc.id}
                    className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-heading font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                        {inc.title}
                      </span>
                      <span
                        className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}
                      >
                        {categoryLabel(inc.category)}
                      </span>
                    </div>
                    {inc.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                        {inc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        Desde{" "}
                        {new Date(inc.startedAt).toLocaleString("es-ES", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Fuente: mobilitat.ad · Datos actualizados cada 5 minutos
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Traffic cameras                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Cámaras de tráfico en Andorra">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Cámaras de tráfico
          </h2>

          {cameras.length === 0 ? (
            <div className="rounded-xl border border-tl-200 dark:border-tl-800/50 p-8 text-center bg-tl-50 dark:bg-tl-950/30">
              <Camera className="w-10 h-10 text-tl-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No hay cámaras activas en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {routes.map((route) => (
                <div key={route}>
                  <h3 className="font-heading font-semibold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                    <Navigation className="w-4 h-4 text-tl-500 dark:text-tl-400" />
                    {route === "Otras" ? "Otras carreteras" : `Carretera ${route}`}
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                      ({camerasByRoute[route].length} cámara{camerasByRoute[route].length !== 1 ? "s" : ""})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {camerasByRoute[route].map((cam) => (
                      <div
                        key={cam.id}
                        className="rounded-xl border overflow-hidden bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50 hover:shadow-md transition-shadow"
                      >
                        {/* Camera image */}
                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <Image
                            src={cam.imageUrl}
                            alt={`Cámara de tráfico ${cam.name}${cam.route ? ` en ${cam.route}` : ""}`}
                            fill
                            className="object-cover"
                            loading="lazy"
                            unoptimized
                          />
                        </div>

                        {/* Camera info */}
                        <div className="p-3">
                          <p className="font-heading font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                            {cam.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                            {cam.route && (
                              <span className="inline-flex items-center gap-1">
                                <Navigation className="w-3 h-3" />
                                {cam.route}
                              </span>
                            )}
                            {cam.elevation != null && (
                              <span className="inline-flex items-center gap-1">
                                <Mountain className="w-3 h-3" />
                                {cam.elevation} m
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {cam.latitude.toFixed(4)}, {cam.longitude.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Fuente: mobilitat.ad · Imágenes actualizadas periódicamente
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Cross-border links                                                */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Provincias españolas cercanas a Andorra">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Provincias limítrofes en España
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Consulta el tráfico en las provincias españolas con acceso a Andorra.
          </p>
          <div className="flex flex-wrap gap-3">
            {NEARBY_PROVINCES.map((p) => (
              <Link
                key={p.code}
                href={`/provincias/${p.code}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50 text-tl-700 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-950/30 hover:border-tl-400 dark:hover:border-tl-600"
              >
                <MapPin className="w-3.5 h-3.5" />
                {p.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Attribution */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Datos de tráfico y cámaras proporcionados por{" "}
            <a
              href="https://www.mobilitat.ad"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              mobilitat.ad
            </a>{" "}
            · Ministerio de Presidencia, Economía y Empresa del Principat d&apos;Andorra
          </p>
          <Link
            href="/"
            className="text-sm text-tl-600 dark:text-tl-400 hover:underline flex items-center gap-1 font-medium ml-4"
          >
            <Globe className="w-4 h-4" />
            España
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </>
  );
}

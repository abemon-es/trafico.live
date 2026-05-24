/**
 * /calidad-aire/prevision — 5-day air-quality forecast (CAMS)
 *
 * Renders the AQForecast table populated by the `cams-aq` collector
 * (refreshed every 12h from Copernicus Atmosphere Monitoring Service).
 * Currently the only AQ-forecast surface on trafico.live — MITECO and
 * other Spanish sources only publish the current hour.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Wind,
  Cloud,
  Calendar,
  Activity,
  ArrowLeft,
  Info,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 21600; // 6h — slightly less than the 12h CAMS cadence

// ---------------------------------------------------------------------------
// Province metadata (the same 50-gridpoint catalog the API uses)
// ---------------------------------------------------------------------------

const PROVINCE_NAMES: Record<string, string> = {
  "28": "Madrid", "08": "Barcelona", "46": "Valencia", "41": "Sevilla",
  "14": "Córdoba", "29": "Málaga", "23": "Jaén", "30": "Murcia",
  "03": "Alicante", "12": "Castellón", "50": "Zaragoza", "20": "Gipuzkoa",
  "48": "Bizkaia", "15": "A Coruña", "27": "Lugo", "36": "Pontevedra",
  "33": "Asturias", "39": "Cantabria", "01": "Álava", "31": "Navarra",
  "26": "La Rioja", "09": "Burgos", "47": "Valladolid", "37": "Salamanca",
  "24": "León", "34": "Palencia", "42": "Soria", "40": "Segovia",
  "05": "Ávila", "10": "Cáceres", "06": "Badajoz", "13": "Ciudad Real",
  "45": "Toledo", "02": "Albacete", "16": "Cuenca", "19": "Guadalajara",
  "07": "Baleares", "35": "Las Palmas", "38": "S.C. Tenerife",
  "11": "Cádiz", "21": "Huelva", "04": "Almería", "18": "Granada",
  "22": "Huesca", "44": "Teruel", "17": "Girona", "25": "Lleida",
  "43": "Tarragona", "32": "Ourense", "49": "Zamora", "51": "Ceuta", "52": "Melilla",
};

// ICA 1-6 per MITECO (1 = good, 6 = extremely bad)
const ICA_CONFIG: Record<number, { label: string; bg: string; fg: string }> = {
  1: { label: "Buena", bg: "rgba(20,184,166,0.15)", fg: "rgb(15,118,110)" },
  2: { label: "Razonablemente buena", bg: "rgba(132,204,22,0.18)", fg: "rgb(101,163,13)" },
  3: { label: "Regular", bg: "rgba(234,179,8,0.18)", fg: "rgb(161,98,7)" },
  4: { label: "Desfavorable", bg: "rgba(249,115,22,0.18)", fg: "rgb(194,65,12)" },
  5: { label: "Muy desfavorable", bg: "rgba(220,38,38,0.18)", fg: "rgb(185,28,28)" },
  6: { label: "Extremadamente desfavorable", bg: "rgba(124,45,18,0.25)", fg: "rgb(124,45,18)" },
};

function icaCell(value: number | null | undefined): { text: string; style: React.CSSProperties } {
  if (!value || !ICA_CONFIG[value]) {
    return { text: "—", style: { color: "#94a3b8" } };
  }
  const c = ICA_CONFIG[value];
  return {
    text: c.label,
    style: { background: c.bg, color: c.fg },
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getForecast() {
  // Pull the latest forecast batch — anything issued in the last 18h
  const cutoff = new Date(Date.now() - 18 * 60 * 60 * 1000);

  const rows = await prisma.aQForecast.findMany({
    where: {
      forecastAt: { gte: cutoff },
      province: { not: null },
    },
    select: {
      province: true,
      validAt: true,
      icaExpected: true,
      no2: true,
      pm10: true,
      pm25: true,
      o3: true,
    },
    orderBy: [{ province: "asc" }, { validAt: "asc" }],
  });

  if (rows.length === 0) {
    return { byProvince: new Map(), days: [], rowCount: 0 };
  }

  // Bucket by day (UTC date) within each province; collapse multiple
  // gridpoints / horizons per province×day by taking the WORST (highest) ICA.
  type DayCell = { ica: number | null; no2: number | null; pm10: number | null; pm25: number | null; o3: number | null };
  const byProvince = new Map<string, Map<string, DayCell>>();
  const daySet = new Set<string>();

  for (const r of rows) {
    if (!r.province) continue;
    const day = r.validAt.toISOString().slice(0, 10);
    daySet.add(day);
    const pMap = byProvince.get(r.province) ?? new Map<string, DayCell>();
    const prev = pMap.get(day) ?? { ica: null, no2: null, pm10: null, pm25: null, o3: null };
    const worseIca = r.icaExpected != null && (prev.ica == null || r.icaExpected > prev.ica) ? r.icaExpected : prev.ica;
    pMap.set(day, {
      ica: worseIca,
      no2: maxOrNull(prev.no2, r.no2),
      pm10: maxOrNull(prev.pm10, r.pm10),
      pm25: maxOrNull(prev.pm25, r.pm25),
      o3: maxOrNull(prev.o3, r.o3),
    });
    byProvince.set(r.province, pMap);
  }

  const days = Array.from(daySet).sort().slice(0, 5);
  return { byProvince, days, rowCount: rows.length };
}

function maxOrNull(a: number | null, b: number | null | undefined): number | null {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Math.max(a, b);
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const weekday = d.toLocaleDateString("es-ES", { weekday: "short" });
  return `${weekday} ${day}`;
}

function isToday(iso: string): boolean {
  return iso === new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Previsión de calidad del aire en España — 5 días (CAMS)",
  description:
    "Pronóstico de calidad del aire en España a 5 días por provincia. Índice ICA esperado, NO₂, PM10, PM2.5 y O₃. Datos del Copernicus Atmosphere Monitoring Service (CAMS).",
  alternates: { canonical: `${BASE_URL}/calidad-aire/prevision` },
  openGraph: {
    title: "Previsión calidad del aire España — 5 días CAMS",
    description:
      "Pronóstico provincia a provincia de NO₂, PM10, PM2.5 y O₃ a 5 días. Fuente Copernicus/ECMWF.",
    url: `${BASE_URL}/calidad-aire/prevision`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CalidadAirePrevisionPage() {
  const { byProvince, days, rowCount } = await getForecast();

  // Sort provinces alphabetically by name (fall back to code when unknown)
  const provinceCodes = Array.from(byProvince.keys()).sort((a, b) => {
    const na = PROVINCE_NAMES[a] ?? a;
    const nb = PROVINCE_NAMES[b] ?? b;
    return na.localeCompare(nb, "es");
  });

  const isEmpty = rowCount === 0 || days.length === 0;

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Previsión de calidad del aire CAMS — España",
    description:
      "Pronóstico provincial de calidad del aire (NO₂, PM10, PM2.5, O₃, SO₂ e índice ICA) " +
      "a 5 días, generado por el modelo regional CAMS del Copernicus Atmosphere Monitoring Service. " +
      "Refrescado cada 12 horas.",
    url: `${BASE_URL}/calidad-aire/prevision`,
    keywords: "previsión calidad aire, CAMS, contaminación, NO2, PM10, ICA, España",
    spatialCoverage: { "@type": "Place", name: "España" },
    creator: {
      "@type": "Organization",
      name: "Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF",
      url: "https://atmosphere.copernicus.eu",
    },
    license: "https://www.copernicus.eu/en/access-data/copyright-and-licences",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Calidad del aire", item: `${BASE_URL}/calidad-aire` },
      { "@type": "ListItem", position: 3, name: "Previsión", item: `${BASE_URL}/calidad-aire/prevision` },
    ],
  };

  return (
    <>
      <StructuredData data={[datasetSchema, breadcrumbSchema]} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Calidad del aire", href: "/calidad-aire" },
            { name: "Previsión", href: "/calidad-aire/prevision" },
          ]}
        />
      </div>

      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1c4e80 50%, #14b8a6 100%)",
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <Link
            href="/calidad-aire"
            className="inline-flex items-center gap-1.5 text-xs text-teal-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Calidad del aire ahora
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <Wind className="w-9 h-9 text-teal-200" />
            <span className="font-heading text-teal-200 text-sm font-semibold uppercase tracking-widest">
              Pronóstico CAMS · 5 días
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Previsión de calidad del aire
          </h1>
          <p className="text-teal-100 text-lg max-w-2xl leading-relaxed">
            Pronóstico provincial del índice ICA esperado y las concentraciones de NO₂, PM10,
            PM2.5 y O₃ a 5 días. Refrescado cada 12 horas por el servicio CAMS del programa
            Copernicus.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {isEmpty ? (
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Cloud className="w-10 h-10 mx-auto text-[var(--tl-warning)] mb-3" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Previsión no disponible
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              El colector CAMS no ha publicado una previsión reciente. La próxima actualización
              ocurre en las próximas 12 horas.
            </p>
          </section>
        ) : (
          <>
            {/* ICA legend */}
            <section aria-label="Leyenda ICA">
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--tl-info)]" />
                Escala ICA — Índice de calidad del aire
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ICA_CONFIG).map(([level, c]) => (
                  <div
                    key={level}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: c.bg, color: c.fg }}
                  >
                    <span className="font-mono">{level}</span>
                    {c.label}
                  </div>
                ))}
              </div>
            </section>

            {/* Provincial forecast grid */}
            <section aria-label="Previsión por provincia">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-[var(--tl-info)]" />
                Previsión por provincia
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 sticky left-0 bg-gray-50 dark:bg-gray-800/60">
                        Provincia
                      </th>
                      {days.map((d) => (
                        <th key={d} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                          {isToday(d) ? "Hoy" : fmtDay(d)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {provinceCodes.map((code) => {
                      const pMap = byProvince.get(code)!;
                      const name = PROVINCE_NAMES[code] ?? code;
                      return (
                        <tr key={code} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900">
                            {name}
                          </td>
                          {days.map((d) => {
                            const cell = pMap.get(d);
                            const ica = cell?.ica ?? null;
                            const tag = icaCell(ica);
                            return (
                              <td key={d} className="px-4 py-2.5">
                                <span
                                  className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                                  style={tag.style}
                                >
                                  {ica != null ? `${ica} · ${tag.text}` : "—"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                Para cada provincia y día se muestra el peor ICA esperado entre los gridpoints
                CAMS y horizontes disponibles. Datos crudos: {rowCount.toLocaleString("es-ES")} puntos pronóstico.
              </p>
            </section>
          </>
        )}

        {/* SEO body */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-[var(--tl-info)]" />
            Cómo se calcula la previsión
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              CAMS (Copernicus Atmosphere Monitoring Service) ejecuta un ensemble de modelos
              regionales que cubre Europa con resolución de 0,1°. Cada 12 horas publica un
              pronóstico de las principales especies de contaminación de fondo: dióxido de
              nitrógeno (NO₂), partículas en suspensión PM10 y PM2.5, ozono troposférico (O₃)
              y dióxido de azufre (SO₂).
            </p>
            <p>
              El índice ICA esperado se calcula con la misma regla de peor componente que
              MITECO aplica al dato observado: para cada celda se toma el contaminante con la
              banda más desfavorable. La página agrega múltiples gridpoints por provincia
              quedándose con el peor caso, que es la lectura responsable para planificar
              actividades sensibles al aire (deporte, niños, mayores).
            </p>
            <p>
              El dato observado en tiempo real, estación a estación, vive en{" "}
              <Link href="/calidad-aire" className="underline">la página principal de calidad del aire</Link>.
            </p>
          </div>
        </section>

        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-6">
          <Cloud className="w-4 h-4 flex-shrink-0" />
          <span>
            Fuente:{" "}
            <a
              href="https://atmosphere.copernicus.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF
            </a>
            {" "}· Modelo regional ensemble, actualizado cada 12 horas
          </span>
        </footer>
      </div>
    </>
  );
}

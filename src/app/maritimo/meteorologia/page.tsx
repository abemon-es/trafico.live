import type { Metadata } from "next";
import Link from "next/link";
import {
  Waves,
  CloudRain,
  Wind,
  AlertTriangle,
  Clock,
  MapPin,
  Navigation,
  ChevronRight,
  Eye,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Meteorología Marítima — Alertas Costeras AEMET en España",
  description:
    "Consulta las alertas meteorológicas costeras de la AEMET para las zonas marítimas de España: Galicia, Cantábrico, Baleares, Valencia, Alborán, Estrecho, Canarias y más. Datos actualizados cada 5 minutos.",
  keywords: [
    "meteorología marítima",
    "alertas costeras AEMET",
    "oleaje España",
    "zonas marítimas",
    "tiempo costas España",
    "avisos marítimos",
    "previsión marítima AEMET",
  ],
  alternates: {
    canonical: `${BASE_URL}/maritimo/meteorologia`,
  },
  openGraph: {
    title: "Meteorología Marítima — Alertas Costeras AEMET en España",
    description:
      "Alertas costeras AEMET en tiempo real para las zonas marítimas de España.",
    url: `${BASE_URL}/maritimo/meteorologia`,
    type: "website",
    locale: "es_ES",
  },
};

// ---------------------------------------------------------------------------
// Coastal zones (static data)
// ---------------------------------------------------------------------------

export const COASTAL_ZONES = [
  {
    id: "42",
    name: "Costa de Galicia",
    slug: "galicia",
    provinces: ["15", "27", "36"],
    description:
      "Desde la desembocadura del río Miño hasta el Cabo Ortegal, incluyendo las Rías Baixas y Rías Altas.",
  },
  {
    id: "43",
    name: "Cantábrico Occidental",
    slug: "cantabrico-occidental",
    provinces: ["33", "39"],
    description:
      "Costa de Asturias y Cantabria, conocida por su intensidad en el oleaje y los frentes atlánticos.",
  },
  {
    id: "44",
    name: "Cantábrico Oriental y Golfo de Vizcaya",
    slug: "cantabrico-oriental",
    provinces: ["48", "20"],
    description:
      "Litoral del País Vasco y la vertiente oriental del Golfo de Vizcaya.",
  },
  {
    id: "45",
    name: "Costas Catalano-Balear",
    slug: "catalano-balear",
    provinces: ["08", "17", "43", "07"],
    description:
      "Costa del Mar Mediterráneo desde el Cap de Creus hasta el Delta del Ebro, e Illes Balears.",
  },
  {
    id: "46",
    name: "Costa de Valencia",
    slug: "valencia",
    provinces: ["12", "46", "03"],
    description:
      "Litoral mediterráneo de Castellón, Valencia y Alicante.",
  },
  {
    id: "47",
    name: "Costa de Alborán",
    slug: "alboran",
    provinces: ["04", "18", "29"],
    description:
      "Almería, Granada y Málaga, en el Mar de Alborán, puerta del Mediterráneo.",
  },
  {
    id: "48",
    name: "Costa del Sol y Estrecho",
    slug: "estrecho",
    provinces: ["11", "29", "51", "52"],
    description:
      "Cádiz, sur de Málaga, Ceuta y Melilla. Zona del Estrecho de Gibraltar con frecuentes Levantes y Ponientes.",
  },
  {
    id: "49",
    name: "Costa de Canarias",
    slug: "canarias",
    provinces: ["35", "38"],
    description:
      "Archipiélago canario, con condiciones propias del Océano Atlántico subtropical.",
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

interface CoastalAlert {
  id: string;
  severity: Severity;
  province: string;
  provinceName: string | null;
  description: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getActiveCoastalAlerts(): Promise<CoastalAlert[]> {
  return prisma.weatherAlert.findMany({
    where: { type: "COASTAL", isActive: true },
    orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
    select: {
      id: true,
      severity: true,
      province: true,
      provinceName: true,
      description: true,
      startedAt: true,
      endedAt: true,
    },
  }) as Promise<CoastalAlert[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; cardBorder: string; cardBg: string; badge: string; icon: string }
> = {
  VERY_HIGH: {
    label: "Extremo",
    cardBorder: "border-signal-red",
    cardBg: "bg-red-50 dark:bg-red-900/20",
    badge: "bg-signal-red text-white",
    icon: "text-signal-red",
  },
  HIGH: {
    label: "Severo",
    cardBorder: "border-signal-amber",
    cardBg: "bg-orange-50 dark:bg-orange-900/20",
    badge: "bg-signal-amber text-white",
    icon: "text-signal-amber",
  },
  MEDIUM: {
    label: "Moderado",
    cardBorder: "border-yellow-400",
    cardBg: "bg-yellow-50 dark:bg-yellow-900/20",
    badge: "bg-yellow-400 text-yellow-900",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
  LOW: {
    label: "Bajo",
    cardBorder: "border-signal-green",
    cardBg: "bg-green-50 dark:bg-green-900/20",
    badge: "bg-signal-green text-white",
    icon: "text-signal-green",
  },
};

function formatTime(date: Date): string {
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}
    >
      {cfg.label}
    </span>
  );
}

function AlertCard({ alert }: { alert: CoastalAlert }) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  return (
    <article
      className={`rounded-xl border-l-4 border overflow-hidden ${cfg.cardBorder} ${cfg.cardBg} bg-white dark:bg-gray-900 shadow-sm`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Waves className={`w-4 h-4 flex-shrink-0 ${cfg.icon}`} />
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Oleaje costero
            </span>
          </div>
          <SeverityBadge severity={alert.severity} />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {alert.provinceName ?? alert.province}
          </span>
        </div>

        {alert.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3 line-clamp-3">
            {alert.description}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Desde {formatTime(alert.startedAt)}
          </span>
          {alert.endedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Hasta {formatTime(alert.endedAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ZoneCard({
  zone,
}: {
  zone: (typeof COASTAL_ZONES)[number];
}) {
  return (
    <Link
      href={`/maritimo/meteorologia/${zone.slug}`}
      className="group flex flex-col gap-3 p-5 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-tl-sea-100)" }}
        >
          <Waves className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
            {zone.name}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Zona {zone.id}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
        {zone.description}
      </p>

      <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-xs font-medium group-hover:gap-2 transition-all">
        Ver zona <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MeteorologiaPage() {
  const alerts = await getActiveCoastalAlerts();

  const severityCounts = alerts.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.severity] = (acc[a.severity] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Meteorología Marítima — Alertas Costeras AEMET en España",
    description:
      "Alertas meteorológicas costeras de la AEMET para las zonas marítimas de España, actualizadas cada 5 minutos.",
    url: `${BASE_URL}/maritimo/meteorologia`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Marítimo", href: "/maritimo" },
            { name: "Meteorología", href: "/maritimo/meteorologia" },
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
            "linear-gradient(135deg, var(--color-tl-sea-900) 0%, var(--color-tl-sea-700) 55%, var(--color-tl-sea-500) 100%)",
        }}
      >
        {/* Decorative rings */}
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/3 w-40 h-40 rounded-full opacity-5"
          style={{ background: "var(--color-tl-sea-100)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <CloudRain className="w-8 h-8 text-tl-sea-300" />
            <span className="font-heading text-tl-sea-300 text-sm font-semibold uppercase tracking-widest">
              Marítimo / Meteorología
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Meteorología Marítima
          </h1>
          <p className="text-tl-sea-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            Alertas costeras de la AEMET, condiciones de oleaje y fenómenos
            meteorológicos en las aguas jurisdiccionales españolas.
          </p>

          {/* Alert count summary */}
          {alerts.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-8">
              {(["VERY_HIGH", "HIGH", "MEDIUM", "LOW"] as Severity[]).map(
                (sev) => {
                  const count = severityCounts[sev] ?? 0;
                  if (count === 0) return null;
                  const cfg = SEVERITY_CONFIG[sev];
                  return (
                    <div
                      key={sev}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium backdrop-blur-sm"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${cfg.badge.split(" ")[0]}`}
                      />
                      <span className="font-mono font-bold">{count}</span>
                      <span className="text-tl-sea-200">{cfg.label}</span>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {alerts.length === 0 && (
            <div className="inline-flex items-center gap-2 mt-8 px-4 py-2 rounded-lg bg-green-500/20 border border-green-400/30 text-green-200 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Sin alertas costeras activas en este momento
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Active coastal alerts                                             */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Alertas costeras activas">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-tl-amber-500" />
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
              Alertas Costeras Activas
            </h2>
            {alerts.length > 0 && (
              <span className="ml-auto font-mono text-sm font-semibold text-gray-500 dark:text-gray-400">
                {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-tl-sea-50 dark:bg-tl-sea-900/20 p-10 text-center">
              <Waves className="w-12 h-12 text-tl-sea-300 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Sin alertas costeras activas
              </p>
              <p className="text-sm text-gray-400 mt-1">
                No hay alertas AEMET de tipo costero en este momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 8 Coastal zone cards                                             */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Zonas marítimas de España">
          <div className="flex items-center gap-3 mb-6">
            <Navigation className="w-6 h-6 text-tl-sea-500" />
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
              Zonas Marítimas de España
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COASTAL_ZONES.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} />
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Forecast placeholder                                              */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Próximamente: previsiones marítimas">
          <div
            className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 p-8 text-center"
            style={{
              background:
                "linear-gradient(135deg, var(--color-tl-sea-50) 0%, white 100%)",
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-tl-sea-100)" }}
            >
              <Wind className="w-7 h-7 text-tl-sea-600" />
            </div>
            <h2 className="font-heading text-xl font-bold text-tl-sea-800 dark:text-tl-sea-200 mb-2">
              Previsiones Marítimas Detalladas
            </h2>
            <p className="text-sm text-tl-sea-700 dark:text-tl-sea-300 max-w-md mx-auto leading-relaxed">
              Las previsiones marítimas detalladas estarán disponibles
              próximamente. Incluirán altura de ola, estado de la mar,
              viento y visibilidad por zona, directamente desde los
              modelos numéricos de la AEMET.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-tl-sea-500 dark:text-tl-sea-400 font-medium">
              <Eye className="w-3.5 h-3.5" />
              Fuente: AEMET — Agencia Estatal de Meteorología
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SEO text                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8"
          aria-label="Información sobre meteorología marítima española"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Zonas Marítimas y Meteorología Costera en España
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              La <strong>meteorología marítima en España</strong> está organizada en
              zonas costeras definidas por la AEMET, que emite boletines y avisos
              específicos para cada litoral. Estas zonas abarcan desde la Costa
              Cantábrica en el norte hasta las Islas Canarias en el Atlántico sur,
              pasando por el Mediterráneo y el Estrecho de Gibraltar.
            </p>
            <p>
              Las <strong>alertas costeras</strong> se emiten cuando se prevén
              condiciones adversas de oleaje, viento, visibilidad o fenómenos
              meteorológicos que puedan afectar a la navegación. Los niveles de
              aviso van desde Bajo hasta Extremo, en función de la intensidad
              esperada del fenómeno.
            </p>
            <p>
              El <strong>Cantábrico</strong> es una de las zonas más activas
              meteorológicamente, con frecuentes temporales atlánticos y olas que
              pueden superar los 6 metros en situaciones de alerta máxima. El
              <strong> Estrecho de Gibraltar</strong> presenta condiciones
              particulares por la interacción entre el Mediterráneo y el Atlántico,
              con vientos de Levante y Poniente que pueden alcanzar fuerza de
              temporal. Las <strong>Islas Canarias</strong> tienen su propio
              régimen meteorológico subtropical, con alisios dominantes y ocasionales
              borrascas atlánticas en invierno.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Datos de alertas proporcionados por la{" "}
              <strong>AEMET (Agencia Estatal de Meteorología)</strong>, actualizados
              cada 5 minutos. trafico.live no modifica ni interpreta los avisos
              oficiales — se reproducen tal como los emite AEMET.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Related links                                                     */}
        {/* ---------------------------------------------------------------- */}
        <nav aria-label="También te puede interesar">
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/maritimo/combustible"
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-tl-sea-300 dark:hover:border-tl-sea-700 hover:shadow-sm transition-all group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <Waves className="w-4 h-4 text-tl-sea-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-600 dark:group-hover:text-tl-sea-400 transition-colors">
                  Combustible Marítimo
                </div>
                <div className="text-xs text-gray-400">
                  Precios en puertos náuticos
                </div>
              </div>
            </Link>
            <Link
              href="/maritimo/puertos"
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-tl-sea-300 dark:hover:border-tl-sea-700 hover:shadow-sm transition-all group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <Navigation className="w-4 h-4 text-tl-sea-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-600 dark:group-hover:text-tl-sea-400 transition-colors">
                  Puertos de España
                </div>
                <div className="text-xs text-gray-400">
                  Directorio de puertos
                </div>
              </div>
            </Link>
            <Link
              href="/alertas-meteo"
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-tl-sea-300 dark:hover:border-tl-sea-700 hover:shadow-sm transition-all group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <CloudRain className="w-4 h-4 text-tl-sea-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-sea-600 dark:group-hover:text-tl-sea-400 transition-colors">
                  Alertas Meteorológicas
                </div>
                <div className="text-xs text-gray-400">
                  Avisos AEMET para carreteras
                </div>
              </div>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}

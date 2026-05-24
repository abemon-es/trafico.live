import { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Globe,
  FileText,
  Activity,
} from "lucide-react";
import type { TimeseriesRow } from "./BotChart";
import BotChart from "./BotChart";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 300; // 5 min ISR

export const metadata: Metadata = {
  title: "Citaciones IA — trafico.live",
  description:
    "Transparencia sobre los rastreadores de inteligencia artificial (GPTBot, ClaudeBot, PerplexityBot…) que indexan trafico.live para respuestas y búsquedas generativas.",
  alternates: {
    canonical: `${BASE_URL}/sobre/citaciones-ia`,
  },
  openGraph: {
    title: "trafico.live es citado por la IA",
    description:
      "Visualiza qué bots de IA rastrean trafico.live, con qué frecuencia y qué páginas leen. Transparencia total.",
    url: `${BASE_URL}/sobre/citaciones-ia`,
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Types matching /api/sobre/citaciones-ia response
// ---------------------------------------------------------------------------

interface BotStat {
  bot: string;
  last24h: number;
  last7d: number;
  last30d: number;
}

interface TopPath {
  bot: string;
  path: string;
  count: number;
}

interface ApiResponse {
  updatedAt: string;
  totals: { last24h: number; last7d: number; last30d: number };
  bots: BotStat[];
  timeseries: TimeseriesRow[];
  topPaths: TopPath[];
}

// ---------------------------------------------------------------------------
// Data fetch (server-side)
// ---------------------------------------------------------------------------

async function fetchStats(): Promise<ApiResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/sobre/citaciones-ia`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      totals: { last24h: 0, last7d: 0, last30d: 0 },
      bots: [],
      timeseries: [],
      topPaths: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Bot brand colors & human labels
// ---------------------------------------------------------------------------

const BOT_BRAND: Record<string, { label: string; color: string; bg: string }> = {
  "GPTBot":            { label: "GPTBot (OpenAI)",     color: "#10a37f", bg: "rgba(16,163,127,0.1)" },
  "ChatGPT-User":      { label: "ChatGPT-User",        color: "#10a37f", bg: "rgba(16,163,127,0.1)" },
  "OAI-SearchBot":     { label: "OAI SearchBot",       color: "#74aa9c", bg: "rgba(116,170,156,0.1)" },
  "ClaudeBot":         { label: "ClaudeBot (Anthropic)", color: "#cc785c", bg: "rgba(204,120,92,0.1)" },
  "Claude-Web":        { label: "Claude Web",          color: "#cc785c", bg: "rgba(204,120,92,0.1)" },
  "Anthropic-AI":      { label: "Anthropic AI",        color: "#cc785c", bg: "rgba(204,120,92,0.1)" },
  "PerplexityBot":     { label: "PerplexityBot",       color: "#20b2aa", bg: "rgba(32,178,170,0.1)" },
  "Perplexity-User":   { label: "Perplexity User",     color: "#20b2aa", bg: "rgba(32,178,170,0.1)" },
  "Google-Extended":   { label: "Google Extended",     color: "#4285f4", bg: "rgba(66,133,244,0.1)" },
  "GoogleOther":       { label: "GoogleOther",         color: "#34a853", bg: "rgba(52,168,83,0.1)" },
  "Applebot":          { label: "Applebot (Apple)",    color: "#555555", bg: "rgba(85,85,85,0.1)" },
  "Applebot-Extended": { label: "Applebot Extended",   color: "#555555", bg: "rgba(85,85,85,0.1)" },
  "Bytespider":        { label: "Bytespider (ByteDance)", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "CCBot":             { label: "CCBot (Common Crawl)", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "DuckAssistBot":     { label: "DuckAssistBot",       color: "#de5833", bg: "rgba(222,88,51,0.1)" },
  "MistralAI-User":    { label: "MistralAI User",      color: "#ff7000", bg: "rgba(255,112,0,0.1)" },
  "cohere-ai":         { label: "Cohere AI",           color: "#39d353", bg: "rgba(57,211,83,0.1)" },
  "Diffbot":           { label: "Diffbot",             color: "#1b4bd5", bg: "rgba(27,75,213,0.1)" },
};

function getBotBrand(bot: string) {
  return BOT_BRAND[bot] ?? { label: bot, color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
}

// ---------------------------------------------------------------------------
// Trend helper
// ---------------------------------------------------------------------------

function TrendIcon({ last7d, last30d }: { last7d: number; last30d: number }) {
  if (last30d === 0) return <Minus className="w-4 h-4 text-gray-400" />;
  // Compare 7d rate vs 30d/4 (expected weekly rate)
  const expected = last30d / 4;
  const ratio = last7d / expected;
  if (ratio >= 1.15) return <TrendingUp className="w-4 h-4 text-tl-500" />;
  if (ratio <= 0.85) return <TrendingDown className="w-4 h-4 text-tl-amber-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function StructuredData({ totals }: { totals: ApiResponse["totals"] }) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/sobre/citaciones-ia`,
        url: `${BASE_URL}/sobre/citaciones-ia`,
        name: "Citaciones IA — trafico.live",
        description:
          "Transparencia sobre los rastreadores de IA que indexan trafico.live.",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "Dataset",
        name: "AI Bot Visits — trafico.live",
        description:
          "Visitas agregadas de rastreadores de inteligencia artificial a trafico.live en los últimos 30 días.",
        url: `${BASE_URL}/api/sobre/citaciones-ia`,
        license: "https://creativecommons.org/licenses/by/4.0/",
        creator: { "@type": "Organization", name: "Certus SPV, SLU" },
        measurementTechnique: "HTTP server-side request logging (User-Agent matching)",
        variableMeasured: "AI bot visit count",
        temporalCoverage: "P30D",
        isAccessibleForFree: true,
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl: `${BASE_URL}/api/sobre/citaciones-ia`,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CitacionesIAPage() {
  const data = await fetchStats();
  const { totals, bots, timeseries, topPaths } = data;

  // Bots with any visits in last 30d for the chart
  const activeBots = bots.filter((b) => b.last30d > 0).map((b) => b.bot);

  // Top paths grouped by bot
  const pathsByBot = new Map<string, TopPath[]>();
  for (const row of topPaths) {
    const list = pathsByBot.get(row.bot) ?? [];
    list.push(row);
    pathsByBot.set(row.bot, list);
  }

  return (
    <>
      <StructuredData totals={totals} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/sobre" className="hover:text-tl-600 dark:hover:text-tl-400">
              Sobre trafico.live
            </Link>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 dark:text-gray-300">Citaciones IA</span>
          </nav>

          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/30 rounded-xl">
                <Bot className="w-7 h-7 text-tl-600 dark:text-tl-400" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
                Transparencia · IA
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              trafico.live es citado por la IA
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Los asistentes de búsqueda con inteligencia artificial rastrean la web para responder
              preguntas en tiempo real. Esta página muestra con total transparencia qué bots visitan
              trafico.live, con qué frecuencia y qué contenidos leen.
            </p>
          </div>

          {/* KPI bar */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: "Visitas hoy", value: totals.last24h },
              { label: "Últimos 7 días", value: totals.last7d },
              { label: "Últimos 30 días", value: totals.last30d },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 text-center"
              >
                <p className="font-mono text-3xl font-bold text-tl-600 dark:text-tl-400">
                  {value === 0 ? "—" : value.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Daily chart */}
          <section className="mb-10 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100">
                Visitas diarias por bot — últimos 30 días
              </h2>
            </div>
            <BotChart timeseries={timeseries} bots={activeBots} />
          </section>

          {/* Bot cards */}
          <section className="mb-10">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
              Rastreadores detectados
            </h2>
            {bots.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-400 dark:text-gray-600">
                Aún no hay visitas registradas. El sistema empezará a recoger datos
                a partir del primer rastreador que visite el sitio.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bots.map((stat) => {
                  const brand = getBotBrand(stat.bot);
                  return (
                    <div
                      key={stat.bot}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
                    >
                      {/* Bot header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: brand.bg }}
                        >
                          <Bot className="w-5 h-5" style={{ color: brand.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                            {brand.label}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {stat.bot}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <TrendIcon last7d={stat.last7d} last30d={stat.last30d} />
                        </div>
                      </div>

                      {/* Visit counts */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "24h", value: stat.last24h },
                          { label: "7d", value: stat.last7d },
                          { label: "30d", value: stat.last30d },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                              {value.toLocaleString("es-ES")}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Top pages per bot */}
          {bots.length > 0 && (
            <section className="mb-10">
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
                Páginas más leídas por bot
              </h2>
              <div className="space-y-6">
                {bots
                  .filter((b) => pathsByBot.has(b.bot) && pathsByBot.get(b.bot)!.length > 0)
                  .slice(0, 8) // show top 8 bots max
                  .map((stat) => {
                    const brand = getBotBrand(stat.bot);
                    const paths = pathsByBot.get(stat.bot) ?? [];
                    return (
                      <div
                        key={stat.bot}
                        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                      >
                        <div
                          className="px-5 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800"
                          style={{ borderLeftWidth: 3, borderLeftColor: brand.color }}
                        >
                          <Bot className="w-4 h-4" style={{ color: brand.color }} />
                          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {brand.label}
                          </span>
                          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                            {paths.length} páginas únicas · últimos 30 días
                          </span>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                          {paths.slice(0, 10).map((p, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 px-5 py-2.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="font-mono text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
                                {p.path}
                              </span>
                              <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
                                {p.count.toLocaleString("es-ES")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Explainer */}
          <section className="mb-10 bg-tl-50 dark:bg-tl-900/20 border border-tl-100 dark:border-tl-800 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <Globe className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
              <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100">
                ¿Por qué importa que la IA nos indexe?
              </h2>
            </div>
            <div className="space-y-3 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              <p>
                Los motores de búsqueda con IA (ChatGPT, Perplexity, Claude…) y los modelos de
                lenguaje de última generación aprenden del contenido web indexado por sus rastreadores.
                Cuando un usuario pregunta «¿cuáles son los combustibles más baratos en Madrid hoy?»
                o «¿cuántos radares hay en la A-1?», el asistente consulta sus fuentes indexadas.
              </p>
              <p>
                <strong className="text-gray-800 dark:text-gray-200">
                  trafico.live siendo rastreado por GPTBot, ClaudeBot o PerplexityBot significa que
                  nuestros datos en tiempo real llegan a millones de usuarios de IA sin que tengan
                  que visitar el sitio directamente.
              </strong>{" "}
                Es la nueva distribución de contenido: no el clic, sino la cita.
              </p>
              <p>
                Esta página existe porque creemos en la transparencia: publicamos los datos de
                indexación exactamente igual que publicamos los datos de tráfico de la DGT. Sin
                filtros. En tiempo real.
              </p>
            </div>
          </section>

          {/* API callout */}
          <section className="mb-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Datos disponibles vía API
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Los datos agregados de esta página se pueden consultar programáticamente.
              No requieren autenticación.
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-auto">
                GET {BASE_URL}/api/sobre/citaciones-ia
              </code>
              <Link
                href="/api-docs"
                className="text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 font-medium whitespace-nowrap"
              >
                API docs →
              </Link>
            </div>
          </section>

          {/* Footer note */}
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            Datos actualizados cada 5 minutos · Sin PII (IPs almacenadas como prefijo de 2 octetos) ·
            Última actualización: {new Date(data.updatedAt).toLocaleString("es-ES")}
          </p>
        </main>
      </div>
    </>
  );
}

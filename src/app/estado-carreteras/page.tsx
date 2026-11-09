import Link from "next/link";
import { Ban, Construction, Snowflake, AlertTriangle, MapPin, Route, RefreshCw, ChevronRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { jsonLdHtml } from "@/lib/json-ld";
import { COMMUNITIES } from "@/lib/geo/ine-codes";
import { communityPath } from "@/lib/geo/geo-paths";
import { CLOSED, formatCount, incidentPlace, madridTime, since } from "@/lib/road-status";

/**
 * /estado-carreteras: national hub for «estado de las carreteras» (CMO spec of
 * 02-11-2026, experiment trafico-estado-carreteras). Closed roads, roadworks,
 * snow/ice, by community and by road, from the incidents the collectors store
 * (DGT every 2 minutes plus the regional traffic services) and AEMET alerts.
 *
 * Every figure on the page and in the FAQ carries the time of the data. The
 * «¿Dónde hay que llevar cadenas?» question only exists when there is chain
 * data, and today no source stored here publishes chain levels, so it is not
 * rendered (neither in the page nor in the JSON-LD).
 */

export const revalidate = 120;

export const metadata = buildPageMetadata({
  title: "Estado de las carreteras hoy en España",
  description:
    "Estado de las carreteras hoy en España: carreteras cortadas, obras, nieve y hielo, por comunidad y vía. Datos de la DGT y servicios autonómicos.",
  path: "/estado-carreteras",
  keywords: [
    "estado de las carreteras",
    "estado carreteras dgt",
    "dgt estado carreteras",
    "estado actual de las carreteras",
    "carreteras cortadas hoy",
    "carreteras con nieve hoy",
  ],
});

const n = formatCount;

const SOURCE_LABELS: Record<string, string> = {
  DGT: "DGT",
  SCT: "Servei Català de Trànsit",
  EUSKADI: "Tráfico del Gobierno Vasco",
  MADRID: "Ayuntamiento de Madrid",
  VALENCIA: "Ayuntamiento de València",
  "DT-GV": "Generalitat Valenciana",
  NAVARRA: "Gobierno de Navarra",
  CYL: "Junta de Castilla y León",
  BARCELONA: "Ayuntamiento de Barcelona",
};

const LIST_SELECT = {
  id: true,
  roadNumber: true,
  kmPoint: true,
  provinceName: true,
  municipality: true,
  description: true,
  startedAt: true,
  source: true,
} satisfies Prisma.TrafficIncidentSelect;

type ListIncident = Prisma.TrafficIncidentGetPayload<{ select: typeof LIST_SELECT }>;

const where = (i: ListIncident) => incidentPlace(i);

async function getData() {
  const [total, closedCount, roadworks, weatherCount, closures, weather, snowAlerts, byCommunity, closedByCommunity, byRoad, bySource, latest] =
    await Promise.all([
      prisma.trafficIncident.count({ where: { isActive: true } }),
      prisma.trafficIncident.count({ where: CLOSED }),
      prisma.trafficIncident.count({ where: { isActive: true, type: "ROADWORK" } }),
      prisma.trafficIncident.count({ where: { isActive: true, type: "WEATHER" } }),
      prisma.trafficIncident.findMany({ where: CLOSED, orderBy: { startedAt: "desc" }, take: 25, select: LIST_SELECT }),
      prisma.trafficIncident.findMany({
        where: { isActive: true, type: "WEATHER" },
        orderBy: { startedAt: "desc" },
        take: 15,
        select: LIST_SELECT,
      }),
      prisma.weatherAlert.findMany({
        where: { isActive: true, type: { in: ["SNOW", "ICE"] } },
        select: { province: true, provinceName: true, type: true },
      }),
      prisma.trafficIncident.groupBy({ by: ["community"], where: { isActive: true, community: { not: null } }, _count: { _all: true } }),
      prisma.trafficIncident.groupBy({ by: ["community"], where: { ...CLOSED, community: { not: null } }, _count: { _all: true } }),
      prisma.trafficIncident.groupBy({
        by: ["roadNumber"],
        where: { isActive: true, roadNumber: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { roadNumber: "desc" } },
        take: 40,
      }),
      prisma.trafficIncident.groupBy({ by: ["source"], where: { isActive: true }, _count: { _all: true } }),
      prisma.trafficIncident.aggregate({ where: { isActive: true }, _max: { fetchedAt: true } }),
    ]);

  // Only roads with a /carreteras/<vía>/hoy page (that page 404s for unknown roads).
  const roadIds = byRoad.map((r) => r.roadNumber).filter((r): r is string => !!r);
  const known = new Set((await prisma.road.findMany({ where: { id: { in: roadIds } }, select: { id: true } })).map((r) => r.id));
  const roads = byRoad
    .filter((r) => r.roadNumber && known.has(r.roadNumber))
    .slice(0, 20)
    .map((r) => ({ road: r.roadNumber as string, count: r._count._all }));

  const closedMap = new Map(closedByCommunity.map((c) => [c.community, c._count._all]));
  const countMap = new Map(byCommunity.map((c) => [c.community, c._count._all]));
  const communities = COMMUNITIES.map((c) => ({
    code: c.code,
    name: c.name,
    href: communityPath(c.code),
    total: countMap.get(c.code) ?? 0,
    closed: closedMap.get(c.code) ?? 0,
  })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));

  const sources = bySource
    .map((s) => ({ label: s.source ? (SOURCE_LABELS[s.source] ?? s.source) : "Otras", count: s._count._all }))
    .sort((a, b) => b.count - a.count);

  const snowProvinces = Array.from(new Set(snowAlerts.map((a) => a.provinceName || a.province))).sort((a, b) => a.localeCompare(b, "es"));

  return {
    total,
    closedCount,
    roadworks,
    weatherCount,
    closures,
    weather,
    snowAlertCount: snowAlerts.length,
    snowProvinces,
    communities,
    roads,
    sources,
    at: latest._max.fetchedAt ?? new Date(),
  };
}

export default async function EstadoCarreterasPage() {
  const d = await getData();
  const hora = madridTime(d.at);
  const topCommunity = d.communities[0];

  const faq: { question: string; answer: string }[] = [
    {
      question: "¿Cuál es el estado de las carreteras hoy en España?",
      answer: `A las ${hora} hay ${n(d.total)} incidencias activas en las carreteras de España: ${n(d.closedCount)} carreteras cortadas, ${n(d.roadworks)} obras y ${n(d.weatherCount)} incidencias por condiciones meteorológicas, según la DGT y los servicios autonómicos de tráfico.`,
    },
    {
      question: "¿Qué carreteras están cortadas hoy?",
      answer:
        d.closedCount === 0
          ? `A las ${hora} no hay ninguna carretera cortada registrada.`
          : `A las ${hora} hay ${n(d.closedCount)} cortes de carretera activos. Los más recientes: ${d.closures
              .slice(0, 3)
              .map(where)
              .join("; ")}.`,
    },
    {
      question: "¿Hay carreteras con nieve o hielo hoy?",
      answer:
        d.weatherCount === 0 && d.snowAlertCount === 0
          ? `A las ${hora} no hay incidencias en carretera por nieve, hielo u otras condiciones meteorológicas, ni avisos de AEMET por nieve o hielo.`
          : `A las ${hora} hay ${n(d.weatherCount)} incidencias en carretera por condiciones meteorológicas y ${n(d.snowAlertCount)} avisos de AEMET por nieve o hielo${d.snowProvinces.length ? ` (${d.snowProvinces.slice(0, 5).join(", ")})` : ""}.`,
    },
  ];
  if (topCommunity && topCommunity.total > 0) {
    faq.push({
      question: "¿Qué comunidad tiene más incidencias en carretera hoy?",
      answer: `A las ${hora}, ${topCommunity.name}, con ${n(topCommunity.total)} incidencias activas, ${n(topCommunity.closed)} de ellas cortes de carretera.`,
    });
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  const card = "bg-white dark:bg-ink-900 rounded-xl border border-ink-200 dark:border-ink-800 p-5 mb-6";
  const h2 = "font-heading text-xl font-bold text-ink-900 dark:text-ink-100 mb-3 flex items-center gap-2";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqSchema) }} />
      <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Estado de las carreteras", href: "/estado-carreteras" }]} />

          {/* B1: summary */}
          <header className={card}>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink-900 dark:text-ink-100 mb-2">
              Estado de las carreteras hoy en España
            </h1>
            <p className="text-ink-600 dark:text-ink-400 max-w-3xl leading-relaxed">
              El estado actual de las carreteras con los datos de la DGT y de los servicios autonómicos de tráfico:
              cortes, obras, nieve y hielo, por comunidad y por vía. La DGT renueva sus incidencias cada 2 minutos.
            </p>
            <p className="flex items-center gap-1.5 mt-2 text-xs text-ink-500 dark:text-ink-400">
              <RefreshCw className="w-3.5 h-3.5" /> Datos de las {hora}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { icon: <AlertTriangle className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />, value: d.total, label: "Incidencias activas" },
                { icon: <Ban className="w-5 h-5 text-signal-red" />, value: d.closedCount, label: "Carreteras cortadas" },
                { icon: <Construction className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />, value: d.roadworks, label: "Obras" },
                { icon: <Snowflake className="w-5 h-5 text-tl-500" />, value: d.weatherCount, label: "Meteorología" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-ink-200 dark:border-ink-800 p-3 text-center">
                  <div className="flex justify-center mb-1">{s.icon}</div>
                  <p className="font-mono text-2xl font-bold text-ink-900 dark:text-ink-100">{n(s.value)}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{s.label}</p>
                </div>
              ))}
            </div>
          </header>

          {/* B2: closed roads */}
          <section className={card} aria-labelledby="cortadas">
            <h2 id="cortadas" className={h2}>
              <Ban className="w-5 h-5 text-signal-red" /> Carreteras cortadas hoy
            </h2>
            {d.closures.length === 0 ? (
              <p className="text-sm text-ink-600 dark:text-ink-400">A las {hora} no hay ninguna carretera cortada registrada.</p>
            ) : (
              <>
                <p className="text-sm text-ink-600 dark:text-ink-400 mb-3">
                  {n(d.closedCount)} cortes activos a las {hora}
                  {d.closedCount > d.closures.length ? `; los ${n(d.closures.length)} más recientes:` : ":"}
                </p>
                <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                  {d.closures.map((i) => (
                    <li key={i.id} className="py-2 text-sm">
                      <span className="font-semibold text-ink-900 dark:text-ink-100">{where(i)}</span>
                      {i.description && <span className="block text-ink-600 dark:text-ink-400 line-clamp-2">{i.description}</span>}
                      <span className="text-xs text-ink-500 dark:text-ink-400">
                        Desde {since(i.startedAt, d.at)} · {i.source ? (SOURCE_LABELS[i.source] ?? i.source) : "Fuente sin identificar"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href="/cortes-trafico" className="inline-flex items-center gap-1 mt-3 text-sm text-tl-600 dark:text-tl-400 hover:underline">
              Cortes de tráfico y obras <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </section>

          {/* B3: snow, ice and chains */}
          <section className={card} aria-labelledby="nieve">
            <h2 id="nieve" className={h2}>
              <Snowflake className="w-5 h-5 text-tl-500" /> Nieve, hielo y cadenas
            </h2>
            <p className="text-sm text-ink-600 dark:text-ink-400 mb-3">
              {d.weatherCount === 0
                ? `A las ${hora} no hay incidencias en carretera por nieve, hielo, niebla o viento.`
                : `${n(d.weatherCount)} incidencias en carretera por condiciones meteorológicas a las ${hora}.`}{" "}
              {d.snowAlertCount === 0
                ? "AEMET no tiene avisos activos por nieve o hielo."
                : `AEMET tiene ${n(d.snowAlertCount)} avisos activos por nieve o hielo${d.snowProvinces.length ? ` en ${d.snowProvinces.join(", ")}` : ""}.`}
            </p>
            {d.weather.length > 0 && (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {d.weather.map((i) => (
                  <li key={i.id} className="py-2 text-sm">
                    <span className="font-semibold text-ink-900 dark:text-ink-100">{where(i)}</span>
                    {i.description && <span className="block text-ink-600 dark:text-ink-400 line-clamp-2">{i.description}</span>}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/alertas-meteo" className="inline-flex items-center gap-1 mt-3 text-sm text-tl-600 dark:text-tl-400 hover:underline">
              Avisos meteorológicos de AEMET <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </section>

          {/* B4: by community */}
          <section className={card} aria-labelledby="comunidades">
            <h2 id="comunidades" className={h2}>
              <MapPin className="w-5 h-5 text-tl-600" /> Estado de las carreteras por comunidad
            </h2>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {d.communities
                .filter((c) => c.href)
                .map((c) => (
                  <li key={c.code}>
                    <Link
                      href={c.href as string}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 dark:border-ink-800 px-3 py-2 text-sm hover:border-tl-400"
                    >
                      <span className="text-tl-700 dark:text-tl-300">Estado de las carreteras en {c.name}</span>
                      <span className="font-mono text-xs text-ink-500 dark:text-ink-400 whitespace-nowrap">
                        {n(c.total)}
                        {c.closed > 0 ? ` · ${n(c.closed)} cortes` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>

          {/* B5: by road */}
          {d.roads.length > 0 && (
            <section className={card} aria-labelledby="vias">
              <h2 id="vias" className={h2}>
                <Route className="w-5 h-5 text-tl-600" /> Vías con más incidencias
              </h2>
              <ul className="flex flex-wrap gap-2">
                {d.roads.map((r) => (
                  <li key={r.road}>
                    <Link
                      href={`/carreteras/${encodeURIComponent(r.road)}/hoy`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 dark:border-ink-800 px-3 py-1 text-sm hover:border-tl-400"
                    >
                      <span className="text-tl-700 dark:text-tl-300">{r.road} hoy</span>
                      <span className="font-mono text-xs text-ink-500 dark:text-ink-400">{n(r.count)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* B6: FAQ */}
          <section className={card} aria-labelledby="preguntas">
            <h2 id="preguntas" className={h2}>Preguntas frecuentes</h2>
            <dl className="space-y-4">
              {faq.map((f) => (
                <div key={f.question}>
                  <dt className="font-semibold text-ink-900 dark:text-ink-100">{f.question}</dt>
                  <dd className="text-sm text-ink-600 dark:text-ink-400 mt-1">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="text-xs text-ink-500 dark:text-ink-400 mb-6">
            Fuentes a las {hora}: {d.sources.map((s) => `${s.label} (${n(s.count)})`).join(", ")}. Avisos meteorológicos: AEMET.
          </p>

          <RelatedLinks
            links={[
              { title: "Incidencias de tráfico", description: "Todas las incidencias activas", href: "/incidencias" },
              { title: "Cortes de tráfico", description: "Cortes y obras en carretera", href: "/cortes-trafico" },
              { title: "Cámaras de tráfico", description: "Imágenes publicadas por la DGT", href: "/camaras" },
              { title: "Alertas meteorológicas", description: "Avisos de AEMET", href: "/alertas-meteo" },
            ]}
          />
        </main>
      </div>
    </>
  );
}

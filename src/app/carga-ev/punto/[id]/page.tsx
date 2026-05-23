/**
 * /carga-ev/punto/[id] — Per-EV-charger entity landing page.
 *
 * One landing page per charging station: ~12K records, this is the
 * single largest entity-level SEO surface on the site. Page is built
 * server-side from Prisma with no client JS gates so it indexes cleanly
 * regardless of browser conditions.
 *
 * Content blocks (each block is independently skipped when its data
 * is absent, so the page still reads well for sparse records):
 *   - Hero with power tier + 24h + public badges
 *   - Location + operator details
 *   - Connector type list (CHAdeMO, CCS, Type 2, etc.)
 *   - Payment methods accepted
 *   - "Cómo llegar" — deep links to Google Maps + Apple Maps
 *   - Nearby chargers (same city / province) with distance + power
 *   - Same-network chargers in the same province
 *   - Nearest gas stations (multi-fuel households)
 *   - Cross-links to /carga-ev/cerca and /carga-ev/<city>
 *   - Schema.org EVChargingStation JSON-LD (not generic LocalBusiness)
 *   - BreadcrumbList JSON-LD
 *
 * Static-generated for the top 500 most-recently-updated public
 * chargers, lazily rendered for the rest. ISR 24h.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Battery,
  Building2,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Fuel,
  MapPin,
  Navigation,
  Plug,
  Zap,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 86400;
export const dynamicParams = true;

// Connector codes → human Spanish labels
const CT: Record<string, string> = {
  AC_TYPE1: "Tipo 1 (AC)",
  AC_TYPE2: "Tipo 2 (AC)",
  DC_CHADEMO: "CHAdeMO (DC)",
  DC_CCS: "CCS Combo (DC)",
  DC_CCS2: "CCS Combo 2 (DC)",
  TESLA: "Tesla",
  SCHUKO: "Schuko",
  OTHER: "Otro",
};

// Schema.org connector mapping (per EVConnectorEnumeration when known,
// otherwise the raw label). Used by JSON-LD.
const SCHEMA_CONNECTOR: Record<string, string> = {
  AC_TYPE1: "IEC 62196 Type 1",
  AC_TYPE2: "IEC 62196 Type 2",
  DC_CHADEMO: "CHAdeMO",
  DC_CCS: "CCS Combo 1",
  DC_CCS2: "CCS Combo 2",
  TESLA: "Tesla",
  SCHUKO: "Schuko CEE 7/4",
  OTHER: "Otro",
};

type Props = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getData(id: string) {
  const charger = await prisma.eVCharger.findUnique({ where: { id } });
  if (!charger) return null;

  const lat = Number(charger.latitude);
  const lng = Number(charger.longitude);

  // Look for nearby chargers in the same city first (most useful), then
  // fall back to province scope. Fetching with bounding box would need
  // PostGIS — for now sample 20 and rank by haversine in-process.
  const [sameCity, sameNetworkProvince, nearestStations] = await Promise.all([
    prisma.eVCharger.findMany({
      where: {
        id: { not: charger.id },
        isPublic: true,
        OR: [
          ...(charger.city ? [{ city: charger.city }] : []),
          ...(charger.province && !charger.city ? [{ province: charger.province }] : []),
        ],
      },
      take: 20,
      select: {
        id: true, name: true, latitude: true, longitude: true,
        city: true, powerKw: true, operator: true, network: true,
        is24h: true,
      },
    }),
    charger.network
      ? prisma.eVCharger.findMany({
          where: {
            id: { not: charger.id },
            isPublic: true,
            network: charger.network,
            ...(charger.province ? { province: charger.province } : {}),
          },
          take: 8,
          select: {
            id: true, name: true, latitude: true, longitude: true,
            city: true, powerKw: true,
          },
        })
      : Promise.resolve([]),
    charger.province
      ? prisma.gasStation.findMany({
          where: { province: charger.province },
          take: 20,
          select: {
            id: true, name: true, brand: true, locality: true,
            latitude: true, longitude: true,
            priceGasoleoA: true, priceGasolina95: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Rank by haversine distance
  const nearby = sameCity
    .map((c) => ({
      ...c,
      distanceKm: haversine(lat, lng, Number(c.latitude), Number(c.longitude)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6);

  const nearbyGas = nearestStations
    .map((s) => ({
      ...s,
      distanceKm: haversine(lat, lng, Number(s.latitude), Number(s.longitude)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4);

  return { charger, nearby, sameNetworkProvince, nearbyGas, lat, lng };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

// Pre-generate the 500 most recently-updated public chargers. ISR
// handles the rest lazily.
export async function generateStaticParams() {
  const chargers = await prisma.eVCharger.findMany({
    where: { isPublic: true },
    select: { id: true },
    orderBy: { lastUpdated: "desc" },
    take: 500,
  });
  return chargers.map((c) => ({ id: c.id }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getData(id);
  if (!data) return { title: "Cargador no encontrado" };
  const { charger } = data;

  const kw = charger.powerKw ? Number(charger.powerKw) : null;
  const kwTag = kw ? ` ${kw} kW` : "";
  const tier = kw ? (kw > 50 ? "Carga rápida" : kw >= 22 ? "Semi-rápida" : "Carga lenta") : "";
  const ct = charger.chargerTypes.map((t) => CT[t] ?? t).join(", ");
  const loc = charger.city ?? charger.provinceName ?? "España";

  const title = `${charger.name}${kwTag} — Cargador EV en ${loc}`;
  const description =
    `${charger.name}${charger.address ? `, ${charger.address}` : ""}. ` +
    `${tier ? `${tier} (${kw} kW). ` : ""}` +
    `${charger.operator ? `Operador ${charger.operator}. ` : ""}` +
    `${ct ? `Conectores: ${ct}. ` : ""}` +
    `${charger.is24h ? "Abierto 24h. " : ""}` +
    `Ubicación, métodos de pago y cargadores cercanos.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/carga-ev/punto/${id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/carga-ev/punto/${id}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function PowerBadge({ kw }: { kw: number }) {
  const color =
    kw > 50
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : kw >= 22
      ? "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/30 dark:text-tl-amber-400"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  const label = kw > 50 ? "Carga rápida" : kw >= 22 ? "Semi-rápida" : "Carga lenta";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      <Battery className="w-3.5 h-3.5" />
      <span className="font-mono">{kw} kW</span>
      <span aria-hidden="true">·</span>
      {label}
    </span>
  );
}

export default async function ChargerDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();
  const { charger, nearby, sameNetworkProvince, nearbyGas, lat, lng } = data;

  // Map URLs — deep-link both Google Maps and Apple Maps so the user's
  // platform handles natively (Android opens GMaps, iOS opens AMaps).
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const amapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  const gmapsViewUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  // ----- JSON-LD -----
  const evSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "EVChargingStation",
    name: charger.name,
    url: `${BASE_URL}/carga-ev/punto/${charger.id}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
    },
    ...(charger.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: charger.address,
        addressLocality: charger.city ?? undefined,
        addressRegion: charger.provinceName ?? undefined,
        postalCode: charger.postalCode ?? undefined,
        addressCountry: "ES",
      },
    }),
    ...(charger.operator && {
      provider: {
        "@type": "Organization",
        name: charger.operator,
      },
    }),
    ...(charger.is24h && { openingHours: "Mo-Su 00:00-24:00" }),
    ...(charger.chargerTypes.length > 0 && {
      amenityFeature: charger.chargerTypes.map((t) => ({
        "@type": "LocationFeatureSpecification",
        name: SCHEMA_CONNECTOR[t] ?? CT[t] ?? t,
      })),
    }),
    ...(charger.powerKw && {
      maximumPowerOutput: `${Number(charger.powerKw)} kW`,
    }),
    ...(charger.paymentMethods.length > 0 && {
      paymentAccepted: charger.paymentMethods,
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Carga EV", item: `${BASE_URL}/carga-ev` },
      ...(charger.city
        ? [{
            "@type": "ListItem",
            position: 3,
            name: charger.city,
            item: `${BASE_URL}/carga-ev/${charger.city.toLowerCase().replace(/\s+/g, "-")}`,
          }]
        : []),
      {
        "@type": "ListItem",
        position: charger.city ? 4 : 3,
        name: charger.name,
        item: `${BASE_URL}/carga-ev/punto/${charger.id}`,
      },
    ],
  };

  const kw = charger.powerKw ? Number(charger.powerKw) : null;

  return (
    <>
      <StructuredData data={[evSchema, breadcrumbSchema]} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Carga EV", href: "/carga-ev" },
              ...(charger.city
                ? [{ name: charger.city, href: `/carga-ev/${charger.city.toLowerCase().replace(/\s+/g, "-")}` }]
                : []),
              { name: charger.name, href: `/carga-ev/punto/${charger.id}` },
            ]}
          />
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Hero */}
          <header>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {kw !== null && <PowerBadge kw={kw} />}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  charger.isPublic
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {charger.isPublic ? "Público" : "Privado"}
              </span>
              {charger.is24h && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-tl-100 text-tl-700 dark:bg-tl-900/30 dark:text-tl-400">
                  <Clock className="w-3 h-3" />
                  24 h
                </span>
              )}
              {charger.connectors && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <Plug className="w-3 h-3" />
                  <span className="font-mono">{charger.connectors}</span> puntos
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {charger.name}
            </h1>
            {(charger.operator || charger.network) && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {charger.operator}
                {charger.operator && charger.network && <span className="text-gray-400">·</span>}
                {charger.network && <span className="text-gray-500 dark:text-gray-400">red {charger.network}</span>}
              </p>
            )}
          </header>

          {/* "Cómo llegar" — primary CTAs */}
          <section
            aria-label="Cómo llegar"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-tl-600 text-white text-sm font-semibold hover:bg-tl-700 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Cómo llegar (Google Maps)
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={amapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-tl-200 dark:border-tl-700 text-tl-700 dark:text-tl-300 text-sm font-semibold hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Apple Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
              Las apps de mapas abrirán la ruta nativa según tu dispositivo
            </p>
          </section>

          {/* Location + details */}
          <section
            aria-label="Ubicación y detalles"
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Ubicación
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {charger.address && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Dirección</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    <a
                      href={gmapsViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {charger.address}
                    </a>
                  </dd>
                </div>
              )}
              {charger.city && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Ciudad</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/carga-ev/${charger.city.toLowerCase().replace(/\s+/g, "-")}`}
                      className="hover:underline"
                    >
                      {charger.city}
                    </Link>
                  </dd>
                </div>
              )}
              {charger.provinceName && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Provincia</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {charger.provinceName}
                  </dd>
                </div>
              )}
              {charger.postalCode && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Código postal</dt>
                  <dd className="font-mono text-gray-900 dark:text-gray-100">{charger.postalCode}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Coordenadas</dt>
                <dd className="font-mono text-xs text-gray-600 dark:text-gray-400">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Connectors */}
          {charger.chargerTypes.length > 0 && (
            <section
              aria-label="Conectores"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Plug className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Tipos de conector
              </h2>
              <div className="flex flex-wrap gap-2">
                {charger.chargerTypes.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800/50"
                  >
                    <Plug className="w-3.5 h-3.5" />
                    {CT[t] ?? t}
                  </span>
                ))}
              </div>
              {kw !== null && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Potencia máxima del puesto:{" "}
                  <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                    {kw} kW
                  </span>
                  {kw > 50 && " — añadir 100 km de autonomía en ~15 min según vehículo."}
                  {kw >= 22 && kw <= 50 && " — recarga típica en 1-2 h."}
                  {kw < 22 && " — recarga lenta, ideal para estancia prolongada."}
                </p>
              )}
            </section>
          )}

          {/* Payment methods */}
          {charger.paymentMethods.length > 0 && (
            <section
              aria-label="Métodos de pago"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Métodos de pago aceptados
              </h2>
              <div className="flex flex-wrap gap-2">
                {charger.paymentMethods.map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Nearby chargers */}
          {nearby.length > 0 && (
            <section
              aria-label="Cargadores cercanos"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Cargadores cercanos
              </h2>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {nearby.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/carga-ev/punto/${c.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {[c.operator, c.network, c.city].filter(Boolean).join(" · ")}
                          {c.is24h && " · 24h"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {c.powerKw && (
                          <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {Number(c.powerKw)} kW
                          </span>
                        )}
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {fmtKm(c.distanceKm)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Same-network chargers */}
          {charger.network && sameNetworkProvince.length > 0 && (
            <section
              aria-label={`Más cargadores de ${charger.network}`}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Otros cargadores de {charger.network}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sameNetworkProvince.map((c) => (
                  <Link
                    key={c.id}
                    href={`/carga-ev/punto/${c.id}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {c.city}
                        {c.powerKw && <span className="font-mono ml-1">· {Number(c.powerKw)} kW</span>}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Nearby gas stations — multi-fuel households */}
          {nearbyGas.length > 0 && (
            <section
              aria-label="Gasolineras cercanas"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-tl-amber-600 dark:text-tl-amber-400" />
                Gasolineras cercanas
              </h2>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {nearbyGas.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/gasolineras/terrestres/${s.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {s.brand ?? s.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {s.locality}
                          {s.priceGasoleoA && (
                            <span className="font-mono ml-2">
                              Diésel {Number(s.priceGasoleoA).toFixed(3)} €
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fmtKm(s.distanceKm)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* More EV resources */}
          <section
            aria-label="Más sobre carga eléctrica"
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Más sobre carga eléctrica
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/carga-ev/cerca"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
              >
                <Zap className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    Cargadores cerca de mí
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Por geolocalización
                  </p>
                </div>
              </Link>
              <Link
                href="/cuanto-cuesta-cargar"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
              >
                <CreditCard className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    ¿Cuánto cuesta cargar?
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Coste medio por kWh
                  </p>
                </div>
              </Link>
            </div>
          </section>

          {/* Attribution */}
          <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span>
              Catálogo derivado de la red estatal de puntos de recarga eléctrica.
              {charger.lastUpdated && (
                <>
                  {" "}Última actualización del registro:{" "}
                  <time
                    dateTime={charger.lastUpdated.toISOString()}
                    className="font-mono"
                  >
                    {charger.lastUpdated.toLocaleDateString("es-ES")}
                  </time>
                  .
                </>
              )}
            </span>
          </footer>

        </main>
      </div>
    </>
  );
}

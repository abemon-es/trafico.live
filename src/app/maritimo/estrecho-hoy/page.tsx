import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Anchor, Clock, ExternalLink, Ship, Waves, Wind } from "lucide-react";
import { prisma } from "@/lib/db";
import { vesselSlug } from "@/lib/vessel-utils";
import {
  STRAIT_ALERT_PROVINCES,
  STRAIT_BOX,
  STRAIT_FORECAST_ZONE,
  STRAIT_PORTS,
  forecastsLevante,
  isPassengerShip,
  straitForecastPassages,
  type ForecastPassage,
} from "@/lib/maritime/estrecho";

export const revalidate = 300; // 5 min

// Internal page in trial: out of search engines and out of every sitemap.
export const metadata: Metadata = {
  title: "Estrecho hoy — Algeciras, Tarifa, Ceuta y Tánger",
  description:
    "Ferris en el Estrecho en este momento, salidas detectadas en las últimas 24 horas y previsión costera y avisos de AEMET.",
  robots: { index: false, follow: false },
};

const BALEARIA_TIMETABLE_URL = "https://www.balearia.com/";

const VESSEL_WINDOW_MIN = 20;
const DEPARTURES_WINDOW_H = 24;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface VesselNow {
  mmsi: number;
  name: string | null;
  shipType: number | null;
  destination: string | null;
  sog: number | null;
  createdAt: Date;
}

async function getVesselsNow(): Promise<VesselNow[] | null> {
  try {
    const since = new Date(Date.now() - VESSEL_WINDOW_MIN * 60 * 1000);
    const b = STRAIT_BOX;
    return await prisma.$queryRaw<VesselNow[]>`
      SELECT DISTINCT ON (vp.mmsi)
        vp.mmsi, v.name, v."shipType", v.destination, vp.sog, vp."createdAt"
      FROM "VesselPosition" vp
      JOIN "Vessel" v ON v.mmsi = vp.mmsi
      WHERE vp."createdAt" > ${since}
        AND vp.latitude BETWEEN ${b.minLat} AND ${b.maxLat}
        AND vp.longitude BETWEEN ${b.minLng} AND ${b.maxLng}
      ORDER BY vp.mmsi, vp."createdAt" DESC
    `;
  } catch {
    return null;
  }
}

interface Departure {
  mmsi: number;
  portCode: string;
  departedAt: Date;
  name: string | null;
  destination: string | null;
}

async function getDepartures(): Promise<Departure[] | null> {
  try {
    const since = new Date(Date.now() - DEPARTURES_WINDOW_H * 60 * 60 * 1000);
    const calls = await prisma.portCall.findMany({
      where: { portCode: { in: STRAIT_PORTS.map((p) => p.code) }, departedAt: { gte: since } },
      orderBy: { departedAt: "desc" },
      take: 300,
      select: { mmsi: true, portCode: true, departedAt: true },
    });
    const vessels = await prisma.vessel.findMany({
      where: { mmsi: { in: [...new Set(calls.map((c) => c.mmsi))] } },
      select: { mmsi: true, name: true, shipType: true, destination: true },
    });
    const byMmsi = new Map(vessels.map((v) => [v.mmsi, v]));
    return calls
      .filter((c) => isPassengerShip(byMmsi.get(c.mmsi)?.shipType))
      .map((c) => ({
        mmsi: c.mmsi,
        portCode: c.portCode!,
        departedAt: c.departedAt!,
        name: byMmsi.get(c.mmsi)?.name ?? null,
        destination: byMmsi.get(c.mmsi)?.destination ?? null,
      }));
  } catch {
    return null;
  }
}

interface StraitForecast {
  issuedAt: Date;
  waveHeightMax: number | null;
  windForceMax: number | null;
  seaState: string | null;
  passages: ForecastPassage[];
}

async function getForecast(): Promise<StraitForecast | null> {
  try {
    const f = await prisma.maritimeWeatherForecast.findFirst({
      where: { zoneId: STRAIT_FORECAST_ZONE },
      orderBy: { issuedAt: "desc" },
      select: { issuedAt: true, waveHeightMax: true, windForceMax: true, seaState: true, forecast: true },
    });
    if (!f) return null;
    return {
      issuedAt: f.issuedAt,
      waveHeightMax: f.waveHeightMax != null ? Number(f.waveHeightMax) : null,
      windForceMax: f.windForceMax,
      seaState: f.seaState,
      passages: straitForecastPassages(f.forecast),
    };
  } catch {
    return null;
  }
}

async function getAlerts() {
  try {
    return await prisma.weatherAlert.findMany({
      where: { type: "COASTAL", isActive: true, province: { in: STRAIT_ALERT_PROVINCES } },
      orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
      select: { id: true, severity: true, provinceName: true, description: true, startedAt: true, endedAt: true },
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const madridTime = (d: Date) =>
  d.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hour12: false });

const madridDateTime = (d: Date) =>
  d.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const portName = (code: string) => STRAIT_PORTS.find((p) => p.code === code)?.name ?? code;

function Unavailable() {
  return <p className="text-sm text-gray-500 dark:text-gray-400">Dato no disponible ahora mismo.</p>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function EstrechoHoyPage() {
  const [vessels, departures, forecast, alerts] = await Promise.all([
    getVesselsNow(),
    getDepartures(),
    getForecast(),
    getAlerts(),
  ]);

  const ferries = (vessels ?? [])
    .filter((v) => isPassengerShip(v.shipType))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"));
  const levante = forecast ? forecastsLevante(forecast.passages) : false;
  const departuresByPort = STRAIT_PORTS.map((p) => ({
    ...p,
    count: (departures ?? []).filter((d) => d.portCode === p.code).length,
  }));

  return (
    <>
      <div className="bg-gradient-to-br from-tl-sea-700 via-tl-sea-600 to-tl-sea-500 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
          <p className="text-xs uppercase tracking-wide text-tl-sea-100">Uso interno · página en pruebas</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-heading font-bold leading-tight">Estrecho hoy</h1>
          <p className="text-tl-sea-100 text-sm mt-1">Algeciras · Tarifa · Ceuta · Tánger Med · Tánger Ciudad</p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Ferris en el Estrecho ahora</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">{vessels ? ferries.length : "—"}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Salidas detectadas (24 h)</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">
                {departures ? departures.length : "—"}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Avisos costeros activos</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">{alerts ? alerts.length : "—"}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Levante en la previsión</div>
              <div className="font-mono font-bold text-lg mt-0.5">{forecast ? (levante ? "Sí" : "No") : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Esta página no da horarios. Las salidas se detectan por AIS cuando un buque de pasaje deja el puerto, y puede
          faltar alguna. Para saber si un barco sale y a qué hora, consulta siempre a la naviera:{" "}
          <a
            href={BALEARIA_TIMETABLE_URL}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold text-tl-sea-700 dark:text-tl-sea-300 underline inline-flex items-center gap-1"
          >
            horarios oficiales de Baleària <ExternalLink className="w-3.5 h-3.5" />
          </a>
          .
        </p>

        {/* Warnings ------------------------------------------------------- */}
        <section>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-tl-amber-500" />
            Avisos costeros de AEMET (Cádiz y Ceuta)
          </h2>
          {alerts === null ? (
            <Unavailable />
          ) : alerts.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">Sin avisos costeros activos.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-tl-amber-300 bg-tl-amber-50 dark:bg-tl-amber-900/20 dark:border-tl-amber-700 p-3 text-sm"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {a.provinceName ?? "Costa"} · {madridDateTime(a.startedAt)}
                    {a.endedAt ? ` → ${madridDateTime(a.endedAt)}` : ""}
                  </div>
                  {a.description && <p className="mt-1 text-gray-700 dark:text-gray-300">{a.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Forecast ------------------------------------------------------- */}
        <section>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Wind className="w-5 h-5 text-tl-sea-500" />
            Previsión costera
          </h2>
          {!forecast ? (
            <Unavailable />
          ) : (
            <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 p-4 space-y-3">
              {levante && (
                <p className="rounded-lg bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-300 dark:border-tl-amber-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  La previsión habla de levante en la zona del Estrecho.
                </p>
              )}
              {forecast.passages.length > 0 ? (
                forecast.passages.map((p) => (
                  <div key={p.name + p.text}>
                    <div className="text-xs font-semibold text-tl-sea-700 dark:text-tl-sea-300">{p.name}</div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{p.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Costa de Andalucía Occidental y Ceuta
                  {forecast.windForceMax != null ? ` · viento hasta fuerza ${forecast.windForceMax}` : ""}
                  {forecast.waveHeightMax != null ? ` · olas hasta ${forecast.waveHeightMax} m` : ""}
                  {forecast.seaState ? ` · ${forecast.seaState}` : ""}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Clock className="w-3 h-3" />
                Emitida {madridDateTime(forecast.issuedAt)} · Fuente: AEMET
              </div>
            </div>
          )}
        </section>

        {/* Departures ----------------------------------------------------- */}
        <section>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Anchor className="w-5 h-5 text-tl-sea-500" />
            Salidas detectadas en las últimas 24 horas
          </h2>
          {departures === null ? (
            <Unavailable />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {departuresByPort.map((p) => (
                  <div key={p.code} className="rounded-lg bg-tl-sea-50 dark:bg-tl-sea-900/30 px-3 py-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{p.name}</div>
                    <div className="font-mono font-bold tabular-nums text-gray-900 dark:text-gray-100">{p.count}</div>
                  </div>
                ))}
              </div>
              {departures.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sin salidas de buques de pasaje detectadas en las últimas 24 horas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-800">
                        <th className="py-2 pr-3 font-medium">Hora</th>
                        <th className="py-2 pr-3 font-medium">Puerto</th>
                        <th className="py-2 pr-3 font-medium">Buque</th>
                        <th className="py-2 font-medium">Destino declarado (AIS)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departures.map((d) => (
                        <tr key={`${d.mmsi}-${d.departedAt.toISOString()}`} className="border-b border-gray-100 dark:border-gray-800/60">
                          <td className="py-2 pr-3 font-mono tabular-nums">{madridDateTime(d.departedAt)}</td>
                          <td className="py-2 pr-3">{portName(d.portCode)}</td>
                          <td className="py-2 pr-3">
                            <Link href={`/maritimo/buques/${vesselSlug(d.mmsi, d.name)}`} className="text-tl-sea-700 dark:text-tl-sea-300 hover:underline">
                              {d.name ?? `MMSI ${d.mmsi}`}
                            </Link>
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{d.destination ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {/* Ferries now ---------------------------------------------------- */}
        <section>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Ship className="w-5 h-5 text-tl-sea-500" />
            Ferris en el Estrecho ahora
          </h2>
          {vessels === null ? (
            <Unavailable />
          ) : ferries.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ningún buque de pasaje con posición AIS en los últimos {VESSEL_WINDOW_MIN} minutos.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800">
              {ferries.map((v) => (
                <li key={v.mmsi} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                  <Link href={`/maritimo/buques/${vesselSlug(v.mmsi, v.name)}`} className="font-semibold text-tl-sea-700 dark:text-tl-sea-300 hover:underline">
                    {v.name ?? `MMSI ${v.mmsi}`}
                  </Link>
                  <span className="text-gray-600 dark:text-gray-400">
                    {v.sog != null && v.sog >= 0.5 ? `Navegando · ${v.sog.toFixed(1)} nudos` : "Parado"}
                  </span>
                  {v.destination && <span className="text-gray-500">→ {v.destination}</span>}
                  <span className="ml-auto font-mono text-xs text-gray-500 tabular-nums">{madridTime(v.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
            <Waves className="w-3 h-3" />
            Posiciones AIS de los últimos {VESSEL_WINDOW_MIN} minutos{vessels ? ` · ${vessels.length} buques de todo tipo en la zona` : ""}.
          </p>
        </section>
      </div>
    </>
  );
}

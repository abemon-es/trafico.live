import Link from "next/link";
import { AlertTriangle, Ban, Construction, Snowflake, RefreshCw, ChevronRight } from "lucide-react";
import prisma from "@/lib/db";
import { CLOSED, formatCount as n, incidentPlace, madridTime, since } from "@/lib/road-status";

interface Props {
  /** INE community code, the same field the incidents carry. */
  communityCode: string;
  communityName: string;
}

/**
 * The road status block at the top of /espana/<comunidad> (CMO spec,
 * experiment trafico-estado-carreteras): active incidents, closed roads,
 * roadworks and weather in the community, with the time of the data, the
 * most recent closures and a link to the national page.
 */
export async function CommunityRoadStatus({ communityCode, communityName }: Props) {
  const inCommunity = { community: communityCode };
  const [total, closedCount, roadworks, weatherCount, closures, latest] = await Promise.all([
    prisma.trafficIncident.count({ where: { isActive: true, ...inCommunity } }),
    prisma.trafficIncident.count({ where: { ...CLOSED, ...inCommunity } }),
    prisma.trafficIncident.count({ where: { isActive: true, type: "ROADWORK", ...inCommunity } }),
    prisma.trafficIncident.count({ where: { isActive: true, type: "WEATHER", ...inCommunity } }),
    prisma.trafficIncident.findMany({
      where: { ...CLOSED, ...inCommunity },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { id: true, roadNumber: true, kmPoint: true, municipality: true, provinceName: true, startedAt: true },
    }),
    prisma.trafficIncident.aggregate({ where: { isActive: true }, _max: { fetchedAt: true } }),
  ]);

  const at = latest._max.fetchedAt ?? new Date();
  const hora = madridTime(at);
  const tiles = [
    { icon: <AlertTriangle className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />, value: total, label: "Incidencias activas" },
    { icon: <Ban className="w-5 h-5 text-signal-red" />, value: closedCount, label: "Carreteras cortadas" },
    { icon: <Construction className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />, value: roadworks, label: "Obras" },
    { icon: <Snowflake className="w-5 h-5 text-tl-500" />, value: weatherCount, label: "Meteorología" },
  ];

  return (
    <section
      id="estado"
      aria-labelledby="estado-titulo"
      className="bg-white dark:bg-ink-900 rounded-2xl shadow-sm border border-ink-200 dark:border-ink-800 p-6"
    >
      <h2 id="estado-titulo" className="font-heading text-lg font-bold text-ink-900 dark:text-ink-100">
        Carreteras de {communityName} ahora
      </h2>
      <p className="flex items-center gap-1.5 mt-1 text-xs text-ink-500 dark:text-ink-400">
        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Datos de las {hora}, de la DGT y los servicios autonómicos de tráfico
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-ink-200 dark:border-ink-800 p-3 text-center">
            <div className="flex justify-center mb-1">{t.icon}</div>
            <p className="font-data text-2xl font-bold text-ink-900 dark:text-ink-100">{n(t.value)}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">{t.label}</p>
          </div>
        ))}
      </div>

      <h3 className="font-heading text-base font-semibold text-ink-900 dark:text-ink-100 mt-5 mb-2">
        Carreteras cortadas hoy en {communityName}
      </h3>
      {closures.length === 0 ? (
        <p className="text-sm text-ink-600 dark:text-ink-400">
          A las {hora} no hay ninguna carretera cortada registrada en {communityName}.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {closures.map((c) => (
            <li key={c.id} className="text-sm text-ink-700 dark:text-ink-300">
              <span className="font-medium">{incidentPlace(c)}</span>
              <span className="text-ink-500 dark:text-ink-400"> · desde {since(c.startedAt, at)}</span>
            </li>
          ))}
          {closedCount > closures.length && (
            <li className="text-xs text-ink-500 dark:text-ink-400">
              y {n(closedCount - closures.length)} cortes más en la comunidad
            </li>
          )}
        </ul>
      )}

      <Link
        href="/estado-carreteras"
        className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-tl-600 dark:text-tl-400 hover:underline"
      >
        Estado de las carreteras en toda España <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

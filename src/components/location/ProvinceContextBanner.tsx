import { MapPin, ArrowRight } from "lucide-react";
import type { GeoEntity } from "@/lib/geo/types";
import { getLocationStats } from "@/lib/data/location-stats";
import { prisma } from "@/lib/db";

interface ProvinceContextBannerProps {
  entity: GeoEntity;
}

export async function ProvinceContextBanner({
  entity,
}: ProvinceContextBannerProps) {
  if (!entity.provinceCode) return null;

  // Fetch province + community for slug-based href
  const [province, provinceStats, entityStats] = await Promise.all([
    prisma.province.findUnique({
      where: { code: entity.provinceCode },
      include: { community: true, _count: { select: { municipalities: true } } },
    }),
    getLocationStats("province", entity.provinceCode),
    // Get entity-level stats for comparison
    getLocationStats(
      entity.level === "municipality" || entity.level === "city"
        ? "municipality"
        : "province",
      entity.municipalityCode ?? entity.provinceCode ?? ""
    ),
  ]);

  if (!province) return null;

  const href = `/espana/${province.community.slug}/${province.slug}`;
  const municipalityCount = province._count.municipalities;
  const provinceIncidents = provinceStats?.activeIncidentCount ?? 0;
  const entityIncidents = entityStats?.activeIncidentCount ?? 0;

  // Calculate percentage difference vs provincial average
  let comparisonDiff: number | null = null;
  if (municipalityCount > 0 && provinceStats && entityStats) {
    const avgPerMunicipality = provinceIncidents / municipalityCount;
    if (avgPerMunicipality > 0) {
      comparisonDiff = Math.round(
        ((avgPerMunicipality - entityIncidents) / avgPerMunicipality) * 100
      );
    }
  }

  return (
    <div className="bg-tl-50 border border-tl-200 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <MapPin className="w-4 h-4 text-tl-600 shrink-0" />
          <a
            href={href}
            className="font-heading font-bold text-sm text-tl-700 hover:text-tl-800"
          >
            Provincia de {province.name}
          </a>
          <span className="text-xs text-gray-500">
            — {municipalityCount.toLocaleString("es-ES")} municipios
            {" \u00B7 "}
            {provinceIncidents} incidencia{provinceIncidents !== 1 ? "s" : ""}{" "}
            activa{provinceIncidents !== 1 ? "s" : ""}
          </span>
        </div>
        {comparisonDiff != null && comparisonDiff !== 0 && (
          <p className="mt-1.5 flex items-center gap-1.5">
            {comparisonDiff > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-green/10 text-signal-green text-xs font-data font-bold">
                <span aria-hidden="true">{"\u2193"}</span> {comparisonDiff}% menos
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red/10 text-signal-red text-xs font-data font-bold">
                <span aria-hidden="true">{"\u2191"}</span> {Math.abs(comparisonDiff)}% más
              </span>
            )}
            <span className="text-xs text-gray-500">
              incidencias que la media provincial
            </span>
          </p>
        )}
      </div>
      <a
        href={href}
        className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-tl-600 hover:text-tl-700 whitespace-nowrap"
      >
        Ver provincia
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

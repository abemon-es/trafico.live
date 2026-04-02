import type { GeoEntity } from "@/lib/geo/types";
import { getLocationStats } from "@/lib/data/location-stats";
import { prisma } from "@/lib/db";

interface CitySeoProseProp {
  entity: GeoEntity;
}

export async function CitySeoProse({ entity }: CitySeoProseProp) {
  // Only render for cities/municipalities with 50k+ population
  if (!entity.population || entity.population < 50000) return null;

  const name = entity.name;

  // Determine scope for stats lookup
  const scopeType =
    entity.level === "community"
      ? "community"
      : entity.level === "province"
        ? "province"
        : "municipality";
  const scopeCode =
    entity.communityCode ?? entity.provinceCode ?? entity.municipalityCode;

  if (!scopeCode) return null;

  // Fetch stats and province info concurrently
  const [stats, province] = await Promise.all([
    getLocationStats(scopeType, scopeCode),
    entity.provinceCode
      ? prisma.province.findUnique({
          where: { code: entity.provinceCode },
          include: { community: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);

  if (!stats) return null;

  const provinceName = province?.name ?? entity.parentName ?? "";
  const communityName = province?.community?.name ?? "";

  const gasStationCount = stats.gasStationCount ?? 0;
  const cameraCount = stats.cameraCount ?? 0;
  const radarCount = stats.radarCount ?? 0;
  const evChargerCount = stats.evChargerCount ?? 0;
  const roadCount = stats.roadCount ?? 0;
  const avgIMD = stats.avgIMD;
  const accidentsLatestYear = stats.accidentsLatestYear;
  const fatalitiesLatestYear = stats.fatalitiesLatestYear;
  const accidentYear = stats.accidentYear;

  const minDieselPrice = stats.minDieselPrice
    ? Number(stats.minDieselPrice)
    : null;

  return (
    <section className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">
        <h2 className="font-heading text-sm font-bold text-gray-900">
          Sobre el trafico en {name}
        </h2>

        <p>
          <strong className="text-gray-900">{name}</strong> es un municipio de{" "}
          {entity.population.toLocaleString("es-ES")} habitantes
          {provinceName && (
            <>
              {" "}
              en la provincia de {provinceName}
            </>
          )}
          {communityName && (
            <>
              , comunidad autonoma de {communityName}
            </>
          )}
          . Cuenta con{" "}
          <strong>{gasStationCount} gasolineras</strong>
          {minDieselPrice != null && (
            <>
              {" "}
              (la mas economica ofrece gasoleo A a{" "}
              <span className="font-data">{minDieselPrice.toFixed(3)}</span>{" "}
              &euro;/L)
            </>
          )}
          , <strong>{cameraCount} camaras de la DGT</strong>,{" "}
          <strong>{radarCount} radares</strong> y{" "}
          <strong>{evChargerCount} puntos de recarga electrica</strong>.
        </p>

        {roadCount > 0 && (
          <>
            <h3 className="font-heading text-sm font-bold text-gray-800">
              Infraestructura vial
            </h3>
            <p>
              La red viaria incluye {roadCount} vias principales.
              {avgIMD != null && (
                <>
                  {" "}
                  La intensidad media diaria de trafico alcanza los{" "}
                  <span className="font-data">
                    {avgIMD.toLocaleString("es-ES")}
                  </span>{" "}
                  vehiculos en las vias de la provincia.
                </>
              )}
            </p>
          </>
        )}

        {accidentsLatestYear != null && accidentYear != null && (
          <>
            <h3 className="font-heading text-sm font-bold text-gray-800">
              Seguridad vial
            </h3>
            <p>
              En {accidentYear}, la provincia registro{" "}
              <span className="font-data">
                {accidentsLatestYear.toLocaleString("es-ES")}
              </span>{" "}
              accidentes
              {fatalitiesLatestYear != null && (
                <>
                  {" "}
                  con{" "}
                  <span className="font-data">{fatalitiesLatestYear}</span>{" "}
                  victimas mortales
                </>
              )}
              .
            </p>
          </>
        )}

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
          Todos los datos se actualizan en tiempo real. Fuentes: DGT, MINETUR,
          AEMET, MITERD.
        </p>
      </div>
    </section>
  );
}

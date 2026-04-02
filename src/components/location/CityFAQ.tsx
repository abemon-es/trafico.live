import type { GeoEntity } from "@/lib/geo/types";
import { getLocationStats } from "@/lib/data/location-stats";

interface CityFAQProps {
  entity: GeoEntity;
}

interface FAQItem {
  question: string;
  answer: string;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return "0";
  return value.toLocaleString("es-ES");
}

function formatPrice(value: unknown): string {
  if (value == null) return "—";
  const num =
    typeof value === "object" && "toFixed" in (value as object)
      ? parseFloat(String(value))
      : Number(value);
  if (isNaN(num)) return "—";
  return num.toFixed(3);
}

export async function CityFAQ({ entity }: CityFAQProps) {
  if (!entity.population || entity.population < 50000) return null;

  const scopeType =
    entity.level === "municipality" || entity.level === "city"
      ? "municipality"
      : "province";
  const scopeCode =
    entity.municipalityCode ?? entity.provinceCode ?? "";

  const stats = await getLocationStats(scopeType, scopeCode);

  if (!stats) return null;

  const name = entity.name;

  const questions: FAQItem[] = [
    {
      question: `\u00BFC\u00F3mo est\u00E1 el tr\u00E1fico en ${name} hoy?`,
      answer: `El tr\u00E1fico en ${name} presenta ${formatNumber(stats.activeIncidentCount)} incidencias activas.${
        stats.avgIMD
          ? ` La intensidad media diaria es de ${formatNumber(stats.avgIMD)} veh\u00EDculos/d\u00EDa.`
          : ""
      }`,
    },
    {
      question: `\u00BFCu\u00E1l es la gasolinera m\u00E1s barata?`,
      answer: `En ${name} hay ${formatNumber(stats.gasStationCount)} gasolineras.${
        stats.minDieselPrice != null
          ? ` La m\u00E1s econ\u00F3mica ofrece gas\u00F3leo A a ${formatPrice(stats.minDieselPrice)} \u20AC/L${
              stats.avgDieselPrice != null
                ? `, frente a la media de ${formatPrice(stats.avgDieselPrice)} \u20AC/L.`
                : "."
            }`
          : ""
      }`,
    },
    {
      question: `\u00BFCu\u00E1ntos radares hay?`,
      answer: `La provincia cuenta con ${formatNumber(stats.radarCount)} radares activos de la DGT.`,
    },
    {
      question: `\u00BFTiene zona ZBE?`,
      answer:
        stats.zbeCount > 0
          ? `${name} cuenta con ${stats.zbeCount} zona${stats.zbeCount !== 1 ? "s" : ""} de bajas emisiones activa${stats.zbeCount !== 1 ? "s" : ""}.`
          : `No hay ZBE activas en ${name}.`,
    },
    {
      question: `\u00BFCu\u00E1ntos puntos de recarga EV hay?`,
      answer: `${name} dispone de ${formatNumber(stats.evChargerCount)} puntos de recarga para veh\u00EDculos el\u00E9ctricos.`,
    },
    {
      question: `\u00BFQu\u00E9 carreteras principales pasan por ${name}?`,
      answer: `Por ${name} y su provincia discurren ${formatNumber(stats.roadCount)} carreteras catalogadas por la DGT.`,
    },
    {
      question: `\u00BFCu\u00E1les son las horas punta de tr\u00E1fico?`,
      answer: `Las horas de mayor intensidad en ${name} suelen ser de 7:30 a 9:30 y de 17:30 a 20:00 en d\u00EDas laborables. Los viernes por la tarde y domingos por la noche registran mayores vol\u00FAmenes en accesos y salidas.`,
    },
    {
      question: `\u00BFCu\u00E1ntos accidentes hubo?`,
      answer:
        stats.accidentsLatestYear != null && stats.accidentYear
          ? `En ${stats.accidentYear} se registraron ${formatNumber(stats.accidentsLatestYear)} accidentes${
              stats.fatalitiesLatestYear != null
                ? ` con ${formatNumber(stats.fatalitiesLatestYear)} v\u00EDctimas mortales`
                : ""
            } en la provincia.`
          : `No se dispone de datos hist\u00F3ricos de accidentes para ${name}.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section
        id="faq"
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      >
        <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
          Preguntas frecuentes sobre {name}
        </h2>
        <div className="divide-y divide-gray-100">
          {questions.map((q) => (
            <details className="group py-3" key={q.question}>
              <summary className="flex items-center justify-between text-sm font-semibold text-gray-900 hover:text-tl-600 cursor-pointer">
                {q.question}
                <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform">
                  {"\u25BC"}
                </span>
              </summary>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {q.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

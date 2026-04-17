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
      question: `¿Cómo está el tráfico en ${name} hoy?`,
      answer: `El tráfico en ${name} presenta ${formatNumber(stats.activeIncidentCount)} incidencias activas.${
        stats.avgIMD
          ? ` La intensidad media diaria es de ${formatNumber(stats.avgIMD)} vehículos/día.`
          : ""
      }`,
    },
    {
      question: `¿Cuál es la gasolinera más barata?`,
      answer: `En ${name} hay ${formatNumber(stats.gasStationCount)} gasolineras.${
        stats.minDieselPrice != null
          ? ` La más económica ofrece gasóleo A a ${formatPrice(stats.minDieselPrice)} €/L${
              stats.avgDieselPrice != null
                ? `, frente a la media de ${formatPrice(stats.avgDieselPrice)} €/L.`
                : "."
            }`
          : ""
      }`,
    },
    {
      question: `¿Cuántos radares hay?`,
      answer: `La provincia cuenta con ${formatNumber(stats.radarCount)} radares activos de la DGT.`,
    },
    {
      question: `¿Tiene zona ZBE?`,
      answer:
        stats.zbeCount > 0
          ? `${name} cuenta con ${stats.zbeCount} zona${stats.zbeCount !== 1 ? "s" : ""} de bajas emisiones activa${stats.zbeCount !== 1 ? "s" : ""}.`
          : `No hay ZBE activas en ${name}.`,
    },
    {
      question: `¿Cuántos puntos de recarga EV hay?`,
      answer: `${name} dispone de ${formatNumber(stats.evChargerCount)} puntos de recarga para vehículos eléctricos.`,
    },
    {
      question: `¿Qué carreteras principales pasan por ${name}?`,
      answer: `Por ${name} y su provincia discurren ${formatNumber(stats.roadCount)} carreteras catalogadas por la DGT.`,
    },
    {
      question: `¿Cuáles son las horas punta de tráfico?`,
      answer: `Las horas de mayor intensidad en ${name} suelen ser de 7:30 a 9:30 y de 17:30 a 20:00 en días laborables. Los viernes por la tarde y domingos por la noche registran mayores volúmenes en accesos y salidas.`,
    },
    {
      question: `¿Cuántos accidentes hubo?`,
      answer:
        stats.accidentsLatestYear != null && stats.accidentYear
          ? `En ${stats.accidentYear} se registraron ${formatNumber(stats.accidentsLatestYear)} accidentes${
              stats.fatalitiesLatestYear != null
                ? ` con ${formatNumber(stats.fatalitiesLatestYear)} víctimas mortales`
                : ""
            } en la provincia.`
          : `No se dispone de datos históricos de accidentes para ${name}.`,
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
                  {"▼"}
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

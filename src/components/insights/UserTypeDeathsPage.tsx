/**
 * A page of deaths at 30 days for one or two user types (src/lib/
 * user-type-deaths.ts): /inteligencia/camiones, /motociclistas and
 * /ciclistas-y-peatones (CMO, 2026-10-22). The DGT publishes deaths by user
 * type, not the vehicles involved, so these pages count people killed, never
 * «accidentes con camión» or «de moto». Every year and figure comes from the
 * database.
 */

import type { LucideIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import type { DeathField, UserTypeDeaths } from "@/lib/user-type-deaths";
import { DeathsBarChart } from "./UserTypeDeathsCharts";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export interface UserTypeSeries {
  field: DeathField;
  /** Table and legend label, e.g. «Camión de más de 3.500 kg». */
  label: string;
  /** In a sentence, plural, e.g. «ocupantes de camiones de más de 3.500 kg». */
  plural: string;
}

export interface UserTypeDeathsConfig {
  slug: string;
  /** H1, without years. */
  title: string;
  /** Short name in breadcrumbs. */
  crumb: string;
  /** The user types together, for chart titles: «Ocupantes de camión». */
  subject: string;
  icon: LucideIcon;
  series: UserTypeSeries[];
  /** What the figure counts, when it needs saying (the trucks). */
  note?: string;
}

export const fieldsKey = (c: UserTypeDeathsConfig) => c.series.map((s) => s.field).join(",");

const fmt = (n: number) => n.toLocaleString("es-ES");
const pct = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });
const DAYS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const list = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0]);

/** «N ocupantes de …» per series, joined: the figures in a sentence. */
function inWords(c: UserTypeDeathsConfig, deaths: Record<string, number>) {
  return list(c.series.map((s) => `${fmt(deaths[s.field] ?? 0)} ${s.plural}`));
}

/** The intro, from the data. Exported for the page's description. */
export function introSentence(c: UserTypeDeathsConfig, d: UserTypeDeaths): string {
  const latest = d.byYear[d.byYear.length - 1];
  const latestSum = c.series.reduce((s, x) => s + (latest.deaths[x.field] ?? 0), 0);
  const share = latest.allDeaths > 0 ? (latestSum / latest.allDeaths) * 100 : 0;
  return (
    `Entre ${d.from} y ${d.to} fallecieron a 30 días en accidentes de tráfico en España ${inWords(c, d.totals)}, según los microdatos de la DGT. ` +
    `En ${d.to} fueron ${inWords(c, latest.deaths)}: el ${pct(share)} % de todos los fallecidos de ese año.`
  );
}

export function UserTypeDeathsPage({ config: c, data: d }: { config: UserTypeDeathsConfig; data: UserTypeDeaths }) {
  const Icon = c.icon;
  const series = c.series.map((s) => ({ key: s.field, label: s.label }));
  const row = (deaths: Record<string, number>) => Object.fromEntries(c.series.map((s) => [s.field, deaths[s.field] ?? 0]));
  const latest = d.byYear[d.byYear.length - 1];

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${c.title} en España ${d.from}-${d.to}`,
    description: introSentence(c, d),
    url: `${BASE_URL}/inteligencia/${c.slug}`,
    temporalCoverage: `${d.from}/${d.to}`,
    spatialCoverage: { "@type": "Place", name: "España" },
    variableMeasured: c.series.map((s) => `Fallecidos a 30 días: ${s.label.toLowerCase()}`),
    isBasedOn: "https://www.dgt.es",
    creator: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <StructuredData data={datasetSchema} />
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Inteligencia", href: "/inteligencia/lluvia-y-accidentes" },
          { name: c.crumb, href: `/inteligencia/${c.slug}` },
        ]}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
            <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">{c.title}</h1>
        </div>
        <p className="text-gray-700 dark:text-gray-300 max-w-3xl leading-relaxed">{introSentence(c, d)}</p>
        {c.note && <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">{c.note}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {c.series.map((s) => (
          <div key={s.field} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}, {d.from}–{d.to}</p>
            <p className="text-2xl font-data font-bold text-gray-900 dark:text-gray-100">{fmt(d.totals[s.field] ?? 0)}</p>
          </div>
        ))}
        {c.series.map((s) => (
          <div key={`${s.field}-latest`} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}, {d.to}</p>
            <p className="text-2xl font-data font-bold text-gray-900 dark:text-gray-100">{fmt(latest.deaths[s.field] ?? 0)}</p>
          </div>
        ))}
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Evolución y horario">
        <DeathsBarChart
          title={`${c.subject} fallecidos por año`}
          description="Fallecidos a 30 días."
          data={d.byYear.map((y) => ({ year: String(y.year), ...row(y.deaths) }))}
          xKey="year"
          series={series}
        />
        <DeathsBarChart
          title={`${c.subject} fallecidos por hora del accidente`}
          description={`Fallecidos a 30 días, ${d.from}–${d.to}.`}
          data={d.byHour.map((h) => ({ hour: `${String(h.hour).padStart(2, "0")}:00`, ...row(h.deaths) }))}
          xKey="hour"
          series={series}
        />
        <DeathsBarChart
          title={`${c.subject} fallecidos por día de la semana`}
          description={`Fallecidos a 30 días, ${d.from}–${d.to}.`}
          data={d.byDayOfWeek.map((x) => ({ day: DAYS[x.dayOfWeek] ?? String(x.dayOfWeek), ...row(x.deaths) }))}
          xKey="day"
          series={series}
        />
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-base font-heading font-semibold text-gray-900 dark:text-gray-100">Vías urbanas e interurbanas</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Fallecidos a 30 días, {d.from}–{d.to}.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-1 font-medium"> </th>
                <th className="py-1 font-medium text-right">Interurbanas</th>
                <th className="py-1 font-medium text-right">Urbanas</th>
              </tr>
            </thead>
            <tbody>
              {c.series.map((s) => (
                <tr key={s.field} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-1.5 text-gray-700 dark:text-gray-300">{s.label}</td>
                  <td className="py-1.5 text-right font-data">{fmt(d.byZone.interurban[s.field] ?? 0)}</td>
                  <td className="py-1.5 text-right font-data">{fmt(d.byZone.urban[s.field] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="provincias">
        <h2 id="provincias" className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
          Provincias con más {c.subject.toLowerCase()} fallecidos
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Fallecidos a 30 días, {d.from}–{d.to}. Las 10 primeras.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2 font-medium">Provincia</th>
                {c.series.map((s) => (
                  <th key={s.field} className="px-3 py-2 font-medium text-right">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.byProvince.slice(0, 10).map((p) => (
                <tr key={p.province} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{PROVINCE_NAMES[p.province] ?? p.province}</td>
                  {c.series.map((s) => (
                    <td key={s.field} className="px-3 py-2 text-right font-data">{fmt(p.deaths[s.field] ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-3xl">
        Fallecidos a 30 días, el estándar de la DGT: personas de cada tipo de usuario que murieron en el accidente o en
        los 30 días siguientes. Cuenta personas, no accidentes. Fuente: DGT, microdatos de accidentes con víctimas
        {` ${d.from}–${d.to}`}.
      </p>
    </main>
  );
}

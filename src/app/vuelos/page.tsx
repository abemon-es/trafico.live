import Link from "next/link";
import { Plane, Radar, Map as MapIcon, Info, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

export const revalidate = 60;

export default function VuelosHubPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden border-b border-tl-100 dark:border-slate-800">
        <TraficoMap
          preset="aviacion"
          controls={{ layerPanel: false, legend: true, themeToggle: false, fullscreen: false }}
          initialView={{ center: [-3.7, 40.4], zoom: 5.2 }}
          className="absolute inset-0"
        />
        <p className="sr-only">Mapa interactivo de vuelos en tiempo real sobre España.</p>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent dark:from-slate-950/95 dark:via-slate-950/70 p-8 md:p-12">
          <div className="pointer-events-auto max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-tl-200 bg-white/90 px-3 py-1 text-xs font-medium text-tl-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-tl-200">
              <Radar className="h-3.5 w-3.5" /> En directo · OpenSky ADS-B
            </div>
            <h1 className="font-['Exo_2'] text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
              Vuelos en directo sobre España
            </h1>
            <p className="mt-3 max-w-2xl font-['DM_Sans'] text-base text-slate-600 dark:text-slate-300">
              Sigue aeronaves en tiempo real con datos ADS-B abiertos. Filtra por aerolínea, altitud o tipo de aparato.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/vuelos/mapa"
                className="inline-flex items-center gap-2 rounded-lg bg-tl-600 px-4 py-2 text-sm font-medium text-white hover:bg-tl-700 transition-colors"
              >
                <MapIcon className="h-4 w-4" /> Abrir mapa completo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/aviacion"
                className="inline-flex items-center gap-2 rounded-lg border border-tl-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-tl-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Hub de aviación
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={Plane}
            title="Filtros por aerolínea"
            description="Aislar flotas comerciales, chárter y aviación general sobre el espacio aéreo español."
          />
          <FeatureCard
            icon={Radar}
            title="Altitud y velocidad"
            description="Rango configurable en niveles de vuelo (FL) con actualización ADS-B cada 15 minutos."
          />
          <FeatureCard
            icon={Info}
            title="Click → ficha del vuelo"
            description="Callsign, ruta estimada, tipo de aeronave y último contacto. Atribución OpenSky (CC BY 4.0)."
          />
        </div>

        <div className="mt-10 rounded-xl border border-tl-100 bg-tl-50/40 p-6 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-white">Próximamente:</strong>{" "}
            histórico 24h, heatmap de rutas y alertas por aerolínea en la S2 del roadmap.
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Plane;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-tl-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-tl-50 text-tl-600 dark:bg-slate-800 dark:text-tl-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-['Exo_2'] text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 font-['DM_Sans'] text-sm text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

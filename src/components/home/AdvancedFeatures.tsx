import { Globe, Radio, Radar, Ship } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HomeStats } from "@/app/HomeClient";
import { withCount } from "./counts";

interface Feature {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badge: "Activo" | "Próximo";
  title: string;
  description: string;
  techDetail: string;
}

// Counts are live: the descriptions read «4.247 detectores» and «4.000+
// radares», written by hand, against 7.309 and 737 in the database. Only
// features that work today: «Predicción IA» and «Visión por cámara (YOLO)»,
// badged «Próximo», are off the home until they ship; «Buques en tiempo
// real», badged «Próximo» too, has been live since the AIS collector.
const features = (stats: HomeStats): Feature[] => [
  {
    icon: Globe,
    iconBg: "bg-tl-50 dark:bg-tl-900/30",
    iconColor: "text-tl-600 dark:text-tl-400",
    badge: "Activo",
    title: "Globe View 3D",
    description:
      "Vista de globo terráqueo con MapLibre v5. Zoom desde la Tierra hasta nivel calle con edificios 3D.",
    techDetail: "MapLibre GL JS v5 · projection: 'globe'",
  },
  {
    icon: Radio,
    iconBg: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-signal-green",
    badge: "Activo",
    title: "Flujo de tráfico vivo",
    description:
      `Velocidad, intensidad y ocupación cada 5 minutos desde ${withCount(stats.detectorCount, "detectores DGT")}. Carreteras coloreadas por estado.`,
    techDetail: "TrafficDetector · TrafficReading · DATEX II",
  },
  {
    icon: Radar,
    iconBg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
    iconColor: "text-tl-amber-500 dark:text-tl-amber-400",
    badge: "Activo",
    title: "Alertas radar proximidad",
    description:
      `GPS del usuario + ${withCount(stats.radarCount, "radares")} con coordenadas exactas + límites de velocidad. Alerta por voz a 1 km y 500 m.`,
    techDetail: "useVoiceAlerts · GeolocateControl · HUD",
  },
  {
    icon: Ship,
    iconBg: "bg-tl-sea-50 dark:bg-tl-sea-900/20",
    iconColor: "text-tl-sea-500 dark:text-tl-sea-400",
    badge: "Activo",
    title: "Buques en tiempo real",
    description:
      "Posición de buques via AIS WebSocket. Historial de rutas. Tipo, velocidad y destino de cada barco.",
    techDetail: "AISStream.io · OpenSeaMap · MaritimeEmergency",
  },
];

export function AdvancedFeatures({ stats }: { stats: HomeStats }) {
  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 mb-1">
          Tecnología avanzada
        </p>
        <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-2">
          Más allá del mapa convencional
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mb-8">
          Funcionalidades que transforman trafico.live en una plataforma de inteligencia vial
          completa.
        </p>

        {/* 3-column feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features(stats).map((feature) => {
            const Icon = feature.icon;
            const isActive = feature.badge === "Activo";

            return (
              <div
                key={feature.title}
                className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 overflow-hidden transition-all hover:border-tl-300 dark:hover:border-tl-700 hover:shadow-sm"
              >
                {/* Badge */}
                <span
                  className={[
                    "absolute top-3 right-3 text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                    isActive
                      ? "bg-green-50 dark:bg-green-900/20 text-signal-green"
                      : "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
                  ].join(" ")}
                >
                  {feature.badge}
                </span>

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 ${feature.iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>

                {/* Text */}
                <h3 className="font-heading text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Tech detail */}
                <p className="font-data text-xs text-gray-400 dark:text-gray-600 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800">
                  {feature.techDetail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

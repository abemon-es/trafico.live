import Link from "next/link";

const ROAD_FEATURE_LINKS = [
  { label: "Incidencias", href: "/incidencias" },
  { label: "Cámaras", href: "/camaras" },
  { label: "Radares", href: "/radares" },
  { label: "Gasolineras", href: "/gasolineras" },
  { label: "Cargadores EV", href: "/carga-ev" },
  { label: "ZBE", href: "/zbe" },
  { label: "V16", href: "/mapa" },
  { label: "Alertas meteo", href: "/alertas-meteo" },
];

const SEA_FEATURE_LINKS = [
  { label: "Puertos", href: "/maritimo/puertos" },
  { label: "Combustible marítimo", href: "/maritimo/combustible" },
  { label: "Meteorología costera", href: "/maritimo/meteorologia" },
  { label: "Seguridad", href: "/maritimo/emergencias" },
  { label: "SASEMAR", href: "/maritimo/emergencias" },
];

const ROAD_LAYERS = [
  "Flujo de tráfico en tiempo real",
  "Incidencias push via SSE",
  "Radares con alertas de proximidad",
  "Cámaras DGT en directo",
  "Gasolineras y precios",
  "Cargadores eléctricos",
  "Zonas ZBE",
  "Balizas V16",
  "Alertas meteorológicas AEMET",
  "Vista Globe y 2D",
];

const SEA_LAYERS = [
  "Cartas náuticas OpenSeaMap",
  "Posición de buques AIS en vivo",
  "Emergencias y alertas SASEMAR",
  "Meteorología costera AEMET",
  "Combustible en 42 puertos",
  "Oleaje y viento marino",
];

export function TwoMaps() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* Section A: Mapa de carreteras */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: text */}
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-2">
              Mapa de carreteras
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-4">
              Mapa de tráfico en tiempo real
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              El mapa de carreteras de trafico.live integra más de 13 capas interactivas sobre una base vectorial de alta resolución con tecnología MapLibre GL. Visualiza el flujo de tráfico en vivo con colores por velocidad, la posición exacta de incidencias DGT, cámaras en directo y radares con alertas de proximidad. Los datos se actualizan cada 5 minutos vía DATEX II y cada 30 segundos vía SSE para incidencias.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              Disponible en vista Globe para una perspectiva tridimensional de la Península Ibérica, Baleares, Canarias y territorios continentales. Incluye capas opcionales de gasolineras, cargadores eléctricos, zonas ZBE, balizas V16 activas y alertas meteorológicas AEMET.
            </p>

            {/* Layer list */}
            <ul className="space-y-1.5 mb-6">
              {ROAD_LAYERS.map((layer) => (
                <li key={layer} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-1 h-1 rounded-full bg-tl-600 shrink-0" />
                  {layer}
                </li>
              ))}
            </ul>

            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors"
            >
              Abrir mapa de carreteras
            </Link>
          </div>

          {/* Right: visual placeholder */}
          <div className="flex flex-col gap-4">
            <div className="bg-gradient-to-br from-tl-50 to-tl-100 dark:from-tl-950/40 dark:to-tl-900/40 rounded-2xl h-64 flex items-center justify-center border border-tl-200 dark:border-tl-800/50">
              <span className="font-data text-xs text-tl-400 dark:text-tl-500 select-none">
                MapLibre GL · 13 capas · Globe View
              </span>
            </div>

            {/* Feature links row */}
            <div className="flex flex-wrap gap-2">
              {ROAD_FEATURE_LINKS.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Section B: Mapa marítimo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: visual placeholder */}
          <div className="flex flex-col gap-4 order-2 lg:order-1">
            <div className="bg-gradient-to-br from-tl-sea-50 to-tl-sea-100 dark:from-tl-sea-950/40 dark:to-tl-sea-900/40 rounded-2xl h-64 flex items-center justify-center border border-tl-sea-200 dark:border-tl-sea-800/50">
              <span className="font-data text-xs text-tl-sea-400 dark:text-tl-sea-500 select-none">
                MapLibre GL · OpenSeaMap · AIS
              </span>
            </div>

            {/* Feature links row */}
            <div className="flex flex-wrap gap-2">
              {SEA_FEATURE_LINKS.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-tl-sea-500 dark:hover:text-tl-sea-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: text */}
          <div className="order-1 lg:order-2">
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-sea-500 dark:text-tl-sea-400 mb-2">
              Mapa marítimo
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-4">
              Inteligencia marítima de España
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              El mapa marítimo de trafico.live integra cartas náuticas OpenSeaMap con datos en tiempo real de posición de buques via AIS, alertas y emergencias de SASEMAR y meteorología costera de AEMET. Cubre los 42 principales puertos españoles con información actualizada de combustible para embarcaciones.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              Diseñado para náuticos, empresas de transporte marítimo y profesionales del sector portuario. Incluye capas de oleaje, viento marino, temperatura del agua y rutas de navegación habituales del Mediterráneo, Atlántico y Cantábrico.
            </p>

            {/* Layer list */}
            <ul className="space-y-1.5 mb-6">
              {SEA_LAYERS.map((layer) => (
                <li key={layer} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-1 h-1 rounded-full bg-tl-sea-500 shrink-0" />
                  {layer}
                </li>
              ))}
            </ul>

            <Link
              href="/maritimo/mapa"
              className="inline-flex items-center gap-2 bg-tl-sea-500 hover:bg-tl-sea-600 text-white font-heading font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors"
            >
              Abrir mapa marítimo
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

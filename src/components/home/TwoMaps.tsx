import Link from "next/link";

const ROAD_TAGS = [
  "Incidencias",
  "Cámaras",
  "Radares",
  "Flujo vivo",
  "Gasolineras",
  "EV",
  "ZBE",
  "V16",
  "Meteo",
  "Viento",
  "Satélite",
];

const SEA_TAGS = [
  "Cartas náuticas",
  "Buques AIS",
  "SASEMAR",
  "Puertos",
  "Combustible",
  "Meteo costera",
  "Oleaje",
  "Viento",
];

function LayerTag({ label }: { label: string }) {
  return (
    <span className="text-[0.55rem] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
      {label}
    </span>
  );
}

export function TwoMaps() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
          Dos mapas · Una plataforma
        </p>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-1">
          Carretera y mar
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed mb-7">
          Mapa de carreteras con 13+ capas interactivas y flujo de tráfico en
          vivo. Mapa marítimo con cartas náuticas, posición de buques y
          emergencias SASEMAR.
        </p>

        {/* Maps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Road map */}
          <Link
            href="/mapa"
            className="group border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 transition-all"
          >
            {/* Visual area */}
            <div className="h-60 relative flex items-center justify-center bg-gradient-to-br from-[#0d1117] to-[#161b26] overflow-hidden">
              {/* Animated road lines */}
              <span
                className="absolute h-px opacity-0 animate-[fadeIn_0.8s_ease-out_0.3s_forwards]"
                style={{
                  top: "30%",
                  left: "8%",
                  width: "65%",
                  background: "rgba(99,147,255,0.25)",
                  transform: "rotate(-3deg)",
                }}
              />
              <span
                className="absolute h-px opacity-0 animate-[fadeIn_0.8s_ease-out_0.5s_forwards]"
                style={{
                  top: "40%",
                  left: "15%",
                  width: "50%",
                  background: "rgba(99,147,255,0.2)",
                  transform: "rotate(10deg)",
                }}
              />
              <span
                className="absolute h-px opacity-0 animate-[fadeIn_0.8s_ease-out_0.7s_forwards]"
                style={{
                  top: "55%",
                  left: "20%",
                  width: "40%",
                  background: "rgba(99,147,255,0.18)",
                  transform: "rotate(-8deg)",
                }}
              />
              {/* Incident glow */}
              <span
                className="absolute rounded-full blur-[10px] opacity-0 animate-[fadeIn_0.8s_ease-out_0.8s_forwards]"
                style={{
                  top: "30%",
                  left: "40%",
                  width: "40px",
                  height: "40px",
                  background:
                    "radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)",
                }}
              />
              {/* Map badge */}
              <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-tl-400">
                Mapa de carreteras
              </span>
              {/* Center label */}
              <span className="text-white/20 text-xs select-none">
                MapLibre GL · Globe View · 13+ capas
              </span>
            </div>

            {/* Info */}
            <div className="p-4 bg-white dark:bg-gray-950">
              <h3 className="font-heading text-[0.95rem] font-bold text-gray-900 dark:text-gray-100 mb-1">
                Red viaria completa
              </h3>
              <p className="text-[0.725rem] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                Flujo de tráfico en vivo con colores por velocidad. Radares con
                alertas de proximidad. Cámaras DGT en directo. Incidencias push
                via SSE.
              </p>
              <div className="flex flex-wrap gap-1">
                {ROAD_TAGS.map((tag) => (
                  <LayerTag key={tag} label={tag} />
                ))}
              </div>
            </div>
          </Link>

          {/* Sea map */}
          <Link
            href="/maritimo/mapa"
            className="group border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 transition-all"
          >
            {/* Visual area */}
            <div className="h-60 relative flex items-center justify-center bg-gradient-to-br from-[#091e33] to-[#0c2d4a] overflow-hidden">
              {/* Sea wave rings */}
              {[
                { top: "25%", left: "20%", size: 80, delay: "0.5s" },
                { top: "45%", left: "50%", size: 60, delay: "0.8s" },
                { top: "60%", left: "30%", size: 50, delay: "1.2s" },
              ].map((w, i) => (
                <span
                  key={i}
                  className="absolute rounded-full border border-tl-sea-300/20 opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]"
                  style={{
                    top: w.top,
                    left: w.left,
                    width: w.size,
                    height: w.size,
                    animationDelay: w.delay,
                  }}
                />
              ))}
              {/* Ship dots */}
              {[
                { top: "30%", left: "40%", delay: "1s" },
                { top: "50%", left: "60%", delay: "1.3s" },
                { top: "40%", left: "25%", delay: "0.7s" },
              ].map((d, i) => (
                <span
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-sm rotate-45 opacity-0 animate-[fadeIn_0.6s_ease-out_forwards]"
                  style={{
                    top: d.top,
                    left: d.left,
                    background: "#5ab5ec",
                    boxShadow: "0 0 6px rgba(90,181,236,0.4)",
                    animationDelay: d.delay,
                  }}
                />
              ))}
              {/* Map badge */}
              <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-tl-sea-300">
                Mapa marítimo
              </span>
              {/* Center label */}
              <span className="text-white/20 text-xs select-none">
                MapLibre GL · OpenSeaMap · AIS
              </span>
            </div>

            {/* Info */}
            <div className="p-4 bg-white dark:bg-gray-950">
              <h3 className="font-heading text-[0.95rem] font-bold text-gray-900 dark:text-gray-100 mb-1">
                Inteligencia marítima
              </h3>
              <p className="text-[0.725rem] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                Cartas náuticas OpenSeaMap. Posición de buques en tiempo real via
                AIS. Emergencias SASEMAR. Meteorología costera y combustible en
                puertos.
              </p>
              <div className="flex flex-wrap gap-1">
                {SEA_TAGS.map((tag) => (
                  <LayerTag key={tag} label={tag} />
                ))}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

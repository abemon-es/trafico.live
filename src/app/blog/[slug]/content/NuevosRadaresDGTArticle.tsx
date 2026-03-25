import Link from "next/link";

const RADAR_TYPES = [
  {
    type: "Cinemómetro fijo",
    icon: "📷",
    description:
      "Mide la velocidad puntual en un punto concreto de la vía. Son los más extendidos. El flash dispara al superar el límite.",
    color: "bg-red-50 dark:bg-red-900/20 border-red-200",
    textColor: "text-red-800",
  },
  {
    type: "Radar de tramo",
    icon: "📏",
    description:
      "Calcula la velocidad media entre dos puntos separados entre 1 y 15 km. Imposible de engañar acelerando entre radar y radar.",
    color: "bg-orange-50 border-orange-200",
    textColor: "text-orange-800",
  },
  {
    type: "Radar de semáforo",
    icon: "🚦",
    description:
      "Instalado en intersecciones urbanas. Sanciona tanto el exceso de velocidad como saltarse el semáforo en rojo.",
    color: "bg-yellow-50 border-yellow-200",
    textColor: "text-yellow-800",
  },
  {
    type: "Radar móvil",
    icon: "🚐",
    description:
      "Vehículos camuflados de la Guardia Civil con radar Doppler. Pueden desplegarse en cualquier punto de la red viaria.",
    color: "bg-purple-50 border-purple-200",
    textColor: "text-purple-800",
  },
];

const ROADS_AFFECTED = [
  { road: "A-4", stretch: "Madrid–Córdoba–Cádiz", new: 4 },
  { road: "A-6", stretch: "Madrid–A Coruña", new: 3 },
  { road: "A-7", stretch: "Valencia–Almería–Algeciras", new: 5 },
  { road: "N-332", stretch: "Costa Valenciana", new: 2 },
  { road: "A-52", stretch: "Ourense–Vigo", new: 2 },
  { road: "AP-7", stretch: "Cataluña–Levante", new: 4 },
  { road: "A-66", stretch: "Sevilla–Gijón (Vía de la Plata)", new: 3 },
];

export function NuevosRadaresDGTArticle() {
  return (
    <article className="prose prose-gray max-w-none">
      <p className="lead text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
        La DGT ha arrancado 2026 con su mayor expansión de control de velocidad en una
        década: 33 nuevos radares operativos antes de diciembre, dentro de un plan que
        contempla 122 nuevas instalaciones hasta 2027. Aquí tienes todos los detalles:
        tipos, ubicaciones y cómo evitar una multa.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        El plan 2026: 33 radares nuevos en un año
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La Dirección General de Tráfico publicó en enero de 2026 su{" "}
        <strong>Plan Estratégico de Seguridad Vial 2026–2030</strong>. Uno de sus ejes
        es la expansión del parque de cinemómetros: 33 nuevas instalaciones en 2026,
        con especial foco en tramos de alta accidentalidad y vías interurbanas con
        elevado volumen de tráfico.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        El objetivo declarado es reducir la velocidad inadecuada, factor presente en el{" "}
        <strong>28% de los accidentes mortales</strong> en carretera según el último
        informe de siniestralidad de la DGT. España tiene actualmente unos 780
        cinemómetros fijos; el plan 2026–2027 elevará esa cifra a más de 900.
      </p>
      <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5 mb-8">
        <p className="text-tl-800 dark:text-tl-200 text-sm font-semibold mb-1">Cifras clave</p>
        <ul className="space-y-1 text-tl-700 dark:text-tl-300 text-sm">
          <li>
            <strong>33</strong> nuevos radares operativos en 2026
          </li>
          <li>
            <strong>122</strong> nuevas instalaciones planificadas hasta 2027
          </li>
          <li>
            <strong>780+</strong> cinemómetros fijos actualmente en España
          </li>
          <li>
            <strong>28%</strong> de accidentes mortales con velocidad inadecuada
          </li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Tipos de radar: cuál es cuál
      </h2>
      <div className="space-y-3 mb-8">
        {RADAR_TYPES.map((r) => (
          <div
            key={r.type}
            className={`flex items-start gap-4 p-4 rounded-xl border ${r.color}`}
          >
            <span className="text-2xl flex-shrink-0" role="img" aria-hidden="true">
              {r.icon}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-bold mb-1 ${r.textColor}`}>{r.type}</p>
              <p className={`text-sm ${r.textColor} opacity-90`}>{r.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Cómo funciona un radar de tramo?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Los radares de tramo son los más efectivos y los que más aumentan en 2026. Su
        funcionamiento es sencillo pero implacable:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>
          Una cámara en el <strong>punto de inicio</strong> del tramo registra la
          matrícula y la hora exacta de paso.
        </li>
        <li>
          Una segunda cámara en el <strong>punto final</strong> hace lo mismo.
        </li>
        <li>
          El sistema calcula la <strong>velocidad media</strong> dividiendo la distancia
          entre los dos puntos entre el tiempo transcurrido.
        </li>
        <li>
          Si esa velocidad media supera el límite, se genera una denuncia automática.
          No importa si aminoras la marcha al ver las cámaras.
        </li>
      </ol>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La tolerancia técnica aplicada por la DGT es del <strong>5% + 5 km/h</strong>{" "}
        en cinemómetros fijos homologados. En vías de 120 km/h, la sanción efectiva
        comienza a partir de <strong>131 km/h</strong>.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Principales vías afectadas por los nuevos radares
      </h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Carretera
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Tramo
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Nuevos radares
              </th>
            </tr>
          </thead>
          <tbody>
            {ROADS_AFFECTED.map((row) => (
              <tr key={row.road} className="hover:bg-gray-50 dark:bg-gray-950">
                <td className="px-4 py-3 font-bold text-tl-600 dark:text-tl-400 border border-gray-200 dark:border-gray-800">
                  <Link
                    href={`/radares/${row.road}`}
                    className="hover:underline"
                  >
                    {row.road}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                  {row.stretch}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                  {row.new}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs mb-8">
        Datos orientativos según el plan de instalaciones publicado por la DGT. Las
        ubicaciones exactas se confirman cuando el radar entra en funcionamiento.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Dónde consultar los radares en tiempo real
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        En trafico.live puedes ver la ubicación de todos los radares fijos activos en
        España, incluyendo los nuevos que se van incorporando al mapa a medida que
        entran en funcionamiento.
      </p>
      <div className="flex flex-wrap gap-3 mt-4 mb-8">
        <Link
          href="/radares"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Mapa de radares DGT
        </Link>
        <Link
          href="/radares/A-4"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Radares en la A-4
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Consejos para no ser multado
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La forma más efectiva de evitar una multa por velocidad es obvia pero merece
        matices:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>
          <strong>Circula al límite, no por debajo.</strong> Circular muy por debajo
          del límite en autopista puede crear situaciones peligrosas y no te protege de
          sanciones por velocidad mínima.
        </li>
        <li>
          <strong>En tramos con radar de sección, mantén la velocidad constante</strong>{" "}
          desde la primera cámara hasta la segunda. Frenar al ver la señal no sirve de nada.
        </li>
        <li>
          <strong>Usa el aviso de radares del navegador</strong> (Waze, Google Maps,
          sistemas integrados) como apoyo, no como sustituto de la atención.
        </li>
        <li>
          <strong>Recuerda que los radares móviles no están en el mapa.</strong> La
          Guardia Civil puede colocarlos en cualquier punto de la red sin previo aviso.
        </li>
      </ul>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-5 mb-8">
        <p className="text-red-800 text-sm font-semibold mb-1">
          Cuantía de las multas en 2026
        </p>
        <ul className="space-y-1 text-red-700 dark:text-red-400 text-sm">
          <li>Superar el límite hasta 20 km/h: <strong>100 €</strong></li>
          <li>Entre 21 y 30 km/h: <strong>300 €</strong></li>
          <li>Entre 31 y 40 km/h: <strong>400 €</strong> + 2 puntos</li>
          <li>Entre 41 y 50 km/h: <strong>500 €</strong> + 4 puntos</li>
          <li>Más de 50 km/h: <strong>600 €</strong> + 6 puntos (pérdida de carnet posible)</li>
        </ul>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-5 mt-8">
        <p className="text-green-800 text-sm font-semibold mb-1">Resumen</p>
        <p className="text-green-700 dark:text-green-400 text-sm">
          La DGT instala 33 radares nuevos en 2026, con predominio de radares de tramo
          en vías interurbanas. Consulta el mapa actualizado en trafico.live antes de
          cualquier viaje largo, y recuerda que respetar el límite siempre será más
          económico que cualquier multa.
        </p>
      </div>
    </article>
  );
}

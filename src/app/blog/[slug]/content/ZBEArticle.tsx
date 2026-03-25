import Link from "next/link";

const ZBE_CITIES = [
  {
    city: "Madrid",
    zone: "Madrid Central + ZBE 30",
    since: "2018",
    area: "Interior M-30",
    url: "https://www.madrid.es/portales/munimadrid/es/Inicio/Medio-ambiente/Sostenibilidad/Zonas-de-Bajas-Emisiones",
  },
  {
    city: "Barcelona",
    zone: "ZBE Rondes Barcelona",
    since: "2020",
    area: "Interior Rondas",
    url: "https://www.barcelona.cat/mobilitat/ca/serveis-i-tramits/zona-de-baixes-emissions",
  },
  {
    city: "Valencia",
    zone: "ZBE Valencia",
    since: "2023",
    area: "Centro histórico",
    url: "https://www.valencia.es/val/mobilitat/circulacio/zbe",
  },
  {
    city: "Sevilla",
    zone: "ZBE Sevilla",
    since: "2023",
    area: "Casco histórico",
    url: "https://www.sevilla.org",
  },
  {
    city: "Zaragoza",
    zone: "ZBE Zaragoza",
    since: "2023",
    area: "Casco histórico",
    url: "https://www.zaragoza.es",
  },
];

const STICKERS = [
  {
    label: "Cero (0)",
    color: "bg-tl-100 text-tl-800 border-tl-300",
    vehicles: "Vehículos eléctricos puros (BEV) y de hidrógeno (FCEV).",
    access: "Acceso libre a todas las ZBE.",
  },
  {
    label: "ECO",
    color: "bg-green-100 text-green-800 border-green-300",
    vehicles: "Híbridos enchufables (PHEV), híbridos convencionales y gas (GNC/GLP) con emisiones homologadas ≤ 80 g/km CO₂.",
    access: "Acceso libre a la mayoría de ZBE, con restricciones en días de alta contaminación.",
  },
  {
    label: "C",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    vehicles: "Gasolina Euro 4/5/6 y Diésel Euro 6.",
    access: "Acceso permitido excepto en episodios de alta contaminación (protocolo 2 y 3).",
  },
  {
    label: "B",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    vehicles: "Gasolina Euro 3 y Diésel Euro 4/5.",
    access: "Restricciones a partir del protocolo 1 de contaminación. No pueden circular en ZBE durante días de alta contaminación.",
  },
  {
    label: "Sin etiqueta",
    color: "bg-red-100 text-red-800 border-red-300",
    vehicles: "Gasolina anteriores a Euro 3 y Diésel anteriores a Euro 4.",
    access: "Prohibición de circulación en ZBE en cualquier momento.",
  },
];

export function ZBEArticle() {
  return (
    <article className="prose prose-gray max-w-none">
      <p className="lead text-lg text-gray-600 leading-relaxed mb-8">
        Las Zonas de Bajas Emisiones son una realidad en las principales ciudades
        españolas. Si no conoces qué distintivo ambiental tiene tu vehículo o qué
        restricciones aplican en tu ciudad, esta guía lo explica todo.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
        ¿Qué son las Zonas de Bajas Emisiones?
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        Las ZBE son áreas urbanas en las que el acceso de vehículos está restringido
        según su nivel de emisiones contaminantes. Su objetivo es mejorar la calidad
        del aire en las ciudades y cumplir con los límites de concentración de NO₂ y
        PM10 establecidos por la directiva europea <strong>2008/50/CE</strong> sobre
        calidad del aire.
      </p>
      <p className="text-gray-700 leading-relaxed mb-4">
        En España, la Ley de Residuos y Suelos Contaminados (Ley 7/2022) obliga a todos
        los municipios de más de <strong>50.000 habitantes</strong> a implantar una ZBE
        antes de 2023. A día de hoy, más de 140 municipios tienen o están preparando su
        zona de bajas emisiones.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
        El distintivo ambiental: tu pasaporte para circular
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        La DGT clasifica los vehículos en cinco categorías medioambientales
        representadas por una etiqueta de colores que debe colocarse en el parabrisas.
        Esta etiqueta determina si puedes o no circular en cada ZBE.
      </p>
      <div className="space-y-3 mb-6">
        {STICKERS.map((s) => (
          <div
            key={s.label}
            className={`flex items-start gap-4 p-4 rounded-xl border ${s.color}`}
          >
            <span className={`flex-shrink-0 inline-block px-3 py-1 rounded-full text-sm font-bold border ${s.color}`}>
              {s.label}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium mb-0.5">{s.vehicles}</p>
              <p className="text-xs opacity-80">{s.access}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-tl-50 border border-tl-200 rounded-xl p-5 mb-8">
        <p className="text-tl-800 text-sm font-semibold mb-1">
          ¿Cómo obtengo mi etiqueta?
        </p>
        <p className="text-tl-700 text-sm">
          Puedes obtenerla en cualquier oficina de tráfico, talleres colaboradores o
          solicitarla online en la web de la DGT. El coste es de{" "}
          <strong>entre 5 y 6 €</strong>. Si tu vehículo es nuevo, algunos fabricantes
          la incluyen de serie.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
        ZBE en las principales ciudades españolas 2026
      </h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200">Ciudad</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200">Zona</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200">Desde</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200">Área</th>
            </tr>
          </thead>
          <tbody>
            {ZBE_CITIES.map((row) => (
              <tr key={row.city} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 border border-gray-200">
                  {row.city}
                </td>
                <td className="px-4 py-3 text-gray-700 border border-gray-200">{row.zone}</td>
                <td className="px-4 py-3 text-gray-500 border border-gray-200">{row.since}</td>
                <td className="px-4 py-3 text-gray-500 border border-gray-200">{row.area}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
        Protocolos de contaminación: ¿cuándo se activan?
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        Los episodios de alta contaminación se clasifican en tres niveles (1, 2 y 3)
        según los umbrales de NO₂ medidos por las estaciones de calidad del aire
        municipales. Cada nivel activa restricciones adicionales:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
        <li>
          <strong>Protocolo 1:</strong> Velocidad máxima reducida a 70 km/h en vías de
          acceso. Restricciones para vehículos sin etiqueta o con etiqueta B.
        </li>
        <li>
          <strong>Protocolo 2:</strong> Se suman restricciones para vehículos C.
          Estacionamiento gratuito en aparcamientos municipales para favorecer el uso
          del transporte público.
        </li>
        <li>
          <strong>Protocolo 3:</strong> Restricción total para todos los vehículos
          excepto Cero y ECO. Solo se declara en situaciones excepcionales.
        </li>
      </ul>

      <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
        Cómo consultar las restricciones en tiempo real
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        En trafico.live puedes consultar el estado de las ZBE y las restricciones
        especiales activas en cada momento. Para conductores de vehículos eléctricos,
        también puedes localizar los puntos de recarga más cercanos.
      </p>
      <div className="flex flex-wrap gap-3 mt-4">
        <Link
          href="/restricciones"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Ver restricciones activas
        </Link>
        <Link
          href="/carga-ev"
          className="inline-flex items-center gap-2 border border-gray-300 hover:border-tl-400 text-gray-700 hover:text-tl-600 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Cargadores eléctricos cercanos
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
        Multas por incumplir la ZBE
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        El incumplimiento de las restricciones de las ZBE se sanciona como infracción
        grave con multas de{" "}
        <strong>entre 200 € y 500 €</strong> según el municipio. En Madrid, el
        ayuntamiento ha instalado más de 1.000 cámaras de lectura de matrícula para
        controlar el cumplimiento de Madrid Central y la ZBE 30.
      </p>

      <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-8">
        <p className="text-green-800 text-sm font-semibold mb-1">Consejo final</p>
        <p className="text-green-700 text-sm">
          Si tienes pensado comprar un vehículo nuevo, opta por modelos con etiqueta
          Cero o ECO. Además de evitar restricciones, tendrás acceso a ayudas del Plan
          MOVES III y podrás aparcar gratis en muchas zonas reguladas de las grandes
          ciudades.
        </p>
      </div>
    </article>
  );
}

import Link from "next/link";

const DECISION_MATRIX = [
  {
    factor: "Km/año",
    diesel: "> 20.000 km",
    gasolina: "< 15.000 km",
    winner: "diesel",
  },
  {
    factor: "Tipo de vía",
    diesel: "Carretera / autopista",
    gasolina: "Ciudad / urbano",
    winner: "gasolina",
  },
  {
    factor: "Precio actual",
    diesel: "Variable (consultar)",
    gasolina: "Suele ser más barata",
    winner: "gasolina",
  },
  {
    factor: "ZBE / restricciones",
    diesel: "Más restricciones (Euro 6 ok)",
    gasolina: "Menos restricciones",
    winner: "gasolina",
  },
  {
    factor: "CO₂ por km",
    diesel: "Menor emisión de CO₂",
    gasolina: "Mayor emisión de CO₂",
    winner: "diesel",
  },
  {
    factor: "NOₓ / partículas",
    diesel: "Mayor emisión en antiguos",
    gasolina: "Menor emisión de NOₓ",
    winner: "gasolina",
  },
  {
    factor: "Coste de compra",
    diesel: "1.500–3.000 € más caro",
    gasolina: "Precio de acceso menor",
    winner: "gasolina",
  },
  {
    factor: "Mantenimiento",
    diesel: "Más caro (filtro FAP, etc.)",
    gasolina: "Más barato en general",
    winner: "gasolina",
  },
];

export function DieselOGasolinaArticle() {
  return (
    <article className="prose prose-gray max-w-none">
      <p className="lead text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
        La eterna pregunta ha cambiado de respuesta en 2026. Con el precio del diésel
        frecuentemente por encima de la gasolina 95, las nuevas restricciones en ZBE y
        los planes de fiscalidad especial para el gasóleo, elegir motorización ya no es
        tan sencillo como antes. Esta guía te da la respuesta concreta.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Precio actual: ¿cuál es más barato hoy?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Históricamente el diésel era siempre más barato que la gasolina. Esa ventaja ha
        desaparecido. En 2025-2026 el gasóleo cotiza frecuentemente por encima de la{" "}
        <strong>gasolina 95</strong>, sobre todo en gasolineras de marca. El diferencial
        medio en 2025 fue de apenas <strong>−0,02 €/litro</strong> a favor del diésel,
        muy lejos de los −0,15 € de años anteriores.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Comprueba el precio exacto en tu zona antes de cualquier cálculo:
      </p>
      <div className="flex flex-wrap gap-3 mt-4 mb-8">
        <Link
          href="/precio-gasolina-hoy"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Precio gasolina hoy
        </Link>
        <Link
          href="/precio-diesel-hoy"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Precio diésel hoy
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Consumo: el diésel sigue ganando en eficiencia
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Un motor diésel consume aproximadamente un <strong>15% menos de litros</strong>{" "}
        por cada 100 km que un gasolina equivalente. Esto se debe a la mayor densidad
        energética del gasóleo y a la mayor eficiencia termodinámica del ciclo diésel.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Ejemplo real para un SUV compacto:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Parámetro
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Diésel
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Gasolina
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Consumo medio
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                5,5 l/100 km
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                6,5 l/100 km
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Coste anual (20.000 km, 1,60 €/l)
              </td>
              <td className="px-4 py-3 font-medium text-green-700 dark:text-green-400 border border-gray-200 dark:border-gray-800">
                1.760 €
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                2.080 €
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Ahorro anual
              </td>
              <td className="px-4 py-3 font-bold text-green-700 dark:text-green-400 border border-gray-200 dark:border-gray-800">
                320 €
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800">—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Con un diferencial de precio mínimo (±0 €/litro), el ahorro proviene
        exclusivamente de los litros consumidos, no del precio. El diésel sigue siendo
        más eficiente en carretera. En ciudad, la ventaja se reduce drásticamente.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Fiscalidad 2026: el nuevo impuesto especial al diésel
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        El <strong>Impuesto sobre el Valor de los Productos Energéticos (IVPE)</strong>{" "}
        grava el combustible desde 2023. La propuesta de la Comisión Europea para 2026
        contempla eliminar el tratamiento fiscal preferencial del gasóleo frente a la
        gasolina, lo que podría suponer una subida adicional de{" "}
        <strong>hasta 10 céntimos por litro</strong> en el gasóleo en los próximos años.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        En España, el Gobierno ya aplicó en 2023 una reducción del tipo especial del
        gasóleo de uso general, acercando su carga fiscal a la de la gasolina. La
        tendencia regulatoria penaliza fiscalmente al diésel a medio plazo.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Restricciones ambientales: ZBE y etiqueta
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Este es el punto más crítico para la decisión en 2026. Los diésel más antiguos
        son los más afectados por las Zonas de Bajas Emisiones (ZBE):
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>
          <strong>Diésel Euro 6:</strong> etiqueta C. Puede circular en ZBE salvo
          episodios de alta contaminación (protocolo 2 y 3).
        </li>
        <li>
          <strong>Diésel Euro 4/5:</strong> etiqueta B. Restricciones desde protocolo 1.
          No puede circular en algunas ZBE entre semana.
        </li>
        <li>
          <strong>Diésel anterior a Euro 4:</strong> sin etiqueta. Prohibido en la mayoría
          de ZBE en cualquier momento.
        </li>
        <li>
          <strong>Gasolina Euro 4/5/6:</strong> etiqueta C. Mismas condiciones que diésel
          Euro 6 pero sin el extra de NOₓ.
        </li>
      </ul>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Si vives o trabajas en Madrid, Barcelona, Valencia o cualquier ciudad con ZBE
        activa, esto puede ser determinante. Consulta las restricciones actuales en:
      </p>
      <div className="flex flex-wrap gap-3 mt-4 mb-8">
        <Link
          href="/restricciones"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Restricciones activas hoy
        </Link>
        <Link
          href="/zbe/madrid"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          ZBE Madrid
        </Link>
        <Link
          href="/zbe/barcelona"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          ZBE Barcelona
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Cuándo elegir diésel?
      </h2>
      <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5 mb-6">
        <ul className="space-y-2 text-tl-800 dark:text-tl-200 text-sm">
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Haces más de <strong>20.000 km/año</strong>, principalmente en carretera o autopista.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>No vives ni trabajas habitualmente en ciudades con ZBE activa.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>El vehículo tiene motor <strong>Euro 6</strong> (etiqueta C o superior).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Necesitas autonomía elevada (depósitos más grandes, menos paradas).</span>
          </li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Cuándo elegir gasolina?
      </h2>
      <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5 mb-6">
        <ul className="space-y-2 text-tl-amber-800 text-sm">
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Haces menos de <strong>15.000 km/año</strong> o mayoritariamente en ciudad.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Circulas frecuentemente por ZBE de Madrid, Barcelona u otras ciudades.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Buscas un vehículo de menor precio de compra y mantenimiento.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Quieres estar mejor preparado ante posibles subidas de impuestos al gasóleo.</span>
          </li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        La alternativa eléctrica: ¿vale la pena en 2026?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Si tu uso es mayoritariamente urbano, la tercera opción merece un análisis serio.
        Un vehículo eléctrico tiene un coste energético equivalente de{" "}
        <strong>1–2 €/100 km</strong> (cargando en casa) frente a los 9–10 € de un
        gasolina o diésel. Sin etiqueta más restrictiva, acceso libre a ZBE, sin
        impuesto especial de combustible.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La red de carga en España supera ya los <strong>30.000 puntos públicos</strong>,
        aunque la cobertura en rutas interurbanas sigue siendo el principal obstáculo.
        Consulta los cargadores en tu ruta habitual:
      </p>
      <div className="flex flex-wrap gap-3 mt-4 mb-8">
        <Link
          href="/carga-ev"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Cargadores eléctricos cercanos
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Tabla resumen: Diesel vs Gasolina en 2026
      </h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Factor
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Diésel
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Gasolina
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Ventaja
              </th>
            </tr>
          </thead>
          <tbody>
            {DECISION_MATRIX.map((row) => (
              <tr key={row.factor} className="hover:bg-gray-50 dark:bg-gray-950">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                  {row.factor}
                </td>
                <td
                  className={`px-4 py-3 border border-gray-200 dark:border-gray-800 ${row.winner === "diesel" ? "text-green-700 dark:text-green-400 font-medium" : "text-gray-600 dark:text-gray-400"}`}
                >
                  {row.diesel}
                </td>
                <td
                  className={`px-4 py-3 border border-gray-200 dark:border-gray-800 ${row.winner === "gasolina" ? "text-green-700 dark:text-green-400 font-medium" : "text-gray-600 dark:text-gray-400"}`}
                >
                  {row.gasolina}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 capitalize">
                  {row.winner}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-5 mt-8">
        <p className="text-green-800 text-sm font-semibold mb-1">Conclusión</p>
        <p className="text-green-700 dark:text-green-400 text-sm">
          En 2026, la gasolina es la opción más versátil para la mayoría de conductores
          españoles con uso mixto o urbano. El diésel solo compensa si superas los{" "}
          <strong>20.000 km/año en carretera</strong> con un motor Euro 6. Para menos
          kilómetros o uso en ciudad con ZBE, gasolina o eléctrico ganan la ecuación.
        </p>
      </div>
    </article>
  );
}

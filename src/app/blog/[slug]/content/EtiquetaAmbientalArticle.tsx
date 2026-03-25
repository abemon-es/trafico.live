import Link from "next/link";

const LABELS = [
  {
    id: "Cero (0)",
    color: "bg-tl-100 dark:bg-tl-900/30 border-tl-400 text-tl-900",
    badge: "bg-tl-600 text-white",
    vehicles: [
      "Vehículos 100% eléctricos (BEV)",
      "Vehículos de hidrógeno (FCEV)",
      "Sin emisiones directas de CO₂",
    ],
    access: "Acceso libre a todas las ZBE sin restricciones, incluso en episodios de alta contaminación.",
    fineMissing: null,
  },
  {
    id: "ECO",
    color: "bg-teal-50 border-teal-400 text-teal-900",
    badge: "bg-teal-500 text-white",
    vehicles: [
      "Híbridos enchufables (PHEV) con ≤ 40 km de autonomía eléctrica",
      "Híbridos convencionales (HEV) con homologación ≤ 80 g/km",
      "Gas natural (GNC) y gas licuado (GLP) matriculados desde 2006",
    ],
    access: "Acceso libre en condiciones normales. Posibles restricciones en protocolo 3 (situaciones excepcionales).",
    fineMissing: null,
  },
  {
    id: "C",
    color: "bg-green-50 dark:bg-green-900/20 border-green-400 text-green-900",
    badge: "bg-green-600 text-white",
    vehicles: [
      "Gasolina matriculados desde 2006 (Euro 4, 5, 6)",
      "Diésel matriculados desde 2014 (Euro 6)",
    ],
    access: "Acceso permitido en condiciones normales y protocolo 1. Restricciones en protocolo 2 y 3.",
    fineMissing: "200 €",
  },
  {
    id: "B",
    color: "bg-yellow-50 border-yellow-400 text-yellow-900",
    badge: "bg-yellow-500 text-white",
    vehicles: [
      "Gasolina matriculados entre 2000 y 2005 (Euro 3)",
      "Diésel matriculados entre 2006 y 2013 (Euro 4, 5)",
    ],
    access: "Restricciones desde protocolo 1. No pueden circular en ciertas ZBE en días laborables.",
    fineMissing: "200 €",
  },
  {
    id: "Sin etiqueta",
    color: "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-900",
    badge: "bg-red-600 text-white",
    vehicles: [
      "Gasolina anteriores a Euro 3 (matriculados antes de 2000)",
      "Diésel anteriores a Euro 4 (matriculados antes de 2006)",
      "Motocicletas y ciclomotores de dos tiempos más antiguos",
    ],
    access: "Prohibición de circulación en ZBE en cualquier momento del día.",
    fineMissing: "200 €",
  },
];

export function EtiquetaAmbientalArticle() {
  return (
    <article className="prose prose-gray max-w-none">
      <p className="lead text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
        La etiqueta ambiental de la DGT determina si tu coche puede circular por las
        Zonas de Bajas Emisiones de Madrid, Barcelona y otras ciudades españolas. En
        2026 ya son más de 140 municipios los que tienen o preparan su ZBE. Esta guía
        te explica qué etiqueta te corresponde, cómo comprobarlo y qué implica cada
        color.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Las 5 etiquetas ambientales de la DGT
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La DGT clasifica todos los vehículos matriculados en España en cinco categorías
        medioambientales. La etiqueta se coloca en el parabrisas y es visible para las
        cámaras de control de las ZBE.
      </p>
      <div className="space-y-4 mb-8">
        {LABELS.map((label) => (
          <div
            key={label.id}
            className={`rounded-xl border-2 p-5 ${label.color}`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`flex-shrink-0 inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${label.badge}`}
              >
                {label.id}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold mb-1">Vehículos incluidos:</p>
                <ul className="list-disc pl-4 space-y-1 text-sm mb-3">
                  {label.vehicles.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
                <p className="text-sm">
                  <strong>Acceso ZBE:</strong> {label.access}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Cómo saber qué etiqueta tiene tu coche?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Hay tres formas oficiales de consultarlo, sin necesidad de ir a ninguna oficina:
      </p>

      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3">
        1. Sede Electrónica de la DGT (tráfico.gob.es)
      </h3>
      <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
        <li>
          Accede a <strong>sede.dgt.gob.es</strong> e identifícate con DNI electrónico,
          Cl@ve PIN o certificado digital.
        </li>
        <li>
          En el menú de Vehículos, selecciona{" "}
          <em>«Consulta de datos del vehículo»</em>.
        </li>
        <li>
          Introduce la matrícula. La ficha del vehículo muestra la{" "}
          <strong>etiqueta medioambiental DGT asignada</strong>.
        </li>
      </ol>

      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3">
        2. App miDGT
      </h3>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La aplicación oficial de la DGT (disponible en iOS y Android de forma gratuita)
        incluye una sección de{" "}
        <strong>«Mis vehículos»</strong> donde puedes ver la etiqueta ambiental de cada
        vehículo vinculado a tu DNI, además del permiso de circulación digital y el
        historial de ITV.
      </p>

      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3">
        3. Consulta por matrícula sin identificación
      </h3>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Si no tienes certificado digital, puedes usar el buscador de etiqueta ambiental
        por matrícula en la web de la DGT sin necesidad de autenticación. Solo necesitas
        la matrícula del vehículo.
      </p>

      <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5 mb-8">
        <p className="text-tl-800 dark:text-tl-200 text-sm font-semibold mb-1">
          ¿Y si mi vehículo no aparece o tiene etiqueta incorrecta?
        </p>
        <p className="text-tl-700 dark:text-tl-300 text-sm">
          Puede ocurrir con vehículos importados, con cambios de motor o matriculados
          antes de 2006. En ese caso debes acudir a la Jefatura Provincial de Tráfico
          con la ficha técnica del vehículo para que asignen manualmente la categoría
          correcta. El trámite es gratuito.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Qué permite circular en cada ZBE?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Cada ciudad establece sus propias reglas, pero todas se basan en el sistema de
        etiquetas de la DGT. El esquema general en las principales ciudades:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Etiqueta
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Madrid Central
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                ZBE Barcelona
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Días contaminación
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-bold text-tl-700 dark:text-tl-300 border border-gray-200 dark:border-gray-800">
                Cero (0)
              </td>
              <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold border border-gray-200 dark:border-gray-800">
                Libre
              </td>
              <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold border border-gray-200 dark:border-gray-800">
                Libre
              </td>
              <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold border border-gray-200 dark:border-gray-800">
                Libre
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-bold text-teal-700 border border-gray-200 dark:border-gray-800">
                ECO
              </td>
              <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold border border-gray-200 dark:border-gray-800">
                Libre
              </td>
              <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold border border-gray-200 dark:border-gray-800">
                Libre
              </td>
              <td className="px-4 py-3 text-center text-yellow-600 dark:text-yellow-400 font-semibold border border-gray-200 dark:border-gray-800">
                Protocolo 3 solo
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-bold text-green-700 dark:text-green-400 border border-gray-200 dark:border-gray-800">
                C
              </td>
              <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold border border-gray-200 dark:border-gray-800">
                Libre
              </td>
              <td className="px-4 py-3 text-center text-yellow-600 dark:text-yellow-400 font-semibold border border-gray-200 dark:border-gray-800">
                Limitado
              </td>
              <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400 font-semibold border border-gray-200 dark:border-gray-800">
                Protocolo 2 y 3
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-bold text-yellow-700 dark:text-yellow-400 border border-gray-200 dark:border-gray-800">
                B
              </td>
              <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400 font-semibold border border-gray-200 dark:border-gray-800">
                Residentes
              </td>
              <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold border border-gray-200 dark:border-gray-800">
                Restringido
              </td>
              <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold border border-gray-200 dark:border-gray-800">
                Desde protocolo 1
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-bold text-red-700 dark:text-red-400 border border-gray-200 dark:border-gray-800">
                Sin etiqueta
              </td>
              <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold border border-gray-200 dark:border-gray-800">
                Prohibido
              </td>
              <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold border border-gray-200 dark:border-gray-800">
                Prohibido
              </td>
              <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold border border-gray-200 dark:border-gray-800">
                Prohibido
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs mb-4">
        Tabla orientativa. Consulta siempre las condiciones específicas de cada ciudad.
      </p>

      <div className="flex flex-wrap gap-3 mt-4 mb-8">
        <Link
          href="/zbe/madrid"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          ZBE Madrid
        </Link>
        <Link
          href="/zbe/barcelona"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          ZBE Barcelona
        </Link>
        <Link
          href="/restricciones"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Restricciones activas
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Qué pasa si entras en una ZBE sin etiqueta?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Circular en una ZBE sin la etiqueta adherida al parabrisas o con una etiqueta
        que no autoriza el acceso se sanciona como infracción grave en la mayoría de
        municipios. Las cuantías más habituales en 2026:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Ciudad
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Multa base
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                Nota
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                Madrid
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-700 dark:text-red-400 border border-gray-200 dark:border-gray-800">
                200 €
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                Madrid Central y ZBE 30
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                Barcelona
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-700 dark:text-red-400 border border-gray-200 dark:border-gray-800">
                100–200 €
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                Según tipo de infracción
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                Valencia
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-700 dark:text-red-400 border border-gray-200 dark:border-gray-800">
                200 €
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                ZBE centro histórico
              </td>
            </tr>
            <tr className="hover:bg-gray-50 dark:bg-gray-950">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                Sevilla
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-700 dark:text-red-400 border border-gray-200 dark:border-gray-800">
                200 €
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                ZBE en implantación
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Además de la multa económica, en Madrid la infracción supone la{" "}
        <strong>retirada de puntos del carnet</strong> si se produce con habitualidad
        documentada. El sistema de cámaras de lectura automática registra cada paso.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Dónde colocar la etiqueta en el parabrisas?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La normativa indica que debe colocarse en el <strong>ángulo inferior derecho</strong>{" "}
        del parabrisas delantero, en el interior del vehículo, de forma que sea legible
        desde el exterior. En vehículos con matrícula trasera solo visible, se coloca en
        la luneta trasera.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Las etiquetas tienen un adhesivo especial que deja rastro al despegarse, lo que
        impide reutilizarlas en otro vehículo. El precio oficial es de entre{" "}
        <strong>5 y 7 €</strong> en oficinas de tráfico y talleres autorizados.
      </p>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-5 mt-8">
        <p className="text-green-800 text-sm font-semibold mb-1">Resumen rápido</p>
        <p className="text-green-700 dark:text-green-400 text-sm">
          Para saber tu etiqueta: entra en sede.dgt.gob.es o usa la app miDGT e introduce
          tu matrícula. Si tienes diésel anterior a 2014 o gasolina anterior a 2006, es
          probable que tengas etiqueta B o ninguna: consulta las{" "}
          <Link href="/restricciones" className="font-semibold underline">
            restricciones activas
          </Link>{" "}
          antes de circular por zonas urbanas.
        </p>
      </div>
    </article>
  );
}

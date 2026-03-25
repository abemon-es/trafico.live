import Link from "next/link";

export function BalizaV16Article() {
  return (
    <article className="prose prose-gray max-w-none">
      <p className="lead text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
        Desde el 1 de enero de 2026, la baliza V16 es <strong>obligatoria</strong> para
        todos los vehículos matriculados en España. Reemplaza definitivamente a los
        triángulos de advertencia en carretera. En esta guía te contamos todo lo que
        necesitas saber.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Qué es la baliza V16?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        La baliza V16 es un dispositivo luminoso de señalización de emergencia
        homologado por la DGT. Emite una luz naranja intermitente visible a{" "}
        <strong>1 km de distancia</strong> y, en su versión conectada, transmite la
        posición GPS del vehículo averiado al sistema DGT 3.0 en tiempo real.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Su nombre proviene del Reglamento UNECE n.º 65 y del número de orden que
        ocupa en la normativa técnica española. El modelo homologado debe mostrar el
        símbolo de homologación &quot;e&quot; o &quot;E&quot; seguido del código del país y el número
        de homologación.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Por qué reemplaza a los triángulos?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Los triángulos de advertencia obligaban al conductor a salir del vehículo y
        caminar por el arcén para colocarlos, una maniobra responsable de{" "}
        <strong>más del 30% de las muertes en arcén</strong> según los datos de la DGT.
        La baliza V16 se coloca sobre el techo del propio vehículo sin necesidad de
        bajarse, eliminando ese riesgo.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>No es necesario salir del vehículo para colocarla.</li>
        <li>Funciona tanto de día como de noche gracias a su luz de alta intensidad.</li>
        <li>La versión conectada alerta automáticamente a otros conductores a través del sistema DGT 3.0.</li>
        <li>Compatible con todos los tipos de techo (plano, cristal, panorámico).</li>
      </ul>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Cronología de la obligatoriedad
      </h2>
      <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5 mb-6">
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-24 text-sm font-semibold text-tl-700 dark:text-tl-300">Ene 2021</span>
            <span className="text-gray-700 dark:text-gray-300 text-sm">La baliza V16 se aprueba como alternativa voluntaria a los triángulos.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-24 text-sm font-semibold text-tl-700 dark:text-tl-300">Ene 2026</span>
            <span className="text-gray-700 dark:text-gray-300 text-sm"><strong>Obligatoria</strong> para todos los vehículos. Los triángulos dejan de ser válidos en carretera interurbana.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-24 text-sm font-semibold text-tl-700 dark:text-tl-300">2026+</span>
            <span className="text-gray-700 dark:text-gray-300 text-sm">Las versiones conectadas con transmisión GPS se exigirán progresivamente en vehículos nuevos.</span>
          </li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Cómo funciona la V16 conectada (DGT 3.0)
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Las balizas V16 <em>conectadas</em> incluyen un módulo SIM que, al activarse,
        envía automáticamente la posición GPS del vehículo a la plataforma{" "}
        <strong>DGT 3.0</strong>. Esta información se distribuye a:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>El panel de control de la DGT para alertar a los medios de comunicación.</li>
        <li>Los sistemas de navegación conectados (HERE, TomTom, Google Maps, Waze).</li>
        <li>Los paneles de señalización variable de las carreteras cercanas.</li>
        <li>
          Plataformas como{" "}
          <Link href="/" className="text-tl-600 dark:text-tl-400 hover:underline font-medium">
            trafico.live
          </Link>
          , donde puedes ver en tiempo real las balizas V16 activas en toda España.
        </li>
      </ul>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Qué mirar al comprar una baliza V16
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        No todas las balizas del mercado son válidas. La DGT exige que el dispositivo
        esté <strong>homologado según el Reglamento UNECE R65</strong>. Estos son los
        puntos clave antes de comprar:
      </p>
      <ol className="list-decimal pl-6 space-y-3 text-gray-700 dark:text-gray-300 mb-6">
        <li>
          <strong>Homologación visible:</strong> busca el sello &quot;E&quot; o &quot;e&quot; en la carcasa
          o la caja del producto.
        </li>
        <li>
          <strong>Autonomía mínima de 30 minutos</strong> de funcionamiento continuo
          (exigido por normativa).
        </li>
        <li>
          <strong>Base magnética o de ventosa</strong> resistente a velocidades de hasta
          130 km/h.
        </li>
        <li>
          <strong>Versión conectada o básica:</strong> la conectada es recomendable por
          la integración con DGT 3.0, aunque la básica también cumple la normativa
          desde 2026.
        </li>
        <li>
          <strong>Carga USB-C:</strong> facilita mantener la batería siempre cargada.
        </li>
      </ol>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Qué hacer en caso de avería: paso a paso
      </h2>
      <ol className="list-decimal pl-6 space-y-3 text-gray-700 dark:text-gray-300 mb-6">
        <li>Detén el vehículo en el arcén derecho o carril de emergencia sin salir todavía.</li>
        <li>Enciende las luces de emergencia (avería).</li>
        <li>Toma la baliza V16 de la guantera o el maletero.</li>
        <li>Abre ligeramente la ventanilla, coloca la baliza en el techo y actívala <em>sin bajarte del coche</em>.</li>
        <li>Si es conectada, confirma que la luz de estado indica transmisión GPS activa.</li>
        <li>
          Puedes verificar que la alerta aparece en{" "}
          <Link href="/operaciones" className="text-tl-600 dark:text-tl-400 hover:underline font-medium">
            trafico.live/operaciones
          </Link>{" "}
          o en la página principal del mapa.
        </li>
        <li>Llama al 112 o a tu asistencia en carretera.</li>
      </ol>

      <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5 mt-8">
        <p className="text-tl-amber-800 text-sm font-medium mb-1">Multa por no llevarla</p>
        <p className="text-tl-amber-700 dark:text-tl-amber-300 text-sm">
          No llevar la baliza V16 o utilizar triángulos en vía interurbana a partir de
          enero de 2026 puede suponer una multa de{" "}
          <strong>hasta 200 €</strong> según el artículo 11 del Reglamento General de
          Circulación. Además, en una inspección de tráfico puede ser motivo de
          inmovilización del vehículo.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Seguimiento en tiempo real en trafico.live
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        En trafico.live puedes consultar en tiempo real todas las balizas V16 activas
        en las carreteras españolas, junto con el resto de incidencias DGT. Los datos
        se actualizan cada 60 segundos desde la plataforma DGT 3.0.
      </p>
      <div className="flex flex-wrap gap-3 mt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Ver balizas V16 activas ahora
        </Link>
        <Link
          href="/operaciones"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Operaciones especiales DGT
        </Link>
      </div>
    </article>
  );
}

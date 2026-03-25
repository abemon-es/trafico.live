import Link from "next/link";

const TIPS = [
  {
    number: 1,
    category: "Conducción",
    title: "Mantén una velocidad constante",
    description:
      "Cada vez que aceleras, consumes más combustible. En autovía, la velocidad óptima de consumo está entre 90 y 110 km/h. A 120 km/h, el consumo puede ser hasta un 25% mayor que a 90 km/h.",
  },
  {
    number: 2,
    category: "Conducción",
    title: "Usa el motor de freno y anticipa frenadas",
    description:
      "Al levantar el pie del acelerador en marchas altas, los motores modernos cortan la inyección (consumo cero en deceleración). Anticipa los semáforos en rojo y las retenciones para evitar frenar y volver a acelerar.",
  },
  {
    number: 3,
    category: "Conducción",
    title: "Sube de marcha pronto",
    description:
      "Lo ideal es cambiar a marcha superior entre 2.000 y 2.500 rpm en gasolina, y entre 1.500 y 2.000 rpm en diésel. Circular en marchas cortas a altas revoluciones puede aumentar el consumo un 15-20%.",
  },
  {
    number: 4,
    category: "Conducción",
    title: "Evita el motor al ralentí",
    description:
      "Mantener el motor encendido parado más de 60 segundos consume más que apagarlo y volver a arrancarlo. Los coches modernos con sistema Start&Stop lo hacen automáticamente, aprovéchalo.",
  },
  {
    number: 5,
    category: "Climatización",
    title: "Usa el aire acondicionado con inteligencia",
    description:
      "El AC puede incrementar el consumo entre un 5% y un 15%. A velocidades bajas en ciudad, abrir las ventanillas es más eficiente. En autopista, el AC es preferible porque la resistencia aerodinámica de las ventanillas abiertas consume más.",
  },
  {
    number: 6,
    category: "Mantenimiento",
    title: "Infla correctamente los neumáticos",
    description:
      "Un neumático con 0,5 bar menos de presión supone un consumo extra de entre 2% y 4%. Comprueba la presión cada 15 días (en frío) y ajústala a los valores del fabricante indicados en el pilar de la puerta.",
  },
  {
    number: 7,
    category: "Mantenimiento",
    title: "Filtra el aceite y usa la viscosidad correcta",
    description:
      "Un aceite sucio o de viscosidad incorrecta aumenta la fricción interna del motor. Respeta los intervalos de cambio de aceite y usa siempre la especificación del fabricante (habitualmente 5W-30 o 0W-20 en motores modernos).",
  },
  {
    number: 8,
    category: "Planificación",
    title: "Reduce el peso innecesario",
    description:
      "Cada 100 kg adicionales suponen un consumo extra de aproximadamente 0,5 l/100 km. Vacía el maletero de cosas que no necesitas y retira la baca o la caja de techo cuando no la uses.",
  },
  {
    number: 9,
    category: "Planificación",
    title: "Planifica tu ruta para evitar retenciones",
    description:
      "El tráfico detenido y los arranque-parada en atasco pueden doblar el consumo en ciudad. Consulta el estado del tráfico antes de salir y elige la ruta con menos incidencias.",
  },
  {
    number: 10,
    category: "Precio",
    title: "Elige la gasolinera más barata de tu zona",
    description:
      "El precio de la gasolina puede variar más de 15 céntimos/litro entre estaciones cercanas. Si repones 50 litros, eso son 7,50 € de diferencia en un solo repostaje.",
  },
];

const CATEGORY_COLOR: Record<string, string> = {
  Conducción: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
  Climatización: "bg-cyan-100 text-cyan-700",
  Mantenimiento: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  Planificación: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  Precio: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300",
};

export function AhorrarGasolinaArticle() {
  return (
    <article className="prose prose-gray max-w-none">
      <p className="lead text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
        Con los precios del combustible en máximos históricos, reducir el consumo de tu
        vehículo es más importante que nunca. Aquí tienes 10 consejos probados que
        pueden ahorrarte entre 300 y 600 € al año.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-6">
        Los 10 consejos para consumir menos
      </h2>

      <div className="space-y-4 mb-8">
        {TIPS.map((tip) => (
          <div
            key={tip.number}
            className="flex gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-tl-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
              {tip.number}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[tip.category]}`}
                >
                  {tip.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{tip.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        ¿Cuánto puedes ahorrar realmente?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Un conductor medio español recorre unos{" "}
        <strong>14.000 km anuales</strong> con un consumo de unos 7 l/100 km. Eso son
        980 litros de gasolina al año. Con precio medio de 1,65 €/litro, el coste
        anual es de <strong>1.617 €</strong>.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Aplicando correctamente los consejos de conducción eficiente puedes reducir el
        consumo entre un <strong>15% y un 25%</strong>. Eso equivale a un ahorro de
        entre <strong>242 y 404 € anuales</strong>, solo en combustible.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        A ese ahorro en consumo hay que sumarle el ahorro por repostar en la gasolinera
        más barata (fácilmente <strong>100-150 € más al año</strong>).
      </p>

      <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5 mb-8">
        <p className="text-tl-amber-800 text-sm font-semibold mb-1">
          Ahorro total estimado
        </p>
        <p className="text-tl-amber-700 dark:text-tl-amber-300 text-sm">
          Combinando conducción eficiente + repostaje inteligente, un conductor medio
          puede ahorrar fácilmente entre{" "}
          <strong>350 € y 550 € anuales</strong> sin ningún gasto adicional.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Cómo encontrar la gasolinera más barata
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        El precio de los combustibles en España lo regula el mercado, lo que crea
        diferencias significativas entre estaciones cercanas. Las gasolineras de
        <strong> supermercados</strong> (Carrefour, Alcampo, Costco) suelen ser entre
        8 y 20 céntimos más baratas que las de marca.
      </p>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        En trafico.live actualizamos los precios de más de <strong>11.000 gasolineras</strong>{" "}
        de toda España cada hora con datos oficiales del Ministerio de Industria:
      </p>
      <div className="flex flex-wrap gap-3 mt-4 mb-8">
        <Link
          href="/precio-gasolina-hoy"
          className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Precio gasolina hoy
        </Link>
        <Link
          href="/gasolineras/mapa"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Mapa de gasolineras baratas
        </Link>
        <Link
          href="/profesional/diesel"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-tl-400 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:text-tl-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Gasoil profesional (bonificado)
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        Gasoil vs Gasolina: ¿cuál es más económico en 2026?
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Con el gasoil cotizando históricamente por encima de la gasolina 95 en muchas
        épocas de 2025-2026, la ventaja tradicional del diésel en coste se ha reducido.
        La decisión entre uno y otro depende del kilometraje anual:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>
          <strong>Menos de 15.000 km/año:</strong> la gasolina suele ser más económica
          en total, teniendo en cuenta el mayor precio del vehículo diésel y el ITV.
        </li>
        <li>
          <strong>Más de 20.000 km/año:</strong> el diésel puede compensar si el
          diferencial de precio del combustible lo permite. Consulta los precios
          actuales antes de decidir.
        </li>
        <li>
          <strong>Vehículos híbridos:</strong> el ahorro en ciudad puede superar el 40%
          respecto a un equivalente de gasolina convencional.
        </li>
      </ul>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        El mantenimiento que más influye en el consumo
      </h2>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        Más allá de los neumáticos y el aceite, estos componentes tienen un impacto
        directo en el consumo que muchos conductores ignoran:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>
          <strong>Filtro de aire:</strong> un filtro sucio puede aumentar el consumo
          hasta un 10%. Cámbialo cada 15.000-20.000 km o una vez al año.
        </li>
        <li>
          <strong>Bujías:</strong> en motores de gasolina, unas bujías en mal estado
          provocan combustión incompleta. Cámbialas según el manual (cada 30.000-60.000 km).
        </li>
        <li>
          <strong>Conversor catalítico:</strong> si el catalizador está deteriorado, el
          motor consume más para compensar la mala combustión y aumentan las emisiones.
        </li>
        <li>
          <strong>Alineación y equilibrado de ruedas:</strong> ruedas desalineadas
          aumentan la resistencia al rodamiento. Compruébalo cada vez que notes que el
          volante tira hacia un lado.
        </li>
      </ul>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-5 mt-8">
        <p className="text-green-800 text-sm font-semibold mb-1">Resumen ejecutivo</p>
        <p className="text-green-700 dark:text-green-400 text-sm">
          Los tres cambios con mejor relación esfuerzo/ahorro son: (1) inflar bien los
          neumáticos, (2) subir de marcha antes, (3) repostar en la gasolinera más
          barata. Los tres juntos pueden suponer{" "}
          <strong>más de 200 € al año</strong> sin cambiar tus hábitos de circulación.
        </p>
      </div>
    </article>
  );
}

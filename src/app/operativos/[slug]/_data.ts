// Operational definitions for DGT seasonal traffic operations.
// Each entry is self-contained: slug, display name, year, date window,
// descriptive copy, historical severity, and SEO metadata.

export type Severity = "muy alta" | "alta" | "media" | "baja";

export interface AvoidSlot {
  day: string;
  hours: string;
  reason: string;
}

export interface RecommendedSlot {
  day: string;
  hours: string;
  reason: string;
}

export interface AffectedRoad {
  id: string;
  name: string;
  description: string;
  congestion: "muy alta" | "alta" | "media";
}

export interface OperativoDefinition {
  slug: string;
  name: string;
  year: number;
  startDate: string; // ISO 8601, e.g. "2026-03-27"
  endDate: string;   // ISO 8601
  displayDates: string; // Human-readable range, e.g. "27 mar – 6 abr 2026"
  description: string; // 100-200 word explainer
  estimatedTrips: string; // e.g. "16 millones"
  historicalSeverity: Severity;
  badgeLabel: string; // Badge text in hero, e.g. "Operación activa"
  badgeColor: string; // Tailwind classes for badge
  avoidSlots: AvoidSlot[];
  recommendedSlots: RecommendedSlot[];
  affectedRoads: AffectedRoad[];
  keywords: string[];
  icon: string; // Lucide icon name identifier used in hub page
}

export const OPERATIVOS: OperativoDefinition[] = [
  {
    slug: "semana-santa",
    name: "Semana Santa",
    year: 2027,
    startDate: "2027-03-26",
    endDate: "2027-04-04",
    displayDates: "26 mar – 4 abr 2027",
    description:
      "La Semana Santa es el operativo de tráfico más importante del año en España. La Dirección General de Tráfico activa un dispositivo reforzado con miles de agentes en carretera para gestionar los más de 15 millones de desplazamientos previstos. El operativo abarca desde el Jueves de Dolores hasta el Lunes de Pascua, con especial intensidad en la operación salida (Viernes de Dolores y Sábado de Pasión) y la operación retorno (Domingo de Resurrección y Lunes de Pascua). La DGT establece restricciones de circulación para vehículos pesados en los principales ejes viarios durante las horas de máxima afluencia y despliega agentes en más de 500 puntos críticos de la red.",
    estimatedTrips: "~15 millones",
    historicalSeverity: "muy alta",
    badgeLabel: "Operación especial DGT",
    badgeColor:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200",
    avoidSlots: [
      {
        day: "Viernes (inicio)",
        hours: "15:00 – 21:00",
        reason:
          "Arranque de la operación salida. Mayor concentración de vehículos del año en los principales accesos a autopistas.",
      },
      {
        day: "Sábado (inicio)",
        hours: "9:00 – 14:00",
        reason:
          "Segunda oleada de salidas. Quienes no pudieron salir el viernes se incorporan a la carretera en masa.",
      },
      {
        day: "Domingo de Resurrección",
        hours: "16:00 – 22:00",
        reason:
          "Pico máximo de retorno del año. Todos los accesos a las grandes ciudades saturados simultáneamente.",
      },
      {
        day: "Lunes de Pascua",
        hours: "10:00 – 15:00",
        reason:
          "Segundo pico de retorno. Quienes prolongaron el fin de semana se reincorporan a la carretera.",
      },
    ],
    recommendedSlots: [
      {
        day: "Jueves (inicio)",
        hours: "Después de las 21:00",
        reason:
          "Salir la noche del jueves permite encontrar carreteras casi despejadas. El 20% del tráfico se adelanta a esta franja.",
      },
      {
        day: "Sábado (inicio)",
        hours: "Después de las 16:00",
        reason:
          "Tras el pico de mañana, el tráfico se modera considerablemente. Ventana de 3-4 horas sin grandes retenciones.",
      },
      {
        day: "Lunes de Pascua",
        hours: "Madrugada (antes de las 7:00)",
        reason:
          "Madrugar en el retorno reduce el tiempo de viaje hasta un 45% respecto a salir a mediodía.",
      },
    ],
    affectedRoads: [
      {
        id: "A-3",
        name: "A-3 Madrid → Valencia",
        description:
          "Corredor más saturado. Especial atención entre Motilla del Palancar y el by-pass de Valencia.",
        congestion: "muy alta",
      },
      {
        id: "A-4",
        name: "A-4 Madrid → Córdoba / Cádiz",
        description:
          "Acceso principal a Andalucía. Retenciones habituales en Bailén y los accesos a Córdoba.",
        congestion: "muy alta",
      },
      {
        id: "A-7",
        name: "A-7 Málaga → Almería",
        description:
          "Costa del Sol. Retenciones en Fuengirola, Marbella y el acceso a Almería.",
        congestion: "muy alta",
      },
      {
        id: "AP-7",
        name: "AP-7 Barcelona → Costa Brava",
        description:
          "Corredor mediterráneo catalán. Saturación entre Tarragona y Girona.",
        congestion: "alta",
      },
      {
        id: "A-6",
        name: "A-6 Madrid → Galicia",
        description:
          "Ruta noroeste con puntos críticos en el puerto de Guadarrama y la bajada a Lugo.",
        congestion: "alta",
      },
      {
        id: "A-1",
        name: "A-1 Madrid → Burgos / País Vasco",
        description:
          "Eje norte con retenciones en Somosierra y los accesos a Vitoria-Gasteiz.",
        congestion: "alta",
      },
      {
        id: "A-92",
        name: "A-92 Granada → Almería",
        description:
          "Vía interior andaluza con alta demanda hacia la Costa de Almería.",
        congestion: "alta",
      },
      {
        id: "N-340",
        name: "N-340 Costa Mediterránea",
        description:
          "Alternativa a la AP-7. Tráfico intenso en tramos urbanos de Murcia y Alicante.",
        congestion: "media",
      },
    ],
    keywords: [
      "operativo semana santa DGT",
      "tráfico semana santa 2027",
      "operación salida semana santa",
      "retenciones semana santa",
      "DGT semana santa operativo",
      "predicción tráfico semana santa",
    ],
    icon: "CalendarDays",
  },
  {
    slug: "puente-mayo",
    name: "Puente de Mayo",
    year: 2027,
    startDate: "2027-04-29",
    endDate: "2027-05-02",
    displayDates: "29 abr – 2 may 2027",
    description:
      "El Puente del 1 de Mayo concentra cada año entre 8 y 12 millones de desplazamientos en la red viaria española. El Día del Trabajador (1 de mayo) es festivo nacional, y en muchas comunidades autónomas se suma un segundo día festivo o un puente local que extiende el período a cuatro días. La DGT activa un operativo especial a partir del jueves por la tarde, con restricciones de circulación para vehículos pesados y refuerzo de agentes en los principales ejes hacia la costa mediterránea, Andalucía y Galicia. La operación retorno se concentra principalmente el domingo por la tarde.",
    estimatedTrips: "~10 millones",
    historicalSeverity: "alta",
    badgeLabel: "Operación especial DGT",
    badgeColor:
      "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800",
    avoidSlots: [
      {
        day: "Jueves (inicio)",
        hours: "16:00 – 21:00",
        reason:
          "Inicio de la operación salida. Salidas masivas desde las grandes ciudades hacia destinos de costa.",
      },
      {
        day: "Viernes 1 de mayo",
        hours: "9:00 – 14:00",
        reason:
          "Segunda oleada de salidas el día del festivo nacional. Tráfico elevado en todos los ejes.",
      },
      {
        day: "Domingo (retorno)",
        hours: "15:00 – 21:00",
        reason:
          "Operación retorno. Mayor flujo de regreso del puente. Todos los accesos a las grandes ciudades afectados.",
      },
    ],
    recommendedSlots: [
      {
        day: "Jueves (inicio)",
        hours: "Antes de las 14:00",
        reason:
          "Salir antes de mediodía permite evitar el grueso de la operación salida. Carreteras fluidas hasta la tarde.",
      },
      {
        day: "Viernes 1 de mayo",
        hours: "Después de las 16:00",
        reason:
          "Tras el pico de mañana, el tráfico se modera. Ventana de 3-4 horas con circulación fluida.",
      },
      {
        day: "Domingo (retorno)",
        hours: "Antes de las 13:00",
        reason:
          "Madrugar en el retorno puede reducir el tiempo de viaje hasta un 40%.",
      },
    ],
    affectedRoads: [
      {
        id: "A-3",
        name: "A-3 Madrid → Valencia",
        description:
          "Alta demanda hacia la costa mediterránea durante todo el puente.",
        congestion: "muy alta",
      },
      {
        id: "AP-7",
        name: "AP-7 Barcelona → Costa Dorada / Brava",
        description:
          "Corredor mediterráneo catalán con retenciones entre Tarragona y Girona.",
        congestion: "alta",
      },
      {
        id: "A-4",
        name: "A-4 Madrid → Andalucía",
        description:
          "Eje sur hacia Costa del Sol y Sevilla. Retenciones habituales en Bailén.",
        congestion: "alta",
      },
      {
        id: "A-7",
        name: "A-7 Costa del Sol",
        description:
          "Tramo Málaga-Marbella especialmente congestionado en fin de semana.",
        congestion: "alta",
      },
      {
        id: "A-6",
        name: "A-6 Madrid → Galicia",
        description:
          "Flujo moderado hacia el noroeste. Atención al puerto de Guadarrama.",
        congestion: "media",
      },
      {
        id: "A-2",
        name: "A-2 Madrid → Barcelona",
        description:
          "Eje noreste. Puntos críticos en el by-pass de Zaragoza.",
        congestion: "media",
      },
    ],
    keywords: [
      "puente mayo tráfico 2027",
      "operativo 1 mayo DGT",
      "tráfico puente mayo",
      "operación salida puente mayo",
      "retenciones puente mayo",
      "DGT festivo mayo",
    ],
    icon: "CalendarDays",
  },
  {
    slug: "verano",
    name: "Operativo Verano",
    year: 2026,
    startDate: "2026-06-21",
    endDate: "2026-09-21",
    displayDates: "21 jun – 21 sep 2026",
    description:
      "La Operación Verano de la DGT es la más extensa del año: abarca tres meses y concentra más de 90 millones de desplazamientos. A diferencia de los puentes puntuales, el operativo de verano se prolonga durante todo el período estival, con picos cada fin de semana y una intensidad especialmente alta en julio y agosto. La DGT refuerza los controles de velocidad, los equipos de atención a accidentes y la información en carretera. Los principales destinos son las costas mediterránea y cantábrica, Galicia y los archipiélagos. Los viernes por la tarde y los domingos por la noche son los momentos de mayor congestión de toda la temporada.",
    estimatedTrips: "~90 millones en el período",
    historicalSeverity: "muy alta",
    badgeLabel: "Operativo de verano",
    badgeColor:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200",
    avoidSlots: [
      {
        day: "Viernes (verano)",
        hours: "16:00 – 21:00",
        reason:
          "Cada viernes de julio y agosto repite el patrón de operación salida. Especialmente intenso en la primera quincena de agosto.",
      },
      {
        day: "Domingo (verano)",
        hours: "17:00 – 22:00",
        reason:
          "Retorno dominical. Los domingos de la última semana de julio y primera de agosto son los más congestionados del año.",
      },
      {
        day: "1-15 agosto",
        hours: "Todo el día",
        reason:
          "El cambio de turno vacacional concentra el mayor volumen de tráfico del verano en esta quincena.",
      },
    ],
    recommendedSlots: [
      {
        day: "Viernes (verano)",
        hours: "Antes de las 13:00 o después de las 22:00",
        reason:
          "Salir a mediodía o por la noche evita el pico vespertino. Las carreteras están casi despejadas después de las 22:00.",
      },
      {
        day: "Domingo (verano)",
        hours: "Antes de las 14:00",
        reason:
          "Volver el domingo a mediodía evita el gran retorno de la tarde. Ahorro de 1-2 horas en trayectos largos.",
      },
      {
        day: "Martes / Miércoles",
        hours: "Cualquier hora",
        reason:
          "Los días laborables de verano tienen tráfico normal. Si puedes viajar entre semana, el ahorro de tiempo es considerable.",
      },
    ],
    affectedRoads: [
      {
        id: "AP-7",
        name: "AP-7 Corredor Mediterráneo",
        description:
          "El eje más saturado del verano entre Valencia y la frontera francesa.",
        congestion: "muy alta",
      },
      {
        id: "A-7",
        name: "A-7 / A-45 Costa del Sol",
        description:
          "Retenciones crónicas en el tramo Málaga-Estepona durante todo el verano.",
        congestion: "muy alta",
      },
      {
        id: "A-3",
        name: "A-3 Madrid → Valencia",
        description:
          "Corredor Madrid-Levante. Picos máximos los viernes de julio y agosto.",
        congestion: "alta",
      },
      {
        id: "A-4",
        name: "A-4 Madrid → Cádiz",
        description:
          "Eje hacia Andalucía occidental. Retenciones en Bailén y accesos a Sevilla.",
        congestion: "alta",
      },
      {
        id: "A-6",
        name: "A-6 Madrid → A Coruña",
        description:
          "Ruta gallega. Puntos críticos en Guadarrama y la bajada hacia Lugo.",
        congestion: "alta",
      },
      {
        id: "A-8",
        name: "A-8 Corredor Cantábrico",
        description:
          "Costa del Cantábrico. Saturación entre Bilbao y Santander los fines de semana.",
        congestion: "alta",
      },
    ],
    keywords: [
      "operativo verano DGT 2026",
      "tráfico verano España",
      "operación verano DGT",
      "retenciones agosto",
      "predicción tráfico julio agosto",
      "DGT verano operativo especial",
    ],
    icon: "Sun",
  },
  {
    slug: "todos-los-santos",
    name: "Puente de Todos los Santos",
    year: 2026,
    startDate: "2026-10-30",
    endDate: "2026-11-02",
    displayDates: "30 oct – 2 nov 2026",
    description:
      "El puente de Todos los Santos (1 de noviembre) es un festivo nacional que genera entre 4 y 6 millones de desplazamientos. Al coincidir habitualmente en sábado o en mitad de semana, la duración del puente varía según el año, pero siempre genera una operación especial de la DGT con refuerzo de agentes y restricciones a vehículos pesados. Es un puente de menor intensidad que Semana Santa o Navidad, pero con rutas muy específicas hacia cementerios, zonas rurales y destinos de turismo interior. Los accesos a Madrid, Barcelona y las capitales de provincia concentran el mayor volumen de retorno el domingo por la tarde.",
    estimatedTrips: "~5 millones",
    historicalSeverity: "media",
    badgeLabel: "Operación especial DGT",
    badgeColor:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200",
    avoidSlots: [
      {
        day: "Viernes (inicio)",
        hours: "15:00 – 20:00",
        reason:
          "Inicio de la operación salida del puente. Salidas desde Madrid, Barcelona y Valencia.",
      },
      {
        day: "Domingo (retorno)",
        hours: "16:00 – 21:00",
        reason:
          "Operación retorno. Accesos a las grandes ciudades saturados por la tarde.",
      },
    ],
    recommendedSlots: [
      {
        day: "Viernes (inicio)",
        hours: "Antes de las 13:00",
        reason:
          "Salir a primera hora o a mediodía evita el pico de tarde. Carreteras fluidas hasta las 15:00.",
      },
      {
        day: "Domingo (retorno)",
        hours: "Antes de las 14:00 o después de las 21:00",
        reason:
          "Volver al mediodía o por la noche evita la hora punta del retorno dominical.",
      },
    ],
    affectedRoads: [
      {
        id: "A-2",
        name: "A-2 Madrid → Barcelona",
        description: "Eje noreste con intensidad moderada-alta durante el puente.",
        congestion: "alta",
      },
      {
        id: "A-1",
        name: "A-1 Madrid → Burgos",
        description:
          "Ruta norte con desplazamientos hacia el interior de Castilla y País Vasco.",
        congestion: "media",
      },
      {
        id: "A-4",
        name: "A-4 Madrid → Andalucía",
        description:
          "Eje sur hacia Andalucía occidental. Retenciones moderadas en Bailén.",
        congestion: "media",
      },
      {
        id: "A-6",
        name: "A-6 Madrid → Galicia",
        description:
          "Ruta hacia el noroeste. Intensidad media, puntos críticos en Guadarrama.",
        congestion: "media",
      },
    ],
    keywords: [
      "puente todos los santos tráfico 2026",
      "operativo 1 noviembre DGT",
      "tráfico puente noviembre",
      "retenciones 1 noviembre",
      "DGT noviembre operativo",
      "tráfico halloween puente",
    ],
    icon: "CalendarDays",
  },
  {
    slug: "puente-diciembre",
    name: "Puente de Diciembre",
    year: 2026,
    startDate: "2026-12-04",
    endDate: "2026-12-08",
    displayDates: "4 – 8 dic 2026",
    description:
      "El Puente de Diciembre agrupa los festivos del 6 de diciembre (Día de la Constitución) y el 8 de diciembre (Inmaculada Concepción), que crean un puente de entre 4 y 5 días dependiendo del año. Con entre 10 y 14 millones de desplazamientos previstos, es uno de los operativos de mayor envergadura del segundo semestre, por detrás de Navidad. La DGT activa restricciones para vehículos pesados, refuerza los controles de velocidad y despliega agentes en los principales ejes. Es el arranque del período de compras navideñas y muchos viajeros combinan el puente con visitas a mercados de Navidad en ciudades como Madrid, Barcelona, Zaragoza o Estrasburgo.",
    estimatedTrips: "~12 millones",
    historicalSeverity: "alta",
    badgeLabel: "Operación especial DGT",
    badgeColor:
      "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800",
    avoidSlots: [
      {
        day: "Jueves 3 diciembre",
        hours: "15:00 – 21:00",
        reason:
          "Arranque del operativo salida. Desplazamientos masivos hacia destinos turísticos y familiares.",
      },
      {
        day: "Viernes 4 diciembre",
        hours: "9:00 – 14:00",
        reason:
          "Segunda oleada de salidas. Muchos trabajadores aprovechan el puente para salir de viaje.",
      },
      {
        day: "Lunes 8 diciembre",
        hours: "15:00 – 21:00",
        reason:
          "Gran retorno del puente. Todos los accesos a las grandes ciudades saturados.",
      },
    ],
    recommendedSlots: [
      {
        day: "Jueves 3 diciembre",
        hours: "Madrugada o mediodía",
        reason:
          "Salir muy temprano o a mediodía permite evitar el tráfico denso del inicio del puente.",
      },
      {
        day: "Domingo 7 diciembre",
        hours: "Antes de las 13:00",
        reason:
          "Adelantar el retorno al domingo por la mañana evita la avalancha del lunes.",
      },
      {
        day: "Lunes 8 diciembre",
        hours: "Después de las 21:00",
        reason:
          "Si se viaja el lunes, esperar a la noche reduce significativamente el tiempo de trayecto.",
      },
    ],
    affectedRoads: [
      {
        id: "A-2",
        name: "A-2 Madrid → Barcelona",
        description:
          "Principal eje de desplazamiento del puente. Retenciones en el by-pass de Zaragoza.",
        congestion: "muy alta",
      },
      {
        id: "A-3",
        name: "A-3 Madrid → Valencia",
        description:
          "Alta demanda hacia el Levante. Retenciones frecuentes entre Madrid y Albacete.",
        congestion: "alta",
      },
      {
        id: "A-4",
        name: "A-4 Madrid → Andalucía",
        description:
          "Eje sur. Retenciones en Bailén y los accesos a Jaén y Córdoba.",
        congestion: "alta",
      },
      {
        id: "AP-7",
        name: "AP-7 Costa Mediterránea",
        description:
          "Corredor mediterráneo. Saturación entre Tarragona y el acceso a Barcelona.",
        congestion: "alta",
      },
      {
        id: "A-6",
        name: "A-6 Madrid → Galicia",
        description:
          "Intensidad media-alta hacia el noroeste durante el puente.",
        congestion: "media",
      },
      {
        id: "A-1",
        name: "A-1 Madrid → País Vasco",
        description:
          "Eje norte con tráfico moderado. Atención a Somosierra.",
        congestion: "media",
      },
    ],
    keywords: [
      "puente diciembre tráfico 2026",
      "operativo 6 diciembre DGT",
      "puente diciembre DGT",
      "tráfico 6 8 diciembre",
      "retenciones puente constitución inmaculada",
      "DGT diciembre operativo especial",
    ],
    icon: "CalendarDays",
  },
  {
    slug: "navidad",
    name: "Operativo Navidad",
    year: 2026,
    startDate: "2026-12-21",
    endDate: "2027-01-06",
    displayDates: "21 dic 2026 – 6 ene 2027",
    description:
      "La Operación Navidad de la DGT es el segundo operativo más importante del año, solo superado en número de días por el Verano. Abarca desde el inicio de las vacaciones escolares hasta el Día de Reyes, con una duración de entre 16 y 18 días en los que se producen más de 18 millones de desplazamientos de largo recorrido. La DGT establece tres picos principales: la operación salida de Navidad (22-24 diciembre), la operación salida de Nochevieja (30-31 diciembre) y la gran operación retorno de Reyes (4-6 enero). El operativo incluye restricciones a vehículos pesados, refuerzo de agentes en carretera, campañas de control de alcohol y drogas, y sistemas de gestión dinámica del tráfico en los principales ejes.",
    estimatedTrips: "~18 millones",
    historicalSeverity: "muy alta",
    badgeLabel: "Operación especial DGT",
    badgeColor:
      "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800",
    avoidSlots: [
      {
        day: "Lunes 21 diciembre",
        hours: "15:00 – 21:00",
        reason:
          "Inicio de las vacaciones escolares. Primer gran éxodo hacia destinos familiares y turísticos.",
      },
      {
        day: "Miércoles 23 diciembre",
        hours: "15:00 – 21:00",
        reason:
          "Pico máximo de la operación salida navideña. El mayor flujo de vehículos del período.",
      },
      {
        day: "Jueves 31 diciembre",
        hours: "12:00 – 19:00",
        reason:
          "Operación salida de Nochevieja. Desplazamientos para celebrar el fin de año.",
      },
      {
        day: "Martes 6 enero",
        hours: "14:00 – 21:00",
        reason:
          "Gran retorno de Reyes. El mayor pico de retorno navideño. Todos los accesos colapsados.",
      },
    ],
    recommendedSlots: [
      {
        day: "Domingo 20 diciembre",
        hours: "Cualquier hora",
        reason:
          "Adelantar el viaje al domingo anterior permite evitar por completo el operativo de salida.",
      },
      {
        day: "Miércoles 23 diciembre",
        hours: "Antes de las 11:00",
        reason:
          "Si se viaja el 23, hacerlo a primera hora evita el gran colapso de la tarde.",
      },
      {
        day: "Lunes 5 enero",
        hours: "Cualquier hora",
        reason:
          "Adelantar el retorno al 5 de enero permite viajar con tráfico fluido antes del gran retorno de Reyes.",
      },
    ],
    affectedRoads: [
      {
        id: "A-4",
        name: "A-4 Madrid → Andalucía",
        description:
          "El eje más saturado en Navidad. Retenciones largas en Bailén y accesos a Sevilla.",
        congestion: "muy alta",
      },
      {
        id: "A-3",
        name: "A-3 Madrid → Valencia",
        description:
          "Alta demanda durante toda la Navidad hacia el Levante.",
        congestion: "muy alta",
      },
      {
        id: "A-6",
        name: "A-6 Madrid → Galicia",
        description:
          "Ruta gallega con intensidad máxima en los días centrales de Navidad.",
        congestion: "alta",
      },
      {
        id: "A-2",
        name: "A-2 Madrid → Barcelona",
        description:
          "Eje noreste. Puntos críticos en el by-pass de Zaragoza.",
        congestion: "alta",
      },
      {
        id: "AP-7",
        name: "AP-7 Corredor Mediterráneo",
        description:
          "Saturación entre Barcelona y la frontera francesa durante las semanas de Navidad.",
        congestion: "alta",
      },
      {
        id: "A-7",
        name: "A-7 / A-45 Costa del Sol",
        description:
          "Retenciones en el tramo Málaga-Marbella durante el período navideño.",
        congestion: "alta",
      },
      {
        id: "A-1",
        name: "A-1 Madrid → País Vasco",
        description:
          "Eje norte. Congestión en Somosierra y los accesos a Bilbao.",
        congestion: "alta",
      },
      {
        id: "A-8",
        name: "A-8 Corredor Cantábrico",
        description:
          "Costa cantábrica. Retenciones entre Bilbao y Santander en período navideño.",
        congestion: "media",
      },
    ],
    keywords: [
      "operativo navidad DGT 2026",
      "tráfico navidad España",
      "operación salida navidad",
      "retenciones navidad 2026",
      "DGT navidad operativo especial",
      "tráfico reyes enero",
    ],
    icon: "Star",
  },
];

export const OPERATIVO_SLUGS = OPERATIVOS.map((o) => o.slug);

export function getOperativo(slug: string): OperativoDefinition | undefined {
  return OPERATIVOS.find((o) => o.slug === slug);
}

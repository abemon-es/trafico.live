import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Leaf,
  AlertCircle,
  ChevronRight,
  Clock,
  MapPin,
  Euro,
  Car,
  Zap,
  Bus,
  ExternalLink,
  CheckCircle,
  XCircle,
  MinusCircle,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";

export const revalidate = 3600;

const CURRENT_YEAR = new Date().getFullYear();

// ─────────────────────────────────────────────────────────────────────────────
// City configuration: static data per ZBE city
// ─────────────────────────────────────────────────────────────────────────────

type ZBEStatus = "activa" | "planificada" | "en_desarrollo";

interface CityZBEConfig {
  name: string;
  dbCityName?: string; // how it appears in ZBEZone.cityName
  status: ZBEStatus;
  activeSince?: string;
  fineAmount: number; // euros
  fineAmountRepeat?: number; // reincident fine
  schedule: string; // human-readable schedule
  permanentRestriction: boolean;
  description: string;
  transport: string; // public transport highlights
  evChargersCity?: string; // slug for /carga-ev/[city]
  // Access: which labels can enter?
  access: {
    label0: "permitido" | "restringido" | "prohibido";
    labelEco: "permitido" | "restringido" | "prohibido";
    labelC: "permitido" | "restringido" | "prohibido";
    labelB: "permitido" | "restringido" | "prohibido";
    sinEtiqueta: "permitido" | "restringido" | "prohibido";
  };
  faq: Array<{ question: string; answer: string }>;
}

const ZBE_CITIES: Record<string, CityZBEConfig> = {
  madrid: {
    name: "Madrid",
    dbCityName: "Madrid",
    status: "activa",
    activeSince: "enero de 2022",
    fineAmount: 200,
    fineAmountRepeat: 2000,
    schedule: "Permanente (todos los días, las 24 horas)",
    permanentRestriction: true,
    description:
      "Madrid Central y Madrid 360 son las zonas de bajas emisiones del municipio de Madrid. Cubren el centro histórico y los distritos con mayor tráfico rodado. El acceso está regulado por el distintivo ambiental de la DGT y el tipo de vehículo.",
    transport:
      "Metro de Madrid (13 líneas), EMT (autobuses urbanos), Cercanías Renfe, BiciMAD (bicicleta pública)",
    evChargersCity: "madrid",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Puedo circular por Madrid Central sin etiqueta ambiental?",
        answer:
          "No. Los vehículos sin etiqueta ambiental DGT no pueden acceder a Madrid Central ni a Madrid 360 en ningún momento del día. La sanción por infracción asciende a 200€ (primera vez) o hasta 2.000€ en caso de reincidencia. Están exentos los vehículos de emergencias, transporte de personas con movilidad reducida y algunos servicios esenciales.",
      },
      {
        question: "¿Los vehículos con etiqueta B pueden circular por la ZBE de Madrid?",
        answer:
          "Los vehículos con etiqueta B tienen acceso restringido: pueden entrar durante ciertos horarios y días, pero con limitaciones de aparcamiento y zonas permitidas. Consulta el portal de Madrid (madrid.es) para conocer las restricciones actualizadas, ya que pueden variar con episodios de contaminación.",
      },
      {
        question: "¿Dónde puedo verificar si mi vehículo tiene distintivo ambiental en Madrid?",
        answer:
          "Puedes consultar el distintivo ambiental de tu vehículo en la Sede Electrónica de la DGT (sede.dgt.gob.es) o en la app miDGT. Necesitas la matrícula del vehículo. El distintivo depende del tipo de combustible, año de matriculación y normativa de emisiones (Euro).",
      },
    ],
  },

  barcelona: {
    name: "Barcelona",
    dbCityName: "Barcelona",
    status: "activa",
    activeSince: "enero de 2020",
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 20:00 (lunes a viernes)",
    permanentRestriction: false,
    description:
      "La Zona de Bajas Emisiones de Barcelona abarca toda la ciudad condal. Las restricciones se aplican en días laborables durante el horario de mayor tráfico. En episodios de alta contaminación se activan restricciones extraordinarias para vehículos con etiqueta C.",
    transport:
      "Metro de Barcelona (12 líneas), TMB (autobuses), FGC, Rodalies Renfe, Bicing (bicicleta pública)",
    evChargersCity: "barcelona",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Cuándo aplica la ZBE en Barcelona?",
        answer:
          "La ZBE de Barcelona aplica de lunes a viernes, en días laborables, de 07:00 a 20:00 horas. Los fines de semana y festivos no hay restricciones ordinarias, aunque en episodios declarados de alta contaminación se pueden activar restricciones extraordinarias adicionales.",
      },
      {
        question: "¿Los vehículos diésel pueden circular por Barcelona?",
        answer:
          "Depende del año y la normativa Euro. Los diésel Euro 6 pueden circular (etiqueta C o B dependiendo del año). Los diésel anteriores a Euro 4 no pueden acceder. Los diésel Euro 4 y Euro 5 tienen acceso restringido. Comprueba tu etiqueta ambiental en la DGT antes de circular.",
      },
      {
        question: "¿Hay cámaras de control en la ZBE de Barcelona?",
        answer:
          "Sí. Barcelona dispone de una red de cámaras de lectura de matrículas (LPR) para controlar el acceso a la ZBE. Las infracciones se notifican al domicilio del titular del vehículo. No existen barreras físicas, el control es electrónico.",
      },
    ],
  },

  granada: {
    name: "Granada",
    dbCityName: "Granada",
    status: "activa",
    activeSince: "noviembre de 2021",
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 21:00 y sábados de 09:00 a 21:00",
    permanentRestriction: false,
    description:
      "La ZBE de Granada afecta al centro histórico de la ciudad. La zona incluye el Albaicín, la Catedral y el entorno del Zaidín. El objetivo es reducir la contaminación en un área con alta densidad patrimonial y turística.",
    transport: "Autobuses urbanos de Granada (Rober), Bicicleta pública (GraBici)",
    evChargersCity: "granada",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Puedo acceder al Albaicín en coche sin etiqueta ambiental?",
        answer:
          "No. El Albaicín forma parte de la ZBE de Granada. Los vehículos sin etiqueta ambiental DGT no pueden acceder en horario de restricción (laborables de 07:00 a 21:00 y sábados de 09:00 a 21:00). Existen zonas de aparcamiento disuasorio en el entorno para dejar el vehículo antes de entrar.",
      },
      {
        question: "¿Cuál es la multa por entrar a la ZBE de Granada sin autorización?",
        answer:
          "La sanción por circular en la ZBE de Granada sin el distintivo ambiental requerido es de 200€. Es una infracción grave según la Ley de Tráfico. El control se realiza mediante cámaras de lectura de matrículas.",
      },
      {
        question: "¿Los turistas están exentos de las restricciones ZBE en Granada?",
        answer:
          "No existen exenciones específicas para turistas. Sin embargo, hay aparcamientos disuasorios en la periferia de la ZBE con tarifas reducidas. Para visitar el centro, se recomienda utilizar el autobús urbano o el servicio de taxi/VTC, que sí tienen acceso.",
      },
    ],
  },

  malaga: {
    name: "Málaga",
    dbCityName: "Malaga",
    status: "activa",
    activeSince: "julio de 2023",
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 21:00",
    permanentRestriction: false,
    description:
      "La ZBE de Málaga afecta al centro de la ciudad, incluyendo el paseo marítimo y el casco histórico. La zona se estableció en cumplimiento de la Ley de Cambio Climático para municipios de más de 50.000 habitantes.",
    transport:
      "EMT Málaga (autobuses urbanos), Metro de Málaga (2 líneas), Cercanías Renfe",
    evChargersCity: "malaga",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Qué vehículos no pueden entrar al centro de Málaga?",
        answer:
          "Los vehículos sin etiqueta ambiental DGT no pueden acceder a la ZBE de Málaga en horario de restricción. Los vehículos con etiqueta B tienen acceso restringido. Los diésel anteriores a Euro 5 y gasolinas anteriores a Euro 3 generalmente carecen de etiqueta o tienen etiqueta B.",
      },
      {
        question: "¿Hay aparcamientos fuera de la ZBE de Málaga?",
        answer:
          "Sí. Málaga dispone de varios parkings disuasorios en el entorno de la ZBE: parking de la Alameda, parking de Muelle Heredia y parking del Puerto. Se recomienda aparcar allí y continuar a pie o en transporte público.",
      },
      {
        question: "¿La ZBE de Málaga aplica los fines de semana?",
        answer:
          "Las restricciones ordinarias aplican de lunes a viernes en días laborables. Los fines de semana y festivos no hay restricciones habituales, aunque en períodos especiales o episodios de contaminación se pueden activar medidas extraordinarias.",
      },
    ],
  },

  zaragoza: {
    name: "Zaragoza",
    dbCityName: "Zaragoza",
    status: "activa",
    activeSince: "enero de 2023",
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 21:00 (lunes a viernes)",
    permanentRestriction: false,
    description:
      "La ZBE de Zaragoza abarca el distrito Centro y áreas del Ensanche. La zona se implantó para reducir las concentraciones de NO₂ y partículas, especialmente problemáticas en los meses de invierno debido a la situación geográfica de la ciudad.",
    transport:
      "TUZSA (autobuses urbanos), Tranvía de Zaragoza, Bizi Zaragoza (bicicleta pública)",
    evChargersCity: "zaragoza",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Cuándo entró en vigor la ZBE de Zaragoza?",
        answer:
          "La Zona de Bajas Emisiones de Zaragoza entró en vigor en enero de 2023, en cumplimiento del mandato de la Ley de Cambio Climático para municipios de más de 50.000 habitantes. Afecta principalmente al centro histórico y el Ensanche.",
      },
      {
        question: "¿El tranvía llega a la ZBE de Zaragoza?",
        answer:
          "Sí. El tranvía de Zaragoza atraviesa parte de la ZBE y es una de las mejores alternativas para acceder al centro sin restricciones. Además, los autobuses urbanos de TUZSA tienen cobertura completa en el área restringida.",
      },
      {
        question: "¿Hay excepciones para vehículos de reparto en la ZBE de Zaragoza?",
        answer:
          "Sí. Los vehículos de distribución urbana de mercancías pueden tener horarios de acceso diferenciados. Los vehículos eléctricos de reparto y las motocicletas eléctricas tienen acceso libre. Consulta el Ayuntamiento de Zaragoza para las condiciones específicas de distribución.",
      },
    ],
  },

  sabadell: {
    name: "Sabadell",
    dbCityName: "Sabadell",
    status: "en_desarrollo",
    activeSince: undefined,
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 20:00 (previsto)",
    permanentRestriction: false,
    description:
      "Sabadell está en proceso de implantación de su Zona de Bajas Emisiones, en cumplimiento de la Ley de Cambio Climático. El ayuntamiento trabaja en la delimitación de la zona y los sistemas de control.",
    transport:
      "TUS (autobuses urbanos Sabadell), FGC (Ferrocarrils de la Generalitat), Renfe Rodalies",
    evChargersCity: "barcelona",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Cuándo entrará en vigor la ZBE de Sabadell?",
        answer:
          "El Ayuntamiento de Sabadell trabaja en la implementación de la ZBE en cumplimiento de la Ley de Cambio Climático. La fecha exacta de entrada en vigor está pendiente de aprobación municipal. Recomendamos consultar el portal del Ayuntamiento para la información más actualizada.",
      },
      {
        question: "¿Qué área cubrirá la ZBE de Sabadell?",
        answer:
          "Según el borrador de planificación, la ZBE de Sabadell afectará al centro de la ciudad y las principales vías de acceso al núcleo urbano. Los límites exactos se definirán en la ordenanza municipal.",
      },
      {
        question: "¿Hay alternativas de transporte público en Sabadell?",
        answer:
          "Sí. Sabadell dispone de una red de autobuses urbanos (TUS) y conexión con Barcelona y otras ciudades del área metropolitana a través de FGC y Renfe Rodalies. El carril bici también es una opción para desplazamientos cortos.",
      },
    ],
  },

  vitoria: {
    name: "Vitoria-Gasteiz",
    dbCityName: "Vitoria-Gasteiz",
    status: "activa",
    activeSince: "enero de 2022",
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 21:00",
    permanentRestriction: false,
    description:
      "Vitoria-Gasteiz, referente europeo en movilidad sostenible, implantó su ZBE en el centro histórico. La ciudad cuenta con una de las redes de carriles bici más densas de España y un sistema de autobuses con alta frecuencia.",
    transport:
      "TUVISA (autobuses urbanos), red de carriles bici (más de 200 km), Mugi (transporte interurbano)",
    evChargersCity: "vitoria",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Por qué Vitoria es referente en movilidad sostenible?",
        answer:
          "Vitoria-Gasteiz ha sido Premio Capital Verde Europea en 2012 y ha desarrollado un plan de movilidad sostenible que incluye más de 200 km de carriles bici, un servicio de autobús eléctrico y una red peatonal que conecta los principales barrios. La ZBE es parte de una estrategia más amplia de reducción de emisiones.",
      },
      {
        question: "¿Cómo funciona el control de acceso en la ZBE de Vitoria?",
        answer:
          "El control se realiza mediante cámaras de reconocimiento de matrículas (LPR) instaladas en los accesos a la ZBE. El sistema registra las matrículas y comprueba automáticamente el distintivo ambiental. No existen barreras físicas.",
      },
      {
        question: "¿Puedo usar la bici en lugar del coche en Vitoria?",
        answer:
          "Absolutamente. Vitoria tiene una de las infraestructuras ciclistas más completas de España. La bici pública (VitoriGaz) y los carriles bici cubiertos hacen del ciclismo urbano una opción cómoda y segura durante todo el año.",
      },
    ],
  },

  valladolid: {
    name: "Valladolid",
    dbCityName: "Valladolid",
    status: "en_desarrollo",
    activeSince: undefined,
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 21:00 (previsto)",
    permanentRestriction: false,
    description:
      "Valladolid está en fase de implementación de su Zona de Bajas Emisiones. El Ayuntamiento trabaja en la delimitación de la zona y los sistemas de control para cumplir con la Ley de Cambio Climático.",
    transport:
      "AUVASA (autobuses urbanos), Cercanías Renfe, red de carriles bici en expansión",
    evChargersCity: undefined,
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Cuándo se implantará la ZBE en Valladolid?",
        answer:
          "El Ayuntamiento de Valladolid trabaja en la definición de la ZBE en cumplimiento de la Ley de Cambio Climático (municipios de más de 50.000 habitantes). La fecha de entrada en vigor está pendiente de aprobación. Consulta el portal municipal para actualizaciones.",
      },
      {
        question: "¿Qué zona afectará la ZBE en Valladolid?",
        answer:
          "Según las propuestas del Ayuntamiento, la ZBE afectará principalmente al centro histórico de Valladolid y las principales arterias del área central. Los límites exactos se definirán en la ordenanza municipal.",
      },
      {
        question: "¿Tiene Valladolid transporte público para sustituir al coche?",
        answer:
          "Sí. AUVASA gestiona la red de autobuses urbanos de Valladolid con buena cobertura del centro. Además hay conexión con otras ciudades via Cercanías Renfe y la ciudad cuenta con una red de carriles bici en expansión.",
      },
    ],
  },

  sevilla: {
    name: "Sevilla",
    dbCityName: "Sevilla",
    status: "en_desarrollo",
    activeSince: undefined,
    fineAmount: 200,
    schedule: "Laborables (horario por definir)",
    permanentRestriction: false,
    description:
      "Sevilla está en proceso de implantación de su ZBE. La ciudad ya cuenta con el tranvía y una extensa red de carriles bici. La ZBE se centrará en el casco histórico y el área del Centro.",
    transport:
      "TUSSAM (autobuses urbanos), Tranvía de Sevilla, Metro de Sevilla, Sevici (bicicleta pública, >260 km carril bici)",
    evChargersCity: "sevilla",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Cuándo tendrá Sevilla su ZBE operativa?",
        answer:
          "El Ayuntamiento de Sevilla trabaja en la implementación de la ZBE. Sevilla, con más de 50.000 habitantes, está obligada por la Ley de Cambio Climático a disponer de una ZBE operativa. Consulta el portal del Ayuntamiento de Sevilla para la información más actualizada.",
      },
      {
        question: "¿Cuál es la situación actual del transporte sostenible en Sevilla?",
        answer:
          "Sevilla es referente mundial en movilidad ciclista, con más de 260 km de carril bici. Dispone de Sevici (bicicleta pública), tranvía, metro y una amplia red de autobuses. Estas infraestructuras facilitan la transición hacia una movilidad más sostenible en el área central.",
      },
      {
        question: "¿La Giralda y el casco histórico quedarán dentro de la ZBE?",
        answer:
          "Según las propuestas municipales, el casco histórico de Sevilla (incluyendo la zona de la Giralda, Santa Cruz y el Arenal) será parte de la ZBE. Ya actualmente hay restricciones de acceso en algunas calles del casco histórico.",
      },
    ],
  },

  valencia: {
    name: "Valencia",
    dbCityName: "Valencia",
    status: "activa",
    activeSince: "octubre de 2023",
    fineAmount: 200,
    schedule: "Laborables de 07:00 a 20:00 y sábados de 09:00 a 14:00",
    permanentRestriction: false,
    description:
      "La Zona de Bajas Emisiones de Valencia abarca el centro histórico y los barrios del Eixample y Ruzafa. La ZBE Mobilitat es parte del plan de movilidad sostenible del Ayuntamiento de Valencia para reducir la contaminación atmosférica.",
    transport:
      "EMT (autobuses urbanos), Metro de Valencia (9 líneas), Valenbisi (bicicleta pública), Tranvía/Tram",
    evChargersCity: "valencia",
    access: {
      label0: "permitido",
      labelEco: "permitido",
      labelC: "permitido",
      labelB: "restringido",
      sinEtiqueta: "prohibido",
    },
    faq: [
      {
        question: "¿Qué zona de Valencia está afectada por la ZBE?",
        answer:
          "La ZBE de Valencia (ZBE Mobilitat) abarca el centro histórico, el Eixample y partes de Ruzafa. También incluye vías principales como la Avenida del Regne de Valencia. Los límites exactos se pueden consultar en el portal de movilidad del Ayuntamiento de Valencia.",
      },
      {
        question: "¿Puedo aparcar fuera de la ZBE y acceder en transporte público?",
        answer:
          "Sí. Valencia dispone de parkings en el entorno de la ZBE y una excelente red de metro, tranvía y autobuses. La bicicleta pública Valenbisi también es una opción muy cómoda para moverse por el centro de Valencia.",
      },
      {
        question: "¿La ZBE de Valencia tiene excepciones para residentes?",
        answer:
          "Los residentes dentro de la ZBE con vehículo registrado en esa dirección pueden tener permisos de acceso especiales. Consulta el Ayuntamiento de Valencia para tramitar la autorización de residente y conocer los requisitos.",
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDecimalNum(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "object" && "toNumber" in (val as object)) {
    return (val as { toNumber: () => number }).toNumber();
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function statusBadge(status: ZBEStatus) {
  if (status === "activa") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 rounded-full text-sm font-semibold">
        <span className="w-2 h-2 bg-green-50 dark:bg-green-900/200 rounded-full animate-pulse" />
        Activa
      </span>
    );
  }
  if (status === "planificada") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800 rounded-full text-sm font-semibold">
        <span className="w-2 h-2 bg-tl-amber-50 dark:bg-tl-amber-900/200 rounded-full" />
        Planificada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800 rounded-full text-sm font-semibold">
      <span className="w-2 h-2 bg-tl-50 dark:bg-tl-900/200 rounded-full" />
      En desarrollo
    </span>
  );
}

type AccessValue = "permitido" | "restringido" | "prohibido";

function AccessIcon({ value }: { value: AccessValue }) {
  if (value === "permitido")
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (value === "restringido")
    return <MinusCircle className="w-5 h-5 text-tl-amber-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

function accessLabel(value: AccessValue) {
  if (value === "permitido") return "Permitido";
  if (value === "restringido") return "Restringido";
  return "Prohibido";
}

function accessRowClass(value: AccessValue) {
  if (value === "permitido") return "bg-green-50 dark:bg-green-900/20 border-green-100";
  if (value === "restringido") return "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-100";
  return "bg-red-50 dark:bg-red-900/20 border-red-100";
}

function accessTextClass(value: AccessValue) {
  if (value === "permitido") return "text-green-700 dark:text-green-400";
  if (value === "restringido") return "text-tl-amber-700 dark:text-tl-amber-300";
  return "text-red-700 dark:text-red-400";
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cfg = ZBE_CITIES[city];

  if (!cfg) {
    return { title: "ZBE no encontrada" };
  }

  return {
    title: `ZBE ${cfg.name} — Zona de Bajas Emisiones ${CURRENT_YEAR} | trafico.live`,
    description: `Zona de Bajas Emisiones de ${cfg.name}: restricciones de acceso por etiqueta ambiental, horarios, multa de ${cfg.fineAmount}€ y alternativas de transporte. Información actualizada ${CURRENT_YEAR}.`,
    keywords: [
      `ZBE ${cfg.name}`,
      `zona bajas emisiones ${cfg.name}`,
      `restricciones ${cfg.name} coche`,
      `etiqueta ambiental ${cfg.name}`,
      `multa ZBE ${cfg.name}`,
      `acceso centro ${cfg.name}`,
      `distintivo ambiental DGT ${cfg.name}`,
    ],
    openGraph: {
      title: `ZBE ${cfg.name} — Zona de Bajas Emisiones ${CURRENT_YEAR}`,
      description: `Restricciones de acceso, etiquetas permitidas, horarios y multas de la Zona de Bajas Emisiones de ${cfg.name}.`,
      type: "website",
    },
    alternates: {
      canonical: `https://trafico.live/zbe/${city}`,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ZBECityPage({ params }: Props) {
  const { city } = await params;
  const cfg = ZBE_CITIES[city];

  if (!cfg) {
    notFound();
  }

  // Try to fetch the ZBE zone from the DB by cityName
  const dbZone = await prisma.zBEZone.findFirst({
    where: {
      cityName: {
        contains: cfg.dbCityName ?? cfg.name,
        mode: "insensitive",
      },
    },
  });

  const fineFromDb = dbZone?.fineAmount
    ? toDecimalNum(dbZone.fineAmount)
    : null;
  const displayFine = fineFromDb ?? cfg.fineAmount;
  const effectiveFrom = dbZone?.effectiveFrom ?? null;

  // JSON-LD structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: `Zona de Bajas Emisiones de ${cfg.name}`,
    description: cfg.description,
    url: `https://trafico.live/zbe/${city}`,
    containedInPlace: {
      "@type": "City",
      name: cfg.name,
      addressCountry: "ES",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumbs */}
          <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
            <Link href="/" className="hover:text-gray-700 dark:text-gray-300 transition-colors">Inicio</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/restricciones" className="hover:text-gray-700 dark:text-gray-300 transition-colors">Restricciones</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/zbe" className="hover:text-gray-700 dark:text-gray-300 transition-colors">ZBE</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">{cfg.name}</span>
          </nav>

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                  <Leaf className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    Zona de Bajas Emisiones de {cfg.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xl">
                    {cfg.description}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {statusBadge(cfg.status)}
              </div>
            </div>
          </div>

          {/* Key info card */}
          <section className="mb-8" aria-labelledby="heading-info">
            <h2 id="heading-info" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Información clave
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Active since */}
              {(cfg.activeSince || effectiveFrom) && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
                  <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                    <Clock className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">En vigor desde</p>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">
                      {effectiveFrom
                        ? effectiveFrom.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
                        : cfg.activeSince}
                    </p>
                  </div>
                </div>
              )}

              {/* Fine */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-100 p-4 flex items-start gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                  <Euro className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Multa por infracción</p>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{displayFine.toLocaleString("es-ES")}€</p>
                  {cfg.fineAmountRepeat && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Reincidencia: hasta {cfg.fineAmountRepeat.toLocaleString("es-ES")}€</p>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
                <div className="p-2 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg flex-shrink-0">
                  <Clock className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Horario de restricción</p>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{cfg.schedule}</p>
                  {cfg.permanentRestriction && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Sin excepciones de horario</p>
                  )}
                </div>
              </div>

              {/* Who can enter */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-green-100 p-4 flex items-start gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                  <Car className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Quién puede entrar</p>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">
                    Etiquetas 0, ECO y C (sin restricción)
                  </p>
                  <p className="text-xs text-tl-amber-600 dark:text-tl-amber-400 mt-0.5">Etiqueta B: acceso restringido</p>
                </div>
              </div>
            </div>
          </section>

          {/* Access matrix */}
          <section className="mb-8" aria-labelledby="heading-matrix">
            <h2 id="heading-matrix" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Matriz de acceso por etiqueta ambiental
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Resumen de qué distintivos DGT pueden acceder a la ZBE de {cfg.name} durante el horario de restricción.
            </p>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] divide-y divide-gray-100">
                {/* Header */}
                <div className="col-span-3 grid grid-cols-[1fr_auto_auto] bg-gray-50 dark:bg-gray-950 px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Etiqueta ambiental</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-center w-24">Acceso</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-center w-28">Estado</span>
                </div>

                {/* Rows */}
                {(
                  [
                    {
                      label: "0 Emisiones",
                      sub: "Eléctrico / Hidrógeno",
                      labelColor: "bg-teal-600 text-white",
                      value: cfg.access.label0,
                    },
                    {
                      label: "ECO",
                      sub: "Híbrido enchufable / Gas natural",
                      labelColor: "bg-teal-400 text-white",
                      value: cfg.access.labelEco,
                    },
                    {
                      label: "C",
                      sub: "Gasolina Euro 4+ / Diésel Euro 6",
                      labelColor: "bg-green-50 dark:bg-green-900/200 text-white",
                      value: cfg.access.labelC,
                    },
                    {
                      label: "B",
                      sub: "Gasolina Euro 3 / Diésel Euro 5",
                      labelColor: "bg-yellow-400 text-black",
                      value: cfg.access.labelB,
                    },
                    {
                      label: "Sin etiqueta",
                      sub: "Vehículos antiguos",
                      labelColor: "bg-gray-400 text-white",
                      value: cfg.access.sinEtiqueta,
                    },
                  ] as Array<{
                    label: string;
                    sub: string;
                    labelColor: string;
                    value: AccessValue;
                  }>
                ).map((row) => (
                  <div
                    key={row.label}
                    className={`col-span-3 grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 ${accessRowClass(row.value)}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md text-xs font-bold ${row.labelColor}`}>
                        {row.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate hidden sm:block">{row.sub}</span>
                    </div>
                    <div className="flex justify-center w-24">
                      <AccessIcon value={row.value} />
                    </div>
                    <div className={`text-sm font-semibold w-28 text-center ${accessTextClass(row.value)}`}>
                      {accessLabel(row.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                &ldquo;Restringido&rdquo; puede implicar limitaciones de horario, número de accesos o zonas de aparcamiento. Consulta siempre la normativa municipal vigente.
              </span>
            </p>
          </section>

          {/* Schedule details */}
          <section className="mb-8" aria-labelledby="heading-schedule">
            <h2 id="heading-schedule" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Vigencia y horario de restricciones
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-start gap-3 mb-4">
                <Clock className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Horario habitual</h3>
                  <p className="text-gray-700 dark:text-gray-300">{cfg.schedule}</p>
                </div>
              </div>

              {cfg.status === "activa" && (
                <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-100 rounded-lg p-3 mt-3">
                  <p className="text-sm text-tl-amber-800">
                    <strong>Episodios de contaminación:</strong> En episodios de alta contaminación declarados por el Ayuntamiento, las restricciones pueden ampliarse a vehículos con etiqueta C o B. Consulta el portal municipal para alertas en tiempo real.
                  </p>
                </div>
              )}

              {cfg.status !== "activa" && (
                <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-100 rounded-lg p-3 mt-3">
                  <p className="text-sm text-tl-800 dark:text-tl-200">
                    <strong>Nota:</strong> Esta ZBE está en fase de planificación o desarrollo. Los horarios indicados son orientativos y pueden variar cuando entre en vigor. Consulta el Ayuntamiento de {cfg.name} para la información oficial más actualizada.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Check your label */}
          <section className="mb-8" aria-labelledby="heading-check">
            <h2 id="heading-check" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Consulta el distintivo ambiental de tu vehículo
            </h2>
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <Leaf className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-tl-800 dark:text-tl-200 mb-1">
                    ¿Sabes qué etiqueta tiene tu coche?
                  </h3>
                  <p className="text-sm text-tl-700 dark:text-tl-300 leading-relaxed">
                    El distintivo ambiental DGT determina si puedes acceder a la ZBE de {cfg.name}. Puedes consultarlo de forma gratuita en la Sede Electrónica de la DGT introduciendo tu matrícula.
                  </p>
                </div>
              </div>
              <a
                href="https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-tl-600 text-white rounded-lg text-sm font-semibold hover:bg-tl-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Consultar en Sede DGT
              </a>
              <p className="text-xs text-tl-600 dark:text-tl-400 mt-3">
                También puedes usar la app <strong>miDGT</strong> (disponible en App Store y Google Play) para consultar tu distintivo ambiental junto con toda la documentación del vehículo.
              </p>
            </div>
          </section>

          {/* Alternatives */}
          <section className="mb-8" aria-labelledby="heading-alternatives">
            <h2 id="heading-alternatives" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Alternativas al coche en {cfg.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* EV charging */}
              {cfg.evChargersCity && (
                <Link
                  href={`/carga-ev/${cfg.evChargersCity}`}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-tl-300 hover:shadow-sm transition-all group"
                >
                  <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                    <Zap className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:text-tl-400 transition-colors text-sm">
                      Puntos de carga eléctrica en {cfg.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Si tienes vehículo eléctrico o ECO, encuentra dónde cargar cerca de la ZBE.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400 mt-1.5 font-medium">
                      Ver cargadores <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              )}

              {/* Public transport */}
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                  <Bus className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Transporte público</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{cfg.transport}</p>
                </div>
              </div>

              {/* Map with filter */}
              <Link
                href={`/gasolineras/mapa?ciudad=${city}`}
                className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-300 hover:shadow-sm transition-all group"
              >
                <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                  <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:text-purple-400 transition-colors text-sm">
                    Gasolineras cerca de la ZBE
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Repostaje antes de acceder a la zona restringida.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-1.5 font-medium">
                    Ver en mapa <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>

              {/* DB zone details */}
              {dbZone && (
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                    <Info className="w-5 h-5 text-green-700 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 text-sm">{dbZone.name}</p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                      Zona registrada en nuestra base de datos oficial.
                      {dbZone.sourceUrl && (
                        <>
                          {" "}
                          <a
                            href={dbZone.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                          >
                            Fuente oficial
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* FAQ */}
          <section aria-labelledby="heading-faq" className="mb-8">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre la ZBE de {cfg.name}
            </h2>
            <div className="space-y-3">
              {cfg.faq.map((item) => (
                <details
                  key={item.question}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none">
                    {item.question}
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Related links */}
          <nav aria-label="Páginas relacionadas" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">También te puede interesar</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/zbe"
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                Todas las ZBE de España
              </Link>
              <Link
                href="/restricciones"
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                Restricciones de circulación
              </Link>
              {cfg.evChargersCity && (
                <Link
                  href={`/carga-ev/${cfg.evChargersCity}`}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
                >
                  Carga eléctrica en {cfg.name}
                </Link>
              )}
              <Link
                href="/gasolineras-24-horas"
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                Gasolineras 24 horas
              </Link>
              <Link
                href="/profesional/restricciones"
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
              >
                Restricciones para transportistas
              </Link>
            </div>
          </nav>

        </main>
      </div>
    </>
  );
}

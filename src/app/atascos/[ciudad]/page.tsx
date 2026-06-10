/**
 * /atascos/[ciudad] — Dashboard de atascos y congestión por ciudad.
 *
 * Target keywords:
 * - "atascos Madrid" ~5.400/mes
 * - "tráfico madrid ahora" ~590/mes
 * - "atascos barcelona" ~2.900/mes
 * - "atascos valencia" ~1.600/mes
 * - Cluster commuter combinado ~80K/mes, KD 0-18
 *
 * 50 ciudades generadas estáticamente.
 *
 * Data sources:
 * - Madrid: TrafficIntensity (6K sensores, cada 5 min)
 * - BCN/VAL/ZAR: CityTrafficSensor + CityTrafficReading
 * - HourlyTrafficProfile: promedios históricos por hora y día
 * - TrafficIncident: incidencias activas en la provincia
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import {
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  Activity,
  ChevronRight,
  RefreshCw,
  BarChart3,
  CheckCircle,
  Construction,
  TrendingUp,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 120; // 2 min — las páginas de atascos necesitan frescura

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ─────────────────────────────────────────────────────────────────────────────
// Registro de ciudades
// ─────────────────────────────────────────────────────────────────────────────
interface CityConfig {
  name: string;
  province: string;
  provinceCode: string;
  hasIntensitySource: boolean; // Madrid: TrafficIntensity
  hasCitySensors: boolean;     // BCN/VAL/ZAR: CityTrafficSensor
  intensitySource?: string;    // para TrafficIntensity.source
  citySensorKey?: string;      // CityTrafficSensor.city
  mainRoads: string[];
  hourPunta: { morning: string; evening: string };
  description: string;
}

const CITIES: Record<string, CityConfig> = {
  // ── Con datos de sensores ─────────────────────────────────────────────────
  madrid: {
    name: "Madrid",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["M-30", "M-40", "M-45", "M-50", "A-1", "A-2", "A-3", "A-4", "A-5", "A-6"],
    hourPunta: { morning: "7:30–9:30", evening: "18:00–20:30" },
    description: "Los atascos en Madrid se concentran en la M-30, M-40 y los accesos por A-1 a A-6. Hora punta mañana 7:30-9:30, tarde 18:00-20:30.",
  },
  barcelona: {
    name: "Barcelona",
    province: "Barcelona",
    provinceCode: "08",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "barcelona",
    mainRoads: ["B-23", "AP-7", "C-31", "C-32", "C-33", "C-16", "Ronda de Dalt", "Ronda Litoral"],
    hourPunta: { morning: "7:00–9:30", evening: "17:30–20:00" },
    description: "En Barcelona las retenciones más graves son en la Ronda de Dalt (B-20), Ronda Litoral y accesos por AP-7. Hora punta mañana 7:00-9:30, tarde 17:30-20:00.",
  },
  valencia: {
    name: "Valencia",
    province: "Valencia",
    provinceCode: "46",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "valencia",
    mainRoads: ["V-30", "V-21", "A-3", "V-31", "CV-35"],
    hourPunta: { morning: "7:30–9:00", evening: "17:00–19:30" },
    description: "Valencia concentra el tráfico denso en la V-30 (Pista de Silla), V-21 y los accesos a la A-3. Hora punta mañana 7:30-9:00, tarde 17:00-19:30.",
  },
  zaragoza: {
    name: "Zaragoza",
    province: "Zaragoza",
    provinceCode: "50",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "zaragoza",
    mainRoads: ["A-2", "A-68", "Z-30", "Z-40"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Zaragoza acumula tráfico en la Z-30, Z-40 y los accesos por A-2 y A-68. Hora punta mañana 7:30-9:00, tarde 17:30-19:30.",
  },
  // ── Sin sensores directos — basados en incidencias DGT ───────────────────
  sevilla: {
    name: "Sevilla",
    province: "Sevilla",
    provinceCode: "41",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["SE-30", "A-92", "A-4", "A-49"],
    hourPunta: { morning: "7:30–9:30", evening: "18:00–20:00" },
    description: "En Sevilla la SE-30 y los accesos por A-4 y A-92 registran los peores atascos. Hora punta mañana 7:30-9:30, tarde 18:00-20:00.",
  },
  malaga: {
    name: "Málaga",
    province: "Málaga",
    provinceCode: "29",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-7", "MA-20", "MA-21", "A-45"],
    hourPunta: { morning: "7:30–9:30", evening: "17:30–20:00" },
    description: "Málaga sufre congestión en la A-7 (autovía del Mediterráneo) y los rondas MA-20 y MA-21. Verano agrava las retenciones en accesos a la Costa del Sol.",
  },
  murcia: {
    name: "Murcia",
    province: "Murcia",
    provinceCode: "30",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-30", "RM-1", "A-7", "RM-3"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Murcia acumula tráfico en la A-30 y el acceso norte por RM-1. La A-7 registra retenciones en los meses de verano.",
  },
  palma: {
    name: "Palma",
    province: "Baleares",
    provinceCode: "07",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["Ma-20", "Ma-13", "Ma-19", "Ma-30"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "En Palma las retenciones se concentran en la autopista Ma-20 (Vía de Cintura) y los accesos al aeropuerto por Ma-19. El verano multiplica el tráfico por el turismo.",
  },
  "las-palmas": {
    name: "Las Palmas de Gran Canaria",
    province: "Las Palmas",
    provinceCode: "35",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["GC-1", "GC-2", "GC-3"],
    hourPunta: { morning: "7:00–9:00", evening: "17:00–19:30" },
    description: "Las Palmas de Gran Canaria concentra atascos en la GC-1 (autopista del sur) y la GC-3. La hora punta mañanera afecta especialmente al Puerto y el centro.",
  },
  bilbao: {
    name: "Bilbao",
    province: "Bizkaia",
    provinceCode: "48",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-8", "BI-625", "AP-68", "N-634"],
    hourPunta: { morning: "7:00–9:00", evening: "17:30–19:30" },
    description: "El área metropolitana de Bilbao tiene los mayores atascos en la A-8 y el acceso al centro por BI-625. Hora punta mañana 7:00-9:00, tarde 17:30-19:30.",
  },
  alicante: {
    name: "Alicante",
    province: "Alicante",
    provinceCode: "03",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-7", "N-332", "AP-7", "CV-10"],
    hourPunta: { morning: "7:30–9:30", evening: "17:00–19:30" },
    description: "Alicante acumula tráfico en la A-7 y la N-332. Los meses de verano disparan las retenciones hacia las playas de la provincia.",
  },
  cordoba: {
    name: "Córdoba",
    province: "Córdoba",
    provinceCode: "14",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-4", "A-45", "N-IV"],
    hourPunta: { morning: "7:30–9:00", evening: "18:00–19:30" },
    description: "Córdoba registra atascos principalmente en la A-4 (Madrid-Cádiz) y el acceso sur por A-45. El tráfico es moderado fuera de horas punta.",
  },
  valladolid: {
    name: "Valladolid",
    province: "Valladolid",
    provinceCode: "47",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-62", "VA-30", "N-122"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Valladolid sufre congestión en la VA-30 (ronda urbana) y la A-62. La hora punta de tarde es la más afectada.",
  },
  vigo: {
    name: "Vigo",
    province: "Pontevedra",
    provinceCode: "36",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-55", "AG-41", "AP-9", "VG-20"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Vigo tiene atascos frecuentes en la A-55 y el acceso a la ciudad por el corredor VG-20. La lluviosa meteorología gallega agrava las retenciones.",
  },
  gijon: {
    name: "Gijón",
    province: "Asturias",
    provinceCode: "33",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-8", "AS-II", "GI-21"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Gijón acumula tráfico en la A-8 (Autovía del Cantábrico) y los accesos portuarios. Hora punta mañana 7:30-9:00, tarde 17:30-19:30.",
  },
  "a-coruna": {
    name: "A Coruña",
    province: "A Coruña",
    provinceCode: "15",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["AG-55", "AP-9", "N-VI", "AC-11"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "A Coruña sufre congestión en la AG-55 y la AP-9 en las entradas por el sur. El puerto y el centro comercial añaden tráfico denso en horario comercial.",
  },
  vitoria: {
    name: "Vitoria-Gasteiz",
    province: "Álava",
    provinceCode: "01",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-1", "N-102", "N-104"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Vitoria-Gasteiz registra las mayores retenciones en la A-1 y los accesos al polígono industrial de Júndiz. Tráfico moderado comparado con otras capitales del País Vasco.",
  },
  granada: {
    name: "Granada",
    province: "Granada",
    provinceCode: "18",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-44", "GR-31", "A-92", "N-432"],
    hourPunta: { morning: "7:30–9:30", evening: "17:30–20:00" },
    description: "Granada acumula tráfico en la A-44 y la Circunvalación GR-31. El acceso a la Alhambra genera congestión turística especialmente en verano.",
  },
  elche: {
    name: "Elche",
    province: "Alicante",
    provinceCode: "03",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-7", "CV-865", "N-330"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Elche registra atascos en la A-7 y los accesos a los polígonos industriales. El tráfico de trabajadores hacia Alicante genera retenciones en hora punta.",
  },
  oviedo: {
    name: "Oviedo",
    province: "Asturias",
    provinceCode: "33",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-8", "AS-I", "A-66"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Oviedo tiene atascos en la AS-I (autovía de circunvalación) y la A-8 en los accesos a Gijón. Las obras frecuentes en el centro agravan la situación.",
  },
  "santa-cruz-de-tenerife": {
    name: "Santa Cruz de Tenerife",
    province: "Santa Cruz de Tenerife",
    provinceCode: "38",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["TF-1", "TF-5", "TF-2"],
    hourPunta: { morning: "7:00–9:00", evening: "16:30–19:30" },
    description: "Santa Cruz de Tenerife concentra atascos en la TF-1 (autopista del sur) y la TF-5 (del norte). El tráfico en la capital es especialmente intenso en horas punta de mañana.",
  },
  badajoz: {
    name: "Badajoz",
    province: "Badajoz",
    provinceCode: "06",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-5", "N-V", "EX-A1"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Badajoz registra atascos en la A-5 y los pasos fronterizos con Portugal en hora punta. El tráfico de mercancías transfronterizo añade presión a la red.",
  },
  mostoles: {
    name: "Móstoles",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["M-506", "M-50", "R-5", "A-5"],
    hourPunta: { morning: "7:00–9:30", evening: "18:00–20:30" },
    description: "Móstoles sufre atascos en la M-506 y el acceso a Madrid por A-5 y R-5. La M-50 actúa como distribuidora pero registra retenciones en hora punta.",
  },
  cartagena: {
    name: "Cartagena",
    province: "Murcia",
    provinceCode: "30",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-30", "CT-34", "N-332"],
    hourPunta: { morning: "7:00–9:00", evening: "17:00–19:00" },
    description: "Cartagena registra tráfico denso en la A-30 y los accesos a las bases militares y zonas industriales. El turismo veraniego añade presión a la red costera.",
  },
  terrassa: {
    name: "Terrassa",
    province: "Barcelona",
    provinceCode: "08",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "barcelona",
    mainRoads: ["C-58", "B-40", "C-16"],
    hourPunta: { morning: "7:00–9:30", evening: "17:30–20:00" },
    description: "Terrassa acumula atascos en la C-58 y la C-16 en los accesos a Barcelona. La B-40 alivia parte del tráfico pero satura en hora punta.",
  },
  jerez: {
    name: "Jerez de la Frontera",
    province: "Cádiz",
    provinceCode: "11",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-4", "A-381", "CA-33"],
    hourPunta: { morning: "7:30–9:30", evening: "17:30–19:30" },
    description: "Jerez registra retenciones en la A-4 y en los accesos al circuito de carreras durante eventos. El aeropuerto de Jerez suma tráfico en temporada alta.",
  },
  sabadell: {
    name: "Sabadell",
    province: "Barcelona",
    provinceCode: "08",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "barcelona",
    mainRoads: ["C-58", "B-40", "N-150"],
    hourPunta: { morning: "7:00–9:30", evening: "17:30–20:00" },
    description: "Sabadell sufre atascos en la C-58 en la conexión con Barcelona y la N-150. El área industrial de Can Roqueta genera tráfico adicional de pesados.",
  },
  "alcala-de-henares": {
    name: "Alcalá de Henares",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["A-2", "M-300", "N-II"],
    hourPunta: { morning: "7:00–9:30", evening: "18:00–20:30" },
    description: "Alcalá de Henares registra atascos en la A-2 hacia Madrid y la M-300. El corredor del Henares es uno de los más transitados de la región.",
  },
  pamplona: {
    name: "Pamplona",
    province: "Navarra",
    provinceCode: "31",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-15", "PA-30", "N-121"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Pamplona concentra atascos en la PA-30 (ronda exterior) y la A-15. Los Sanfermines generan congestión excepcional durante la primera quincena de julio.",
  },
  fuenlabrada: {
    name: "Fuenlabrada",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["M-407", "M-50", "A-42"],
    hourPunta: { morning: "7:00–9:30", evening: "18:00–20:30" },
    description: "Fuenlabrada registra atascos en la M-407 y la A-42 (autopista de Toledo). La M-50 es el principal distribuidor pero satura en hora punta.",
  },
  almeria: {
    name: "Almería",
    province: "Almería",
    provinceCode: "04",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-7", "AL-12", "N-344"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Almería sufre retenciones en la A-7 y los accesos al puerto. El tráfico de transporte de frutas y hortalizas desde el Poniente añade presión a la red.",
  },
  leganes: {
    name: "Leganés",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["M-45", "A-42", "M-407"],
    hourPunta: { morning: "7:00–9:30", evening: "18:00–20:30" },
    description: "Leganés registra atascos en la M-45 y la A-42. El campus de la Universidad Carlos III y los polígonos industriales generan tráfico adicional en hora punta.",
  },
  donostia: {
    name: "Donostia-San Sebastián",
    province: "Gipuzkoa",
    provinceCode: "20",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["AP-8", "N-1", "GI-20"],
    hourPunta: { morning: "7:00–9:00", evening: "17:30–19:30" },
    description: "Donostia-San Sebastián concentra atascos en la AP-8 y la GI-20 (pasante). El turismo veraniego y la Semana Grande generan congestión excepcional.",
  },
  castellon: {
    name: "Castellón de la Plana",
    province: "Castellón",
    provinceCode: "12",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-7", "N-340", "CV-10"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Castellón registra tráfico denso en la A-7 y los accesos al puerto y la zona industrial. El corredor Mediterráneo concentra el grueso de las retenciones.",
  },
  burgos: {
    name: "Burgos",
    province: "Burgos",
    provinceCode: "09",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-1", "N-I", "BU-30"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Burgos acumula tráfico en la A-1 (Madrid-Irún) y la BU-30 (circunvalación). El paso de camiones en tránsito hacia Francia añade presión a la red.",
  },
  santander: {
    name: "Santander",
    province: "Cantabria",
    provinceCode: "39",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-8", "S-20", "N-634"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Santander registra atascos en la A-8 y la S-20. El verano multiplica el tráfico turístico hacia las playas de El Sardinero y el ferri a Portsmouth.",
  },
  albacete: {
    name: "Albacete",
    province: "Albacete",
    provinceCode: "02",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-31", "N-322", "CM-31"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Albacete registra retenciones en la A-31 y los accesos a los polígonos industriales. Es nodo de paso entre Madrid, Valencia y Murcia.",
  },
  getafe: {
    name: "Getafe",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["A-4", "M-50", "N-IV"],
    hourPunta: { morning: "7:00–9:30", evening: "18:00–20:30" },
    description: "Getafe sufre atascos en la A-4 hacia Madrid y la M-50. La base aérea y la industria aeronáutica generan tráfico adicional en horario laboral.",
  },
  logrono: {
    name: "Logroño",
    province: "La Rioja",
    provinceCode: "26",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["LO-20", "A-12", "N-111"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Logroño concentra atascos en la LO-20 (circunvalación) y los accesos por la A-12. La vendimia en otoño suma tráfico agrícola a la red.",
  },
  salamanca: {
    name: "Salamanca",
    province: "Salamanca",
    provinceCode: "37",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-62", "N-501", "SA-20"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Salamanca registra tráfico denso en la SA-20 (variante) y la A-62. El inicio y fin del curso universitario genera picos de tráfico inusuales.",
  },
  huelva: {
    name: "Huelva",
    province: "Huelva",
    provinceCode: "21",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-49", "H-30", "N-435"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Huelva acumula tráfico en la A-49 y los accesos al polo industrial. El tráfico portuario de mercancías es especialmente intenso durante la semana.",
  },
  marbella: {
    name: "Marbella",
    province: "Málaga",
    provinceCode: "29",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-7", "AP-7", "MA-513"],
    hourPunta: { morning: "9:00–11:00", evening: "18:00–21:00" },
    description: "Marbella sufre atascos extremos en la A-7 y la AP-7 durante el verano. El turismo de lujo genera un patrón de hora punta más tardío que en otras ciudades.",
  },
  lleida: {
    name: "Lleida",
    province: "Lleida",
    provinceCode: "25",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-2", "C-13", "L-11"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "Lleida registra atascos en la A-2 y los accesos desde la C-13. La cosecha de fruta en verano suma maquinaria agrícola y camiones a la red.",
  },
  tarragona: {
    name: "Tarragona",
    province: "Tarragona",
    provinceCode: "43",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["AP-7", "N-340", "T-11"],
    hourPunta: { morning: "7:00–9:30", evening: "17:30–20:00" },
    description: "Tarragona concentra tráfico en la AP-7 y el acceso al puerto. El polígono petroquímico de Repsol genera tráfico industrial constante.",
  },
  leon: {
    name: "León",
    province: "León",
    provinceCode: "24",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-60", "N-601", "LE-30"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:00" },
    description: "León registra retenciones en la A-60 (ronda sur) y los accesos al campus universitario. El tráfico es moderado comparado con otras capitales de provincia.",
  },
  cadiz: {
    name: "Cádiz",
    province: "Cádiz",
    provinceCode: "11",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-4", "CA-33", "CA-31"],
    hourPunta: { morning: "7:30–9:30", evening: "17:30–19:30" },
    description: "Cádiz sufre atascos en el acceso al istmo por la CA-33 y la A-4. La posición peninsular de la ciudad limita las vías de acceso y provoca cuellos de botella frecuentes.",
  },
  mataro: {
    name: "Mataró",
    province: "Barcelona",
    provinceCode: "08",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "barcelona",
    mainRoads: ["C-32", "N-II", "B-500"],
    hourPunta: { morning: "7:00–9:30", evening: "17:30–20:00" },
    description: "Mataró acumula tráfico en la C-32 y la N-II en los accesos a Barcelona. La autopista del Maresme es el principal corredor pero satura en hora punta.",
  },
  "dos-hermanas": {
    name: "Dos Hermanas",
    province: "Sevilla",
    provinceCode: "41",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-4", "SE-30", "N-IV"],
    hourPunta: { morning: "7:30–9:30", evening: "17:30–20:00" },
    description: "Dos Hermanas registra atascos en la A-4 y la SE-30. El corredor industrial de la ciudad genera tráfico pesado durante la jornada laboral.",
  },
  torrejon: {
    name: "Torrejón de Ardoz",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["A-2", "M-206", "R-3"],
    hourPunta: { morning: "7:00–9:30", evening: "18:00–20:30" },
    description: "Torrejón de Ardoz sufre atascos en la A-2 (corredor del Henares) y la M-206. La base aérea de Torrejón genera tráfico militar adicional.",
  },
  parla: {
    name: "Parla",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["A-42", "M-407", "M-50"],
    hourPunta: { morning: "7:00–9:30", evening: "18:00–20:30" },
    description: "Parla registra retenciones en la A-42 (autopista de Toledo) y la M-407. Es uno de los municipios con mayor crecimiento del área sur de Madrid.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// generateStaticParams — 50 ciudades
// ─────────────────────────────────────────────────────────────────────────────
export function generateStaticParams() {
  return Object.keys(CITIES).map((ciudad) => ({ ciudad }));
}
// dynamicParams=true (2026-06-10): with dynamicParams=false + ISR
// revalidate, RSC (_rsc) prefetch requests intermittently threw
// "Internal: NoFallbackError" -> HTTP 500 even for params in
// generateStaticParams (24 hits/6h in prod logs; direct loads were 200).
// Unknown slugs are still rejected by the notFound() guard in the page.
export const dynamicParams = true;

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────
async function getData(ciudad: string) {
  const config = CITIES[ciudad];
  if (!config) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday

  // Incidencias activas en la provincia
  const incidentsPromise = prisma.trafficIncident.findMany({
    where: {
      isActive: true,
      province: config.provinceCode,
      type: { in: ["CONGESTION", "ACCIDENT", "ROADWORK", "CLOSURE"] },
    },
    orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
    take: 30,
    select: {
      id: true,
      type: true,
      roadNumber: true,
      kmPoint: true,
      direction: true,
      description: true,
      severity: true,
      startedAt: true,
      municipality: true,
    },
  });

  // Madrid: TrafficIntensity snapshot (últimos 10 min, agrupado por serviceLevel)
  const intensityStatsPromise = config.hasIntensitySource
    ? prisma.trafficIntensity.groupBy({
        by: ["serviceLevel"],
        _count: true,
        where: {
          source: config.intensitySource,
          recordedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
      })
    : Promise.resolve(null);

  // City sensors (BCN/VAL/ZAR): contar sensores disponibles
  const citySensorCountPromise =
    config.hasCitySensors && config.citySensorKey
      ? prisma.cityTrafficSensor.count({ where: { city: config.citySensorKey } })
      : Promise.resolve(null);

  // Perfil horario histórico (Madrid) para widget "mejor hora de salida"
  const hourlyProfilePromise = config.hasIntensitySource
    ? prisma.hourlyTrafficProfile.groupBy({
        by: ["hour"],
        _avg: { avgServiceLevel: true, avgIntensity: true },
        where: { source: config.intensitySource ?? "MADRID", dayOfWeek },
        orderBy: { hour: "asc" },
      })
    : Promise.resolve(null);

  const [incidents, intensityStats, citySensorCount, hourlyProfile] = await Promise.all([
    incidentsPromise,
    intensityStatsPromise,
    citySensorCountPromise,
    hourlyProfilePromise,
  ]);

  // Derivar nivel de congestión
  let congestLevel: "fluid" | "slow" | "holdups" | "congestion" = "fluid";
  let sensorTotal = 0;
  let congestCount = 0;

  if (intensityStats) {
    const statMap: Record<number, number> = {};
    intensityStats.forEach((s) => { statMap[s.serviceLevel] = s._count; });
    sensorTotal = Object.values(statMap).reduce((a, b) => a + b, 0);
    congestCount = (statMap[2] ?? 0) + (statMap[3] ?? 0);
    const congestRatio = sensorTotal > 0 ? congestCount / sensorTotal : 0;
    if (congestRatio > 0.2) congestLevel = "congestion";
    else if (congestRatio > 0.1) congestLevel = "holdups";
    else if (congestRatio > 0.05) congestLevel = "slow";
  } else {
    const criticalInc = incidents.filter((i) => ["HIGH", "CRITICAL"].includes(i.severity)).length;
    if (criticalInc >= 5) congestLevel = "congestion";
    else if (criticalInc >= 2) congestLevel = "holdups";
    else if (incidents.length >= 3) congestLevel = "slow";
  }

  // Mejor hora de salida (próximas 4h, solo Madrid)
  let bestDepartureHour: number | null = null;
  let bestDepartureAvg: number | null = null;
  if (hourlyProfile && hourlyProfile.length > 0) {
    const nextHours = hourlyProfile.filter(
      (h) => h.hour >= currentHour && h.hour <= currentHour + 4
    );
    if (nextHours.length > 0) {
      const best = nextHours.reduce((a, b) =>
        (Number(a._avg.avgServiceLevel) ?? 3) < (Number(b._avg.avgServiceLevel) ?? 3) ? a : b
      );
      bestDepartureHour = best.hour;
      bestDepartureAvg = Number(best._avg.avgServiceLevel) ?? null;
    }
  }

  return {
    config,
    incidents,
    congestLevel,
    sensorTotal,
    congestCount,
    citySensorCount,
    hourlyProfile,
    bestDepartureHour,
    bestDepartureAvg,
    currentHour,
    dayOfWeek,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}): Promise<Metadata> {
  const { ciudad } = await params;
  const config = CITIES[ciudad];
  if (!config) return { title: "Ciudad no encontrada" };

  const title = `Atascos ${config.name} ahora | Tráfico en tiempo real ${config.name}`;
  const description =
    `${config.description} Datos actualizados cada 2 minutos. Vías principales: ${config.mainRoads.slice(0, 4).join(", ")}.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/atascos/${ciudad}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/atascos/${ciudad}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getCongestionLabel(level: string) {
  switch (level) {
    case "congestion":
      return {
        label: "Tráfico muy denso",
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        dot: "bg-red-500",
      };
    case "holdups":
      return {
        label: "Retenciones activas",
        color: "text-tl-amber-600 dark:text-tl-amber-400",
        bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
        border: "border-tl-amber-200 dark:border-tl-amber-800",
        dot: "bg-tl-amber-500",
      };
    case "slow":
      return {
        label: "Tráfico lento",
        color: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        border: "border-yellow-200 dark:border-yellow-800",
        dot: "bg-yellow-400",
      };
    default:
      return {
        label: "Tráfico fluido",
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-900/20",
        border: "border-green-200 dark:border-green-800",
        dot: "bg-green-500",
      };
  }
}

function getSeverityLabel(s: string) {
  switch (s) {
    case "CRITICAL": return "Crítico";
    case "HIGH": return "Intenso";
    case "MEDIUM": return "Moderado";
    default: return "Leve";
  }
}

function getSeverityBadge(s: string) {
  switch (s) {
    case "CRITICAL":
    case "HIGH": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    case "MEDIUM": return "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300";
    default: return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
  }
}

function getIncidentTypeLabel(t: string) {
  const map: Record<string, string> = {
    ACCIDENT: "Accidente",
    CONGESTION: "Retención",
    ROADWORK: "Obras",
    CLOSURE: "Corte",
    OBSTACLE: "Obstáculo",
    WEATHER: "Meteorología",
    OTHER: "Incidencia",
  };
  return map[t] ?? "Incidencia";
}

function formatDuration(startedAt: Date) {
  const mins = Math.floor((Date.now() - startedAt.getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function AtascosCiudadPage({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}) {
  const { ciudad } = await params;
  const data = await getData(ciudad);
  if (!data) notFound();

  const {
    config,
    incidents,
    congestLevel,
    sensorTotal,
    hourlyProfile,
    bestDepartureHour,
    bestDepartureAvg,
    currentHour,
  } = data;

  const congStatus = getCongestionLabel(congestLevel);
  const now = new Date();
  const lastUpdated = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 20);

  // JSON-LD
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Cómo está el tráfico en ${config.name} ahora?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: congestLevel === "fluid"
            ? `El tráfico en ${config.name} fluye con normalidad en este momento. No hay retenciones significativas activas. Última actualización: ${lastUpdated}.`
            : `Hay ${incidents.length} incidencia${incidents.length !== 1 ? "s" : ""} activa${incidents.length !== 1 ? "s" : ""} en ${config.name}: ${congestLevel === "congestion" ? "tráfico muy denso" : congestLevel === "holdups" ? "retenciones activas" : "tráfico lento"}. ${config.description} Última actualización: ${lastUpdated}.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Cuáles son las horas punta en ${config.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Las horas punta en ${config.name} son por la mañana de ${config.hourPunta.morning} y por la tarde de ${config.hourPunta.evening} en días laborables. Las vías más afectadas son ${config.mainRoads.slice(0, 4).join(", ")}.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Hay atascos en ${config.name} hoy?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: incidents.length > 0
            ? `Sí, hay ${incidents.length} incidencia${incidents.length > 1 ? "s" : ""} activa${incidents.length > 1 ? "s" : ""} en ${config.name}: ${incidents.slice(0, 3).map((i) => `${getIncidentTypeLabel(i.type)}${i.roadNumber ? ` en ${i.roadNumber}` : ""}`).join(", ")}.`
            : `En este momento no hay atascos significativos registrados en ${config.name}. Las carreteras circulan con normalidad.`,
        },
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Atascos", item: `${BASE_URL}/atascos` },
      { "@type": "ListItem", position: 3, name: config.name, item: `${BASE_URL}/atascos/${ciudad}` },
    ],
  };

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: config.name,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: config.province,
      containedInPlace: { "@type": "Country", name: "España" },
    },
  };

  // Ciudades relacionadas (excluir la actual)
  const otherCities = Object.entries(CITIES)
    .filter(([key]) => key !== ciudad)
    .slice(0, 12);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {[faqSchema, breadcrumbSchema, placeSchema].map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Atascos", href: "/atascos" },
            { name: config.name, href: `/atascos/${ciudad}` },
          ]}
        />

        {/* ── Header ── */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex-shrink-0">
              <Car className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Atascos {config.name} ahora
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${congStatus.bg} ${congStatus.border} ${congStatus.color}`}
                >
                  <span className={`w-2 h-2 rounded-full animate-pulse ${congStatus.dot}`} />
                  {congStatus.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizado a las {lastUpdated} · {incidents.length} incidencia
                {incidents.length !== 1 ? "s" : ""} activa{incidents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Párrafo Answer-friendly */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {congestLevel === "fluid"
                ? `El tráfico en ${config.name} fluye con normalidad en este momento. No hay retenciones ni atascos significativos activos en las principales vías. ${isRushHour ? "Aunque es hora punta, la circulación es aceptable." : ""}`
                : `Hay ${incidents.length} incidencia${incidents.length !== 1 ? "s" : ""} activa${incidents.length !== 1 ? "s" : ""} en ${config.name} ahora mismo. ${congestLevel === "congestion" ? "Tráfico muy denso en varias vías principales." : "Retenciones en curso."} ${config.description}`}
            </p>
            {isRushHour && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-tl-amber-600 dark:text-tl-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Hora punta activa ({currentHour}:00) — mayor densidad de tráfico
              </div>
            )}
          </div>
        </header>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${incidents.length > 0 ? "text-red-500" : "text-green-500"}`} />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">{incidents.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Incidencias</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">
              {incidents.filter((i) => i.type === "CONGESTION").length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Retenciones</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            <Construction className="w-5 h-5 mx-auto mb-1 text-tl-amber-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">
              {incidents.filter((i) => i.type === "ROADWORK").length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Obras en curso</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            {sensorTotal > 0 ? (
              <>
                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-tl-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">{sensorTotal}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sensores activos</p>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-tl-500" />
                <Link
                  href={`/carreteras/${encodeURIComponent(config.mainRoads[0])}/hoy`}
                  className="text-sm font-semibold text-tl-600 dark:text-tl-400 hover:underline block mt-1"
                >
                  {config.mainRoads[0]} hoy
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── Mejor hora de salida (Madrid y ciudades con intensidad) ── */}
        {bestDepartureHour !== null && (
          <section
            className="mb-6 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-4"
            aria-labelledby="heading-best-hour"
          >
            <h2
              id="heading-best-hour"
              className="text-base font-bold text-tl-800 dark:text-tl-300 mb-2 flex items-center gap-2"
            >
              <Clock className="w-5 h-5" />
              ¿A qué hora salir para evitar el atasco?
            </h2>
            <p className="text-sm text-tl-700 dark:text-tl-400">
              Según el perfil histórico de hoy, la <strong>mejor hora de salida</strong> en las
              próximas 4 horas es las{" "}
              <span className="font-bold text-tl-900 dark:text-tl-200 font-mono">
                {formatHour(bestDepartureHour)}
              </span>
              {bestDepartureAvg !== null && bestDepartureAvg < 1 && " — tráfico fluido"}.
            </p>
            <p className="text-xs text-tl-500 mt-2">
              Estimación basada en promedios históricos de sensores DGT. Puede variar por
              eventos no registrados.
            </p>
          </section>
        )}

        {/* ── Gráfico horario (Madrid) ── */}
        {hourlyProfile && hourlyProfile.length > 0 && (
          <section
            className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
            aria-labelledby="heading-hourly"
          >
            <h2
              id="heading-hourly"
              className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5 text-tl-500" />
              Intensidad de tráfico por hora — hoy en {config.name}
            </h2>
            <div className="flex items-end gap-1 h-16">
              {hourlyProfile.map((h) => {
                const level = Number(h._avg.avgServiceLevel ?? 0);
                const heightPct = Math.min(100, (level / 3) * 100);
                const isCurrent = h.hour === currentHour;
                const color =
                  level > 2 ? "bg-red-400" :
                  level > 1.5 ? "bg-tl-amber-400" :
                  level > 0.8 ? "bg-yellow-400" : "bg-green-400";
                return (
                  <div
                    key={h.hour}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${formatHour(h.hour)}: nivel ${level.toFixed(1)}`}
                  >
                    <div
                      className={`w-full rounded-sm ${color} ${isCurrent ? "ring-2 ring-tl-600 ring-offset-1" : ""}`}
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    />
                    {h.hour % 3 === 0 && (
                      <span className="text-[9px] text-gray-400 tabular-nums">
                        {String(h.hour).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-400 inline-block" />Fluido</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-yellow-400 inline-block" />Lento</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-tl-amber-400 inline-block" />Retenciones</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-400 inline-block" />Intenso</span>
            </div>
          </section>
        )}

        {/* ── Incidencias activas ── */}
        <section className="mb-6" aria-labelledby="heading-incidents">
          <h2
            id="heading-incidents"
            className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"
          >
            <Activity className="w-5 h-5 text-red-500" />
            Atascos e incidencias activas en {config.name}
          </h2>
          {incidents.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Sin atascos registrados
              </h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Las carreteras de {config.name} circulan con normalidad en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => (
                <article
                  key={inc.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {inc.roadNumber ? (
                      <Link
                        href={`/carreteras/${encodeURIComponent(inc.roadNumber)}/hoy`}
                        className="flex-shrink-0 inline-block px-2.5 py-1.5 bg-tl-600 text-white text-sm font-bold rounded-lg hover:bg-tl-700 transition-colors"
                      >
                        {inc.roadNumber}
                      </Link>
                    ) : (
                      <span className="flex-shrink-0 inline-block px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg">
                        Urbano
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug mb-1">
                        {inc.description ||
                          `${getIncidentTypeLabel(inc.type)}${inc.roadNumber ? ` en ${inc.roadNumber}` : ""}${inc.kmPoint ? ` km ${Number(inc.kmPoint).toFixed(0)}` : ""}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                        {inc.municipality && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{inc.municipality}
                          </span>
                        )}
                        {inc.kmPoint && <span>km {Number(inc.kmPoint).toFixed(0)}</span>}
                        {inc.direction && <span>Dir. {inc.direction}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Hace {formatDuration(inc.startedAt)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${getSeverityBadge(inc.severity)}`}
                    >
                      {getSeverityLabel(inc.severity)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Vías principales ── */}
        <section className="mb-6" aria-labelledby="heading-roads">
          <h2
            id="heading-roads"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
          >
            Estado en vivo de las vías principales en {config.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {config.mainRoads.map((road) => (
              <Link
                key={road}
                href={`/carreteras/${encodeURIComponent(road)}/hoy`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 transition-all"
              >
                {road} hoy
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Horas punta info ── */}
        <section className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5" aria-labelledby="heading-horarios">
          <h2 id="heading-horarios" className="font-heading text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-tl-500" />
            Horarios de mayor tráfico en {config.name}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Hora punta mañana</p>
              <p className="font-mono font-bold text-gray-900 dark:text-gray-100">{config.hourPunta.morning}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Hora punta tarde</p>
              <p className="font-mono font-bold text-gray-900 dark:text-gray-100">{config.hourPunta.evening}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">{config.description}</p>
        </section>

        {/* ── Otras ciudades ── */}
        <nav aria-label="Atascos en otras ciudades">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Atascos en otras ciudades
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCities.map(([key, city]) => (
              <Link
                key={key}
                href={`/atascos/${key}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 transition-all"
              >
                <MapPin className="w-3 h-3 text-tl-500" />
                {city.name}
              </Link>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}

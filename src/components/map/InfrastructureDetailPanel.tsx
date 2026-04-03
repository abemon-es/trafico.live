"use client";

import React from "react";
import { X, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";

// Union type for all clickable infrastructure
export type InfrastructureType =
  | "road" | "railway-station" | "airport" | "port" | "gas-station"
  | "camera" | "radar" | "ev-charger" | "transit-stop" | "ferry-stop"
  | "train" | "vessel" | "aircraft" | "incident" | "sensor"
  | "climate-station" | "panel" | "roadwork" | "counting-station";

export interface InfrastructureDetail {
  type: InfrastructureType;
  title: string;
  subtitle?: string;
  coordinates?: [number, number];
  properties: Record<string, unknown>;
  /** Link to detail page */
  href?: string;
}

interface Props {
  detail: InfrastructureDetail | null;
  onClose: () => void;
}

// Type config: icon color, label
const TYPE_CONFIG: Record<InfrastructureType, { color: string; label: string }> = {
  "road":             { color: "#1b4bd5", label: "Carretera" },
  "railway-station":  { color: "#7c3aed", label: "Estación de tren" },
  "airport":          { color: "#6366f1", label: "Aeropuerto" },
  "port":             { color: "#0284c7", label: "Puerto" },
  "gas-station":      { color: "#d48139", label: "Gasolinera" },
  "camera":           { color: "#1b4bd5", label: "Cámara DGT" },
  "radar":            { color: "#dc2626", label: "Radar" },
  "ev-charger":       { color: "#34d399", label: "Cargador EV" },
  "transit-stop":     { color: "#3b82f6", label: "Parada transporte" },
  "ferry-stop":       { color: "#0891b2", label: "Parada ferry" },
  "train":            { color: "#7c3aed", label: "Tren en circulación" },
  "vessel":           { color: "#0891b2", label: "Buque" },
  "aircraft":         { color: "#0ea5e9", label: "Aeronave" },
  "incident":         { color: "#dc2626", label: "Incidencia" },
  "sensor":           { color: "#059669", label: "Sensor de tráfico" },
  "climate-station":  { color: "#06b6d4", label: "Estación meteorológica" },
  "panel":            { color: "#06b6d4", label: "Panel variable" },
  "roadwork":         { color: "#f59e0b", label: "Obras" },
  "counting-station": { color: "#366cf8", label: "Estación de aforo" },
};

export function InfrastructureDetailPanel({ detail, onClose }: Props) {
  if (!detail) return null;

  const config = TYPE_CONFIG[detail.type];
  const p = detail.properties;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[380px] z-30 bg-white/97 dark:bg-gray-950/97 backdrop-blur-md border-l border-gray-200 dark:border-gray-700 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-5 py-4 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-[0.65rem] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {config.label}
              </span>
            </div>
            <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {detail.title}
            </h3>
            {detail.subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{detail.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Coordinates */}
        {detail.coordinates && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <MapPin className="w-3 h-3" />
            <span className="font-mono">
              {detail.coordinates[1].toFixed(4)}, {detail.coordinates[0].toFixed(4)}
            </span>
          </div>
        )}

        {/* Dynamic properties grid */}
        <div className="grid grid-cols-2 gap-2">
          {renderProperties(detail.type, p)}
        </div>

        {/* Link to detail page */}
        {detail.href && (
          <Link
            href={detail.href}
            className="flex items-center justify-center gap-2 w-full bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors mt-4"
          >
            Ver detalle completo
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

// Property card
function PropCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2">
      <p className="text-[0.6rem] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="font-data text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
        {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        {unit && <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// Render properties based on infrastructure type
function renderProperties(
  type: InfrastructureType,
  p: Record<string, unknown>
): React.ReactElement[] {
  const cards: React.ReactElement[] = [];

  switch (type) {
    case "road":
    case "counting-station":
      if (p.roadNumber) cards.push(<PropCard key="road" label="Carretera" value={String(p.roadNumber)} />);
      if (p.imd) cards.push(<PropCard key="imd" label="IMD" value={Number(p.imd)} unit="veh/día" />);
      if (p.provinceName) cards.push(<PropCard key="prov" label="Provincia" value={String(p.provinceName)} />);
      if (p.percentPesados) cards.push(<PropCard key="pesados" label="% Pesados" value={`${Number(p.percentPesados).toFixed(1)}%`} />);
      if (p.kmPoint) cards.push(<PropCard key="km" label="PK" value={`${Number(p.kmPoint).toFixed(1)}`} unit="km" />);
      break;

    case "railway-station":
      if (p.name) cards.push(<PropCard key="name" label="Estación" value={String(p.name)} />);
      if (p.network) cards.push(<PropCard key="net" label="Red" value={String(p.network)} />);
      if (p.province) cards.push(<PropCard key="prov" label="Provincia" value={String(p.province)} />);
      if (p.serviceTypes) cards.push(<PropCard key="srv" label="Servicios" value={String(p.serviceTypes)} />);
      break;

    case "airport":
      if (p.iata) cards.push(<PropCard key="iata" label="IATA" value={String(p.iata)} />);
      if (p.icao) cards.push(<PropCard key="icao" label="ICAO" value={String(p.icao)} />);
      if (p.city) cards.push(<PropCard key="city" label="Ciudad" value={String(p.city)} />);
      if (p.elevation) cards.push(<PropCard key="elev" label="Elevación" value={Number(p.elevation)} unit="m" />);
      break;

    case "port":
      if (p.type) cards.push(<PropCard key="type" label="Tipo" value={String(p.type)} />);
      if (p.coastalZone) cards.push(<PropCard key="zone" label="Zona costera" value={String(p.coastalZone)} />);
      if (p.stationCount) cards.push(<PropCard key="count" label="Estaciones" value={Number(p.stationCount)} />);
      if (p.provinceName) cards.push(<PropCard key="prov" label="Provincia" value={String(p.provinceName)} />);
      break;

    case "train":
      if (p.brand) cards.push(<PropCard key="brand" label="Marca" value={String(p.brand)} />);
      if (p.trainNumber || p.trainId) cards.push(<PropCard key="num" label="Tren" value={String(p.trainNumber ?? p.trainId)} />);
      if (p.delay != null) {
        const d = Number(p.delay);
        cards.push(<PropCard key="delay" label="Retraso" value={d <= 0 ? "Puntual" : `+${d} min`} />);
      }
      if (p.originStation || p.origin) cards.push(<PropCard key="orig" label="Origen" value={String(p.originStation ?? p.origin)} />);
      if (p.destStation || p.destination) cards.push(<PropCard key="dest" label="Destino" value={String(p.destStation ?? p.destination)} />);
      if (p.speed) cards.push(<PropCard key="speed" label="Velocidad" value={Number(p.speed)} unit="km/h" />);
      break;

    case "aircraft":
      if (p.callsign) cards.push(<PropCard key="call" label="Callsign" value={String(p.callsign)} />);
      if (p.icao24) cards.push(<PropCard key="icao" label="ICAO24" value={String(p.icao24)} />);
      if (p.altitude) cards.push(<PropCard key="alt" label="Altitud" value={Number(p.altitude)} unit="ft" />);
      if (p.velocity) cards.push(<PropCard key="vel" label="Velocidad" value={Math.round(Number(p.velocity) * 3.6)} unit="km/h" />);
      if (p.originCountry) cards.push(<PropCard key="country" label="País" value={String(p.originCountry)} />);
      if (p.heading) cards.push(<PropCard key="hdg" label="Rumbo" value={`${Math.round(Number(p.heading))}°`} />);
      break;

    case "vessel":
      if (p.vesselName) cards.push(<PropCard key="name" label="Nombre" value={String(p.vesselName)} />);
      if (p.mmsi) cards.push(<PropCard key="mmsi" label="MMSI" value={String(p.mmsi)} />);
      if (p.flag) cards.push(<PropCard key="flag" label="Bandera" value={String(p.flag)} />);
      if (p.destination) cards.push(<PropCard key="dest" label="Destino" value={String(p.destination)} />);
      if (p.sog) cards.push(<PropCard key="sog" label="SOG" value={Number(p.sog).toFixed(1)} unit="kn" />);
      if (p.shipType) cards.push(<PropCard key="type" label="Tipo" value={String(p.shipType)} />);
      break;

    case "gas-station":
      if (p.brand || p.name) cards.push(<PropCard key="name" label="Marca" value={String(p.brand ?? p.name)} />);
      if (p.priceDieselA || p.priceGasoleoA) cards.push(<PropCard key="diesel" label="Diésel A" value={`${Number(p.priceDieselA ?? p.priceGasoleoA).toFixed(3)} €`} />);
      if (p.priceGasolina95) cards.push(<PropCard key="g95" label="Gasolina 95" value={`${Number(p.priceGasolina95).toFixed(3)} €`} />);
      if (p.schedule) cards.push(<PropCard key="sched" label="Horario" value={String(p.schedule)} />);
      break;

    case "sensor":
      if (p.sensorId || p.description) cards.push(<PropCard key="id" label="Sensor" value={String(p.description ?? p.sensorId)} />);
      if (p.intensity) cards.push(<PropCard key="int" label="Intensidad" value={Number(p.intensity)} unit="veh/h" />);
      if (p.occupancy) cards.push(<PropCard key="occ" label="Ocupación" value={`${Number(p.occupancy).toFixed(1)}%`} />);
      if (p.serviceLevel != null) {
        const l = Number(p.serviceLevel);
        const levelLabel = l === 0 ? "Fluido" : l === 1 ? "Denso" : l === 2 ? "Congestionado" : "Cortado";
        cards.push(<PropCard key="lvl" label="Nivel" value={levelLabel} />);
      }
      break;

    case "camera":
      if (p.name) cards.push(<PropCard key="name" label="Cámara" value={String(p.name)} />);
      if (p.roadNumber) cards.push(<PropCard key="road" label="Carretera" value={String(p.roadNumber)} />);
      if (p.provinceName) cards.push(<PropCard key="prov" label="Provincia" value={String(p.provinceName)} />);
      break;

    case "radar":
      if (p.speedLimit) cards.push(<PropCard key="limit" label="Límite" value={Number(p.speedLimit)} unit="km/h" />);
      if (p.type) cards.push(<PropCard key="type" label="Tipo" value={String(p.type)} />);
      if (p.roadNumber) cards.push(<PropCard key="road" label="Carretera" value={String(p.roadNumber)} />);
      if (p.direction) cards.push(<PropCard key="dir" label="Sentido" value={String(p.direction)} />);
      break;

    case "incident":
      if (p.effect) cards.push(<PropCard key="eff" label="Efecto" value={String(p.effect)} />);
      if (p.cause || p.causeType) cards.push(<PropCard key="cause" label="Causa" value={String(p.cause ?? p.causeType)} />);
      if (p.roadNumber) cards.push(<PropCard key="road" label="Carretera" value={String(p.roadNumber)} />);
      if (p.severity) cards.push(<PropCard key="sev" label="Gravedad" value={String(p.severity)} />);
      if (p.description) cards.push(<PropCard key="desc" label="Descripción" value={String(p.description)} />);
      break;

    case "climate-station":
      if (p.stationCode) cards.push(<PropCard key="code" label="Código" value={String(p.stationCode)} />);
      if (p.name) cards.push(<PropCard key="name" label="Estación" value={String(p.name)} />);
      if (p.altitude) cards.push(<PropCard key="alt" label="Altitud" value={Number(p.altitude)} unit="m" />);
      if (p.provinceName) cards.push(<PropCard key="prov" label="Provincia" value={String(p.provinceName)} />);
      break;

    case "panel":
      if (p.roadNumber) cards.push(<PropCard key="road" label="Carretera" value={String(p.roadNumber)} />);
      if (p.message) cards.push(<PropCard key="msg" label="Mensaje" value={String(p.message)} />);
      if (p.kmPoint) cards.push(<PropCard key="km" label="PK" value={Number(p.kmPoint).toFixed(1)} unit="km" />);
      break;

    case "ev-charger":
      if (p.operator) cards.push(<PropCard key="op" label="Operador" value={String(p.operator)} />);
      if (p.powerKw) cards.push(<PropCard key="kw" label="Potencia" value={Number(p.powerKw)} unit="kW" />);
      if (p.connectors) cards.push(<PropCard key="conn" label="Conectores" value={String(p.connectors)} />);
      break;

    case "roadwork":
      if (p.roadNumber) cards.push(<PropCard key="road" label="Carretera" value={String(p.roadNumber)} />);
      if (p.description) cards.push(<PropCard key="desc" label="Descripción" value={String(p.description)} />);
      if (p.province) cards.push(<PropCard key="prov" label="Provincia" value={String(p.province)} />);
      break;

    case "transit-stop":
      if (p.name) cards.push(<PropCard key="name" label="Parada" value={String(p.name)} />);
      if (p.routeName || p.route) cards.push(<PropCard key="route" label="Línea" value={String(p.routeName ?? p.route)} />);
      if (p.provinceName || p.province) cards.push(<PropCard key="prov" label="Provincia" value={String(p.provinceName ?? p.province)} />);
      break;

    case "ferry-stop":
      if (p.name) cards.push(<PropCard key="name" label="Parada" value={String(p.name)} />);
      if (p.routeName || p.route) cards.push(<PropCard key="route" label="Línea" value={String(p.routeName ?? p.route)} />);
      if (p.operator) cards.push(<PropCard key="op" label="Operador" value={String(p.operator)} />);
      break;

    default: {
      // Generic: show all string/number properties
      let count = 0;
      for (const [k, v] of Object.entries(p)) {
        if (typeof v === "string" || typeof v === "number") {
          cards.push(<PropCard key={k} label={k} value={v} />);
          count++;
        }
        if (count >= 8) break;
      }
      break;
    }
  }

  return cards;
}

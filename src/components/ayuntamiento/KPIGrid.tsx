import {
  AlertTriangle,
  Fuel,
  Wind,
  Car,
  Cloud,
  ParkingCircle,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

export interface MunicipalKPIs {
  activeIncidents: number;
  icaLevel: number | null; // 1-6 ICA index
  icaLabel: string | null;
  weatherAlerts: number;
  fuelPriceAvg: number | null; // avg gasolina 95 in €/L
  parkingsOccupancy: number | null; // % 0-100
}

interface KPIGridProps {
  kpis: MunicipalKPIs;
  municipioName: string;
}

const ICA_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Buena", color: "tl-sea" },
  2: { label: "Razonablemente buena", color: "tl-sea" },
  3: { label: "Regular", color: "tl-amber" },
  4: { label: "Desfavorable", color: "tl-amber" },
  5: { label: "Muy desfavorable", color: "neutral" },
  6: { label: "Extremadamente desfavorable", color: "neutral" },
};

export function KPIGrid({ kpis, municipioName: _municipioName }: KPIGridProps) {
  const icaMeta = kpis.icaLevel ? ICA_LABELS[kpis.icaLevel] : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {/* Incidentes 24h */}
      <StatCard
        label="Incidentes 24h"
        value={kpis.activeIncidents}
        hint="Incidencias DGT activas"
        icon={AlertTriangle}
        accent={kpis.activeIncidents > 10 ? "neutral" : "tl"}
        trend={
          kpis.activeIncidents === 0
            ? { direction: "down", label: "Sin incidencias" }
            : undefined
        }
      />

      {/* Calidad del aire */}
      <StatCard
        label="Calidad del aire"
        value={
          kpis.icaLevel !== null ? (
            <span>
              ICA{" "}
              <span className="font-mono">{kpis.icaLevel}</span>
            </span>
          ) : (
            "N/D"
          )
        }
        hint={icaMeta?.label ?? kpis.icaLabel ?? "Sin datos"}
        icon={Wind}
        accent={
          !kpis.icaLevel
            ? "neutral"
            : kpis.icaLevel <= 2
            ? "tl-sea"
            : kpis.icaLevel <= 4
            ? "tl-amber"
            : "neutral"
        }
      />

      {/* Alertas meteo */}
      <StatCard
        label="Alertas meteorológicas"
        value={kpis.weatherAlerts}
        hint="AEMET activas"
        icon={Cloud}
        accent={kpis.weatherAlerts > 0 ? "tl-amber" : "tl"}
      />

      {/* Precio gasolina */}
      <StatCard
        label="Gasolina 95"
        value={
          kpis.fuelPriceAvg !== null ? (
            <span className="font-mono">
              {kpis.fuelPriceAvg.toFixed(3)} €/L
            </span>
          ) : (
            "N/D"
          )
        }
        hint="Precio medio municipio"
        icon={Fuel}
        accent="tl-amber"
        mono
      />

      {/* Tráfico activo */}
      <StatCard
        label="Tráfico activo"
        value="En tiempo real"
        hint="Ver mapa DGT"
        icon={Car}
        accent="tl"
      />

      {/* Parkings */}
      <StatCard
        label="Ocupación parkings"
        value={
          kpis.parkingsOccupancy !== null
            ? `${Math.round(kpis.parkingsOccupancy)}%`
            : "N/D"
        }
        hint="Parkings municipales"
        icon={ParkingCircle}
        accent={
          kpis.parkingsOccupancy !== null && kpis.parkingsOccupancy > 85
            ? "tl-amber"
            : "tl"
        }
      />
    </div>
  );
}

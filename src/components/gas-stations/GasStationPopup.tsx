"use client";

import { Fuel, Clock, MapPin, ExternalLink, Navigation } from "lucide-react";
import type { GasStationData } from "./GasStationCard";

interface GasStationPopupProps {
  station: GasStationData;
}

export function GasStationPopup({ station }: GasStationPopupProps) {
  const googleMapsUrl = `https://www.google.com/maps?q=${station.latitude},${station.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  return (
    <div className="min-w-[240px] max-w-[300px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
          <Fuel className="w-3 h-3 text-orange-600 dark:text-orange-400" />
        </div>
        <span className="font-bold text-gray-900 dark:text-gray-100 flex-1 text-sm">{station.name}</span>
        {station.is24h && (
          <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            24h
          </span>
        )}
      </div>

      {/* Prices grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {station.priceGasoleoA != null && (
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded p-2 text-center">
            <div className="text-xs text-tl-amber-700 dark:text-tl-amber-300 font-medium">Gasóleo A</div>
            <div className="text-base font-bold text-tl-amber-900">
              {station.priceGasoleoA.toFixed(3)}€
            </div>
          </div>
        )}
        {station.priceGasolina95E5 != null && (
          <div className="bg-tl-50 dark:bg-tl-900/20 rounded p-2 text-center">
            <div className="text-xs text-tl-700 dark:text-tl-300 font-medium">Gasolina 95</div>
            <div className="text-base font-bold text-tl-900">
              {station.priceGasolina95E5.toFixed(3)}€
            </div>
          </div>
        )}
        {station.priceGasolina98E5 != null && (
          <div className="bg-purple-50 rounded p-2 text-center">
            <div className="text-xs text-purple-700 dark:text-purple-400 font-medium">Gasolina 98</div>
            <div className="text-base font-bold text-purple-900">
              {station.priceGasolina98E5.toFixed(3)}€
            </div>
          </div>
        )}
        {station.priceGLP != null && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
            <div className="text-xs text-green-700 dark:text-green-400 font-medium">GLP</div>
            <div className="text-base font-bold text-green-900">
              {station.priceGLP.toFixed(3)}€
            </div>
          </div>
        )}
      </div>

      {/* Address */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        {station.address && <p>{station.address}</p>}
        <p className="text-gray-500 dark:text-gray-400">
          {station.locality || station.municipality}
          {station.provinceName && `, ${station.provinceName}`}
        </p>
      </div>

      {/* Schedule */}
      {station.schedule && !station.is24h && (
        <p className="text-xs text-gray-400 mb-2">{station.schedule}</p>
      )}

      {/* Coordinates */}
      <div className="text-xs text-gray-400 mb-3 font-mono">
        {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <a
          href={`/gasolineras/terrestres/${station.id}`}
          className="flex-1 text-center text-xs bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 px-2 py-1.5 rounded transition-colors"
        >
          Ver detalles
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 flex-1 text-center text-xs bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 hover:bg-tl-200 px-2 py-1.5 rounded transition-colors"
        >
          <Navigation className="w-3 h-3" />
          Cómo llegar
        </a>
      </div>
    </div>
  );
}

/**
 * Returns HTML string for MapLibre popup
 */
export function getGasStationPopupHTML(station: GasStationData): string {
  const googleMapsUrl = `https://www.google.com/maps?q=${station.latitude},${station.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  const priceRows = [];

  if (station.priceGasoleoA != null) {
    priceRows.push(`
      <div style="background:#fffbeb;border-radius:4px;padding:6px;text-align:center;">
        <div style="font-size:10px;color:#b45309;font-weight:500;">Gasóleo A</div>
        <div style="font-size:14px;font-weight:700;color:#78350f;">${station.priceGasoleoA.toFixed(3)}€</div>
      </div>
    `);
  }

  if (station.priceGasolina95E5 != null) {
    priceRows.push(`
      <div style="background:#eff6ff;border-radius:4px;padding:6px;text-align:center;">
        <div style="font-size:10px;color:#1d4ed8;font-weight:500;">Gasolina 95</div>
        <div style="font-size:14px;font-weight:700;color:#1e3a8a;">${station.priceGasolina95E5.toFixed(3)}€</div>
      </div>
    `);
  }

  if (station.priceGasolina98E5 != null) {
    priceRows.push(`
      <div style="background:#faf5ff;border-radius:4px;padding:6px;text-align:center;">
        <div style="font-size:10px;color:#7c3aed;font-weight:500;">Gasolina 98</div>
        <div style="font-size:14px;font-weight:700;color:#581c87;">${station.priceGasolina98E5.toFixed(3)}€</div>
      </div>
    `);
  }

  if (station.priceGLP != null) {
    priceRows.push(`
      <div style="background:#f0fdf4;border-radius:4px;padding:6px;text-align:center;">
        <div style="font-size:10px;color:#15803d;font-weight:500;">GLP</div>
        <div style="font-size:14px;font-weight:700;color:#14532d;">${station.priceGLP.toFixed(3)}€</div>
      </div>
    `);
  }

  return `
    <div style="min-width:220px;max-width:280px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;">
        <div style="width:24px;height:24px;border-radius:50%;background:#ffedd5;display:flex;align-items:center;justify-content:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2">
            <path d="M3 22V12h18v10M3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4M7 22v-4M17 22v-4M9 8V5M15 8V5"/>
          </svg>
        </div>
        <span style="font-weight:700;color:#111827;font-size:13px;flex:1;">${station.name}</span>
        ${station.is24h ? '<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:10px;">24h</span>' : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
        ${priceRows.join('')}
      </div>

      <div style="font-size:11px;color:#4b5563;margin-bottom:6px;">
        ${station.address ? `<p style="margin:0 0 2px 0;">${station.address}</p>` : ''}
        <p style="margin:0;color:#9ca3af;">
          ${station.locality || station.municipality || ''}${station.provinceName ? `, ${station.provinceName}` : ''}
        </p>
      </div>

      ${station.schedule && !station.is24h ? `<p style="font-size:10px;color:#9ca3af;margin:0 0 8px 0;">${station.schedule}</p>` : ''}

      <div style="font-size:10px;color:#9ca3af;margin-bottom:10px;font-family:monospace;">
        ${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)}
      </div>

      <div style="display:flex;gap:8px;padding-top:8px;border-top:1px solid #f3f4f6;">
        <a href="/gasolineras/terrestres/${station.id}" style="flex:1;text-align:center;font-size:11px;background:#f3f4f6;color:#374151;padding:6px;border-radius:4px;text-decoration:none;">
          Ver detalles
        </a>
        <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;font-size:11px;background:#dbeafe;color:#1d4ed8;padding:6px;border-radius:4px;text-decoration:none;">
          Cómo llegar
        </a>
      </div>
    </div>
  `;
}

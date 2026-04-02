"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadarProximityOptions {
  enabled: boolean;
  voiceEnabled?: boolean;
  alertDistances?: number[]; // metres — default [2000, 1000, 500]
  maxRadarDistance?: number; // metres — max detection range, default 5000
  headingSamples?: number;   // positions to average heading, default 3
}

export interface NearbyRadar {
  id: string;
  type: string;
  speedLimit: number | null;
  road: string;
  kmPoint: number;
  distance: number;          // metres from user
  bearing: number;           // degrees from user heading (0 = directly ahead)
  isAhead: boolean;          // within ±60° of heading
  avgSpeedPartner: string | null;
}

export interface RadarProximityState {
  userPosition: { lat: number; lng: number } | null;
  userSpeed: number | null;    // m/s from GPS
  userHeading: number | null;  // degrees, 0 = north
  nearbyRadars: NearbyRadar[]; // sorted by distance, filtered to isAhead
  closestRadar: NearbyRadar | null;
  isTracking: boolean;
  error: string | null;
}

// ─── Raw radar shape from /api/radars ─────────────────────────────────────────

interface RadarData {
  id: string;
  radarId?: string;
  lat: number;
  lng: number;
  road: string;
  kmPoint: number;
  direction?: string;
  province?: string;
  provinceName?: string;
  type: string;
  speedLimit?: number | null;
  avgSpeedPartner?: string | null;
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance in metres between two WGS-84 points. */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Initial bearing (degrees, 0 = north, clockwise) from point A to point B.
 */
function initialBearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const φ1 = lat1 * DEG_TO_RAD;
  const φ2 = lat2 * DEG_TO_RAD;
  const Δλ = (lng2 - lng1) * DEG_TO_RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

/** Signed angular difference (−180..180) from `from` to `to` (degrees). */
function angleDiff(from: number, to: number): number {
  let diff = ((to - from) + 360) % 360;
  if (diff > 180) diff -= 360;
  return diff;
}

// ─── Voice helpers ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  FIXED: "fijo",
  SECTION: "de tramo",
  MOBILE_ZONE: "de zona móvil",
  TRAFFIC_LIGHT: "semafórico",
};

function buildAlertText(radar: NearbyRadar, distanceM: number): string {
  const distKm = Math.round(distanceM / 100) / 10; // 1 decimal

  if (radar.type === "SECTION") {
    const limit = radar.speedLimit ? `, límite ${radar.speedLimit} kilómetros por hora` : "";
    if (distanceM >= 1500) return `Inicio de tramo controlado${limit}`;
    if (distanceM >= 750) return `Tramo controlado, a un kilómetro${limit}`;
    return "Atención, fin de tramo controlado próximo";
  }

  const typeLabel = TYPE_LABELS[radar.type] || "de tipo desconocido";
  const limit = radar.speedLimit ? `, límite ${radar.speedLimit} kilómetros por hora` : "";

  if (distanceM >= 1500) {
    const kmLabel = distKm === 2 ? "dos kilómetros" : `${distKm} kilómetros`;
    return `Radar ${typeLabel} a ${kmLabel}${limit}`;
  }
  if (distanceM >= 750) return `Radar a un kilómetro${limit}`;
  return "Atención, radar a quinientos metros";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_ALERT_DISTANCES = [2000, 1000, 500];
const DEFAULT_MAX_RADAR_DISTANCE = 5000;
const DEFAULT_HEADING_SAMPLES = 3;
const AHEAD_CONE_DEG = 60; // ±60° from heading = "ahead"

export function useRadarProximity({
  enabled,
  voiceEnabled = true,
  alertDistances = DEFAULT_ALERT_DISTANCES,
  maxRadarDistance = DEFAULT_MAX_RADAR_DISTANCE,
  headingSamples = DEFAULT_HEADING_SAMPLES,
}: RadarProximityOptions): RadarProximityState {
  const [state, setState] = useState<RadarProximityState>({
    userPosition: null,
    userSpeed: null,
    userHeading: null,
    nearbyRadars: [],
    closestRadar: null,
    isTracking: false,
    error: null,
  });

  // Cached radar list — fetched once
  const radarsRef = useRef<RadarData[]>([]);
  const radarsLoadedRef = useRef(false);

  // Position history for heading computation
  const posHistoryRef = useRef<Array<{ lat: number; lng: number; t: number }>>([]);

  // Track which (radarId + threshold) combinations have already been voiced
  // Key format: `${radarId}:${thresholdMetres}`
  const alertedRef = useRef<Set<string>>(new Set());

  // Speech synthesis wrapper (mirrors useVoiceAlerts pattern)
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.92;
      utterance.volume = 1;

      // Prefer a Spanish voice when available
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith("es"));
      if (spanishVoice) utterance.voice = spanishVoice;

      utterance.onend = () => {
        speakingRef.current = false;
        const next = queueRef.current.shift();
        if (next) {
          speakingRef.current = true;
          speak(next);
        }
      };

      if (speakingRef.current) {
        queueRef.current.push(text);
      } else {
        speakingRef.current = true;
        window.speechSynthesis.speak(utterance);
      }
    },
    [],
  );

  // ── Fetch radars once ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || radarsLoadedRef.current) return;

    radarsLoadedRef.current = true;
    fetch("/api/radars")
      .then((r) => r.json())
      .then((data: { radars?: RadarData[] }) => {
        if (Array.isArray(data.radars)) {
          radarsRef.current = data.radars;
        }
      })
      .catch(() => {
        // Non-fatal: we just won't have radar data
        radarsLoadedRef.current = false;
      });
  }, [enabled]);

  // ── Process a new GPS position ─────────────────────────────────────────────

  const processPosition = useCallback(
    (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, speed, heading } = position.coords;

      // Maintain position history for computed heading
      const now = position.timestamp;
      posHistoryRef.current.push({ lat, lng, t: now });
      if (posHistoryRef.current.length > headingSamples) {
        posHistoryRef.current.shift();
      }

      // Resolve heading: prefer GPS native, fall back to computed
      let resolvedHeading: number | null = null;
      if (heading !== null && !isNaN(heading)) {
        resolvedHeading = heading;
      } else if (posHistoryRef.current.length >= 2) {
        const first = posHistoryRef.current[0];
        const last = posHistoryRef.current[posHistoryRef.current.length - 1];
        const dlat = last.lat - first.lat;
        const dlng = last.lng - first.lng;
        if (Math.abs(dlat) > 1e-7 || Math.abs(dlng) > 1e-7) {
          // atan2(dlng, dlat) gives compass bearing (north = 0)
          resolvedHeading = ((Math.atan2(dlng, dlat) * RAD_TO_DEG) + 360) % 360;
        }
      }

      // Filter and enrich radars
      const radars = radarsRef.current;
      const nearby: NearbyRadar[] = [];

      for (const radar of radars) {
        const distance = haversineDistance(lat, lng, radar.lat, radar.lng);
        if (distance > maxRadarDistance) continue;

        const bearingToRadar = initialBearing(lat, lng, radar.lat, radar.lng);

        let relBearing = 0;
        let isAhead = true; // when no heading, treat everything as potentially ahead

        if (resolvedHeading !== null) {
          relBearing = angleDiff(resolvedHeading, bearingToRadar);
          isAhead = Math.abs(relBearing) <= AHEAD_CONE_DEG;
        }

        nearby.push({
          id: radar.id,
          type: radar.type,
          speedLimit: radar.speedLimit ?? null,
          road: radar.road,
          kmPoint: radar.kmPoint,
          distance,
          bearing: relBearing,
          isAhead,
          avgSpeedPartner: radar.avgSpeedPartner ?? null,
        });
      }

      // Sort by distance, keep only those ahead
      const ahead = nearby
        .filter((r) => r.isAhead)
        .sort((a, b) => a.distance - b.distance);

      const closestRadar = ahead[0] ?? null;

      // ── Voice alerts ──────────────────────────────────────────────────────

      if (voiceEnabled) {
        const sortedThresholds = [...alertDistances].sort((a, b) => b - a); // desc

        for (const radar of ahead) {
          for (const threshold of sortedThresholds) {
            if (radar.distance <= threshold) {
              const key = `${radar.id}:${threshold}`;
              if (!alertedRef.current.has(key)) {
                alertedRef.current.add(key);
                speak(buildAlertText(radar, threshold));
              }
            }
          }
        }

        // Clean up alerted keys for radars no longer nearby (passed them)
        const aheadIds = new Set(ahead.map((r) => r.id));
        for (const key of alertedRef.current) {
          const radarId = key.split(":")[0];
          if (!aheadIds.has(radarId)) {
            // Only remove the smallest threshold key so re-approach works correctly
            // Actually remove all keys for radars no longer in range at all
            const stillInRange = nearby.some((r) => r.id === radarId);
            if (!stillInRange) {
              alertedRef.current.delete(key);
            }
          }
        }
      }

      setState({
        userPosition: { lat, lng },
        userSpeed: speed,
        userHeading: resolvedHeading,
        nearbyRadars: ahead,
        closestRadar,
        isTracking: true,
        error: null,
      });
    },
    [alertDistances, headingSamples, maxRadarDistance, voiceEnabled, speak],
  );

  // ── GPS watcher ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({
        ...prev,
        isTracking: false,
        nearbyRadars: [],
        closestRadar: null,
      }));
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocalización no disponible en este dispositivo",
        isTracking: false,
      }));
      return;
    }

    // Reset alerted set when enabling fresh
    alertedRef.current.clear();
    posHistoryRef.current = [];

    const watchId = navigator.geolocation.watchPosition(
      processPosition,
      (err) => {
        const messages: Record<number, string> = {
          1: "Permiso de ubicación denegado",
          2: "Posición no disponible",
          3: "Tiempo de espera agotado al obtener la posición",
        };
        setState((prev) => ({
          ...prev,
          error: messages[err.code] ?? "Error al obtener la posición GPS",
          isTracking: false,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, processPosition]);

  return state;
}

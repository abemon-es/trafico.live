"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Incident {
  id: string;
  road?: string;
  km?: number;
  effect: string;
  description?: string;
}

interface RouteAlertOptions {
  incidents: Incident[];
  pollingInterval?: number;
}

/**
 * Watches specific roads and sends browser notifications when new incidents appear.
 * Uses the Notification API (no service worker needed).
 */
export function useRouteAlerts({ incidents, pollingInterval = 60000 }: RouteAlertOptions) {
  const [watchedRoads, setWatchedRoads] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("trafico-watched-roads") || "[]");
    } catch {
      return [];
    }
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const previousIncidentIdsRef = useRef<Set<string>>(new Set());

  // Persist watched roads
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("trafico-watched-roads", JSON.stringify(watchedRoads));
    }
  }, [watchedRoads]);

  // Check notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const watchRoad = useCallback(
    async (road: string) => {
      if (watchedRoads.includes(road)) return;

      // Request permission on first watch
      if (permission === "default") {
        const result = await requestPermission();
        if (result !== "granted") return;
      }

      setWatchedRoads((prev) => [...prev, road]);
    },
    [watchedRoads, permission, requestPermission]
  );

  const unwatchRoad = useCallback((road: string) => {
    setWatchedRoads((prev) => prev.filter((r) => r !== road));
  }, []);

  const isWatching = useCallback(
    (road: string) => watchedRoads.includes(road),
    [watchedRoads]
  );

  // Check for new incidents on watched roads
  useEffect(() => {
    if (permission !== "granted" || watchedRoads.length === 0 || !incidents.length) return;

    const currentIds = new Set(incidents.map((i) => i.id));
    const previousIds = previousIncidentIdsRef.current;

    // Skip first load
    if (previousIds.size === 0) {
      previousIncidentIdsRef.current = currentIds;
      return;
    }

    // Find new incidents on watched roads
    const newOnWatched = incidents.filter(
      (i) => i.road && watchedRoads.includes(i.road) && !previousIds.has(i.id)
    );

    for (const inc of newOnWatched.slice(0, 5)) {
      const EFFECT_LABELS: Record<string, string> = {
        ROAD_CLOSED: "Carretera cortada",
        SLOW_TRAFFIC: "Tráfico lento",
        RESTRICTED: "Restricción",
        DIVERSION: "Desvío",
        OTHER_EFFECT: "Incidencia",
      };
      const effect = EFFECT_LABELS[inc.effect] || "Incidencia";
      const body = `${effect} en ${inc.road}${inc.km ? ` km ${inc.km}` : ""}`;

      new Notification("trafico.live — Alerta de ruta", {
        body,
        icon: "/favicon.ico",
        tag: inc.id, // prevents duplicates
        silent: false,
      });
    }

    previousIncidentIdsRef.current = currentIds;
  }, [incidents, watchedRoads, permission]);

  return {
    watchedRoads,
    watchRoad,
    unwatchRoad,
    isWatching,
    permission,
    requestPermission,
    hasSupport: typeof window !== "undefined" && "Notification" in window,
  };
}

"use client";

import { useEffect, useRef, useCallback } from "react";

interface VoiceAlertOptions {
  enabled: boolean;
  lang?: string;
  rate?: number;
  volume?: number;
}

interface Incident {
  id: string;
  road?: string;
  km?: number;
  effect: string;
  description?: string;
}

const EFFECT_LABELS: Record<string, string> = {
  ROAD_CLOSED: "carretera cortada",
  SLOW_TRAFFIC: "tráfico lento",
  RESTRICTED: "restricción de tráfico",
  DIVERSION: "desvío",
  OTHER_EFFECT: "incidencia",
};

/**
 * Announces new traffic incidents using the Web Speech API.
 * Only announces incidents that appear for the first time (not on refresh).
 */
export function useVoiceAlerts(
  incidents: Incident[],
  { enabled, lang = "es-ES", rate = 0.9, volume = 0.8 }: VoiceAlertOptions
) {
  const previousIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.volume = volume;

      // Try to use a Spanish voice
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith("es"));
      if (spanishVoice) utterance.voice = spanishVoice;

      utterance.onend = () => {
        speakingRef.current = false;
        // Process next in queue
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
    [lang, rate, volume]
  );

  useEffect(() => {
    if (!enabled || !incidents.length) return;

    const currentIds = new Set(incidents.map((i) => i.id));
    const previousIds = previousIdsRef.current;

    // Find new incidents (not seen before)
    const newIncidents = incidents.filter((i) => !previousIds.has(i.id));

    // On first load, just record IDs without announcing
    if (previousIds.size === 0) {
      previousIdsRef.current = currentIds;
      return;
    }

    // Announce new incidents
    for (const inc of newIncidents.slice(0, 3)) {
      const effect = EFFECT_LABELS[inc.effect] || "incidencia";
      const road = inc.road ? `en la ${inc.road}` : "";
      const km = inc.km ? `kilómetro ${inc.km}` : "";
      const text = `Atención: ${effect} ${road} ${km}`.trim();
      speak(text);
    }

    // Update tracked IDs
    previousIdsRef.current = currentIds;
  }, [enabled, incidents, speak]);

  const announceManual = useCallback(
    (text: string) => {
      if (enabled) speak(text);
    },
    [enabled, speak]
  );

  return { announce: announceManual };
}

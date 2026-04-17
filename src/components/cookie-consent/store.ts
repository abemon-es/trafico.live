"use client";

import {
  CONSENT_EVENT,
  CONSENT_KEY,
  CONSENT_VERSION,
  type ConsentInput,
  type ConsentListener,
  type ConsentState,
} from "./types";

const listeners = new Set<ConsentListener>();

function safeParse(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      affiliates: Boolean(parsed.affiliates),
      version: parsed.version,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  return safeParse(localStorage.getItem(CONSENT_KEY));
}

export function writeConsent(input: ConsentInput): ConsentState {
  const current = readConsent();
  const next: ConsentState = {
    necessary: true,
    analytics: input.analytics ?? current?.analytics ?? false,
    affiliates: input.affiliates ?? current?.affiliates ?? false,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: next }));
  }
  listeners.forEach((l) => l(next));
  return next;
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONSENT_KEY);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

export function subscribe(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

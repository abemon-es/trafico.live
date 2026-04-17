"use client";

import { useEffect, useState } from "react";
import { readConsent, writeConsent, subscribe } from "./store";
import {
  CONSENT_EVENT,
  type ConsentCategory,
  type ConsentInput,
  type ConsentState,
} from "./types";

export function getConsent(): ConsentState | null {
  return readConsent();
}

export function setConsent(input: ConsentInput): ConsentState {
  return writeConsent(input);
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const c = readConsent();
  if (!c) return false;
  return Boolean(c[category]);
}

export function onConsentChange(listener: (state: ConsentState) => void): () => void {
  return subscribe(listener);
}

export function useConsent(): ConsentState | null {
  const [state, setState] = useState<ConsentState | null>(null);

  useEffect(() => {
    setState(readConsent());
    const unsub = subscribe(setState);
    const onStorage = () => setState(readConsent());
    window.addEventListener(CONSENT_EVENT, onStorage as EventListener);
    return () => {
      unsub();
      window.removeEventListener(CONSENT_EVENT, onStorage as EventListener);
    };
  }, []);

  return state;
}

export function useHasConsent(category: ConsentCategory): boolean {
  const state = useConsent();
  if (category === "necessary") return true;
  return Boolean(state?.[category]);
}

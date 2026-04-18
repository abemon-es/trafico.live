"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FocusTrap } from "@/components/a11y/FocusTrap";
import { readConsent, writeConsent, clearConsent } from "./store";
import type { ConsentState } from "./types";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function applyGtagConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  window.gtag?.("consent", "update", {
    analytics_storage: state.analytics ? "granted" : "denied",
  });
}

function removeAnalyticsCookies() {
  if (typeof document === "undefined") return;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const name = cookie.split("=")[0].trim();
    if (name.startsWith("_ga") || name.startsWith("_gid")) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.trafico.live`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [affiliates, setAffiliates] = useState(true);

  useEffect(() => {
    const current = readConsent();
    if (!current) {
      setVisible(true);
    } else {
      applyGtagConsent(current);
    }
  }, []);

  const commit = useCallback(
    (state: ConsentState) => {
      applyGtagConsent(state);
      if (!state.analytics) removeAnalyticsCookies();
      setVisible(false);
      setShowSettings(false);
    },
    []
  );

  const handleAcceptAll = useCallback(() => {
    const next = writeConsent({ analytics: true, affiliates: true });
    commit(next);
  }, [commit]);

  const handleRejectAll = useCallback(() => {
    const next = writeConsent({ analytics: false, affiliates: false });
    commit(next);
  }, [commit]);

  const handleSaveCustom = useCallback(() => {
    const next = writeConsent({ analytics, affiliates });
    commit(next);
  }, [analytics, affiliates, commit]);

  if (!visible) return null;

  return (
    <FocusTrap
      active={visible}
      onEscape={handleRejectAll}
      role="dialog"
      ariaModal
      ariaLabel="Consentimiento de cookies"
      initialFocus="container"
      className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-5 animate-in slide-in-from-bottom duration-300"
    >
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-5 shadow-2xl md:p-6 dark:border-gray-800 dark:bg-gray-900">
        {!showSettings ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <p
                id="cookie-consent-title"
                className="mb-1 font-heading text-sm font-semibold text-gray-900 dark:text-white"
              >
                Tu privacidad importa
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Usamos cookies técnicas necesarias, analíticas (Google Analytics)
                para mejorar el servicio y cookies de socios comerciales cuando
                muestras ofertas de combustible o transporte. Lee más en{" "}
                <Link
                  href="/politica-cookies"
                  className="text-tl-600 underline hover:text-tl-700 dark:text-tl-400"
                >
                  política de cookies
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 min-h-[44px]"
              >
                Configurar
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 min-h-[44px]"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="rounded-lg bg-tl-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-tl-700 min-h-[44px]"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p
                id="cookie-consent-title"
                className="mb-1 font-heading text-base font-semibold text-gray-900 dark:text-white"
              >
                Configuración de cookies
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Elige qué categorías quieres permitir. Puedes cambiar esta
                elección en cualquier momento desde el enlace del pie.
              </p>
            </div>

            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              <li className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Necesarias
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Requeridas para el funcionamiento del sitio (sesión, idioma,
                    preferencia de mapa). No se pueden desactivar.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Siempre activas
                </span>
              </li>

              <li className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Analíticas
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Google Analytics 4 para entender qué páginas funcionan y
                    mejorar el producto. IP anonimizada.
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="peer sr-only"
                    aria-label="Cookies analíticas"
                  />
                  <span className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-tl-600 peer-checked:after:translate-x-full dark:bg-gray-700" />
                </label>
              </li>

              <li className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Socios comerciales
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Seguimiento de clicks en ofertas de combustible, cargadores y
                    transporte para acreditar tu visita a nuestros socios. No
                    compartimos datos personales.
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={affiliates}
                    onChange={(e) => setAffiliates(e.target.checked)}
                    className="peer sr-only"
                    aria-label="Cookies de socios comerciales"
                  />
                  <span className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-tl-600 peer-checked:after:translate-x-full dark:bg-gray-700" />
                </label>
              </li>
            </ul>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white min-h-[44px]"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 min-h-[44px]"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="rounded-lg bg-tl-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-tl-700 min-h-[44px]"
              >
                Guardar selección
              </button>
            </div>
          </div>
        )}
      </div>
    </FocusTrap>
  );
}

export function CookieSettingsButton() {
  const handleClick = useCallback(() => {
    clearConsent();
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      Gestionar cookies
    </button>
  );
}

export {
  getConsent,
  setConsent,
  hasConsent,
  onConsentChange,
  useConsent,
  useHasConsent,
} from "./api";
export type { ConsentCategory, ConsentState } from "./types";

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const CONSENT_KEY = "trafico_cookie_consent";
const CONSENT_VERSION = "1";

type ConsentState = {
  analytics: boolean;
  version: string;
  timestamp: string;
};

function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setConsent(analytics: boolean) {
  const state: ConsentState = {
    analytics,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

/** Signal consent granted and load GA4 script */
function grantAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!gaId) return;

  window.gtag?.("consent", "update", { analytics_storage: "granted" });

  if (document.querySelector(`script[src*="googletagmanager"]`)) return;

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    window.gtag?.("js", new Date());
    window.gtag?.("config", gaId, {
      anonymize_ip: true,
    });
  };
}

/** Signal consent denied */
function denyAnalytics() {
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
}

/** Remove GA4 cookies when consent is revoked */
function removeGA4Cookies() {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const name = cookie.split("=")[0].trim();
    if (name.startsWith("_ga") || name.startsWith("_gid")) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.trafico.live`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    } else if (consent.analytics) {
      grantAnalytics();
    }
  }, []);

  const handleAccept = useCallback(() => {
    setConsent(true);
    grantAnalytics();
    setVisible(false);
  }, []);

  const handleReject = useCallback(() => {
    setConsent(false);
    denyAnalytics();
    removeGA4Cookies();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
              Utilizamos cookies
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Usamos cookies analíticas (Google Analytics) para entender cómo se
              usa trafico.live y mejorar el servicio. No usamos cookies
              publicitarias. Puedes leer más en nuestra{" "}
              <Link
                href="/politica-cookies"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                política de cookies
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Rechazar
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-tl-600 hover:bg-tl-700 rounded-lg transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Re-open the cookie consent banner (for "Gestionar cookies" link) */
export function CookieSettingsButton() {
  const handleClick = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    window.location.reload();
  }, []);

  return (
    <button
      onClick={handleClick}
      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 text-sm underline"
    >
      Gestionar cookies
    </button>
  );
}

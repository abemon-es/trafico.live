"use client";

import { useEffect, useRef, useState } from "react";

// Key stored in localStorage to track visit count
const VISIT_COUNT_KEY = "tl_pwa_visit_count";
// Key to remember permanent dismissal
const DISMISSED_KEY = "tl_pwa_dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Do nothing in SSR or if already installed (navigator.standalone for Safari)
    if (typeof window === "undefined") return;

    // Already dismissed permanently
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    // Increment visit counter
    const raw = localStorage.getItem(VISIT_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(count));

    // Only show from 2nd visit onward
    if (count < 2) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // On iOS Safari, `beforeinstallprompt` never fires — detect via standalone check
    const isIosSafari =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone) &&
      !(navigator as Navigator & { standalone?: boolean }).standalone;

    if (isIosSafari) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (outcome === "accepted") {
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, "1");
      }
    }
    // iOS — no prompt API; user dismissed the informational banner
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Instalar aplicación"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-start gap-3 rounded-xl border border-tl-700/40 bg-tl-950/95 p-4 shadow-2xl backdrop-blur-sm sm:left-auto sm:right-6 sm:max-w-sm"
    >
      {/* App icon */}
      <img
        src="/icon-192.png"
        alt="trafico.live"
        width={40}
        height={40}
        className="mt-0.5 shrink-0 rounded-lg"
      />

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-white">
          Instala trafico.live
        </p>
        <p className="mt-0.5 text-xs leading-snug text-tl-400">
          Accede al mapa de tráfico en tiempo real sin abrir el navegador.
        </p>

        {/* Actions */}
        <div className="mt-2.5 flex gap-2">
          {deferredPrompt.current ? (
            <button
              onClick={handleInstall}
              className="rounded-md bg-tl-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-tl-500 active:scale-95"
            >
              Instalar
            </button>
          ) : (
            // iOS guidance — no prompt API available
            <span className="rounded-md bg-tl-600/20 px-3 py-1.5 text-xs text-tl-300">
              Pulsa <strong>Compartir → Añadir a inicio</strong>
            </span>
          )}
          <button
            onClick={handleDismiss}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-tl-400 transition-colors hover:text-tl-200"
          >
            Ahora no
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="shrink-0 text-tl-500 transition-colors hover:text-tl-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

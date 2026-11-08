"use client";

/**
 * Cloudflare Turnstile widget for the public forms. Renders into the element
 * given to the returned callback ref when a site key is set, and again
 * whenever that element is replaced (e.g. the form shown again after a
 * success view). Without a site key `ready` is always true (the server only
 * verifies when TURNSTILE_SECRET_KEY is set).
 */

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
}

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";

export function useTurnstile(siteKey: string | null) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainer(node), []);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey || !container) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (t: string) => setToken(t),
          "error-callback": () => setToken(""),
          "expired-callback": () => setToken(""),
          theme: "auto",
          language: "es",
        });
      } catch (e) {
        console.error("[turnstile] render failed", e);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const previous = window.onloadTurnstileCallback;
      window.onloadTurnstileCallback = () => {
        previous?.();
        renderWidget();
      };
      if (!document.querySelector(`script[src="${TURNSTILE_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = TURNSTILE_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, container]);

  const reset = useCallback(() => {
    setToken("");
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }, []);

  return { containerRef, token, ready: !siteKey || Boolean(token), reset };
}

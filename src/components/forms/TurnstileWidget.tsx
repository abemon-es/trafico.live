"use client";

/**
 * Cloudflare Turnstile widget for the public forms. It owns its container ref
 * (touched only inside effects), so the forms hold just the token in state:
 *
 *   {siteKey ? <TurnstileWidget key={nonce} siteKey={siteKey} onToken={setToken} /> : null}
 *
 * A Turnstile token is single-use: to get a fresh one, change `key` (the
 * widget remounts). `onToken("")` on error/expiry. The server only verifies
 * when TURNSTILE_SECRET_KEY is set (src/lib/form-guards.ts).
 */

import { useEffect, useRef } from "react";

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

interface TurnstileWidgetProps {
  siteKey: string;
  /** Stable callback (a state setter): receives the token, or "" on error/expiry. */
  onToken: (token: string) => void;
}

export default function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let widgetId: string | null = null;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || widgetId) return;
      try {
        widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (t: string) => onToken(t),
          "error-callback": () => onToken(""),
          "expired-callback": () => onToken(""),
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
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey, onToken]);

  return <div ref={containerRef} className="cf-turnstile" />;
}

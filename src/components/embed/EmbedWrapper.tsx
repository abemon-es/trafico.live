"use client";

import { useEffect, useRef } from "react";

export interface EmbedWrapperProps {
  /** URL rendered inside the embed. Must be same-origin or explicitly allow-listed. */
  src: string;
  /** Accessible title for the iframe. */
  title: string;
  /** Height in px or CSS value (defaults to 420). */
  height?: number | string;
  /** Optional canonical fallback shown if iframes are disabled or JS fails. */
  fallbackHref?: string;
  /** Fallback link text. */
  fallbackLabel?: string;
  className?: string;
}

// Scaffold — iframe-safe wrapper for third-party embeds of our widgets.
// Sends postMessage("ready") so parents can stop skeletons, and resizes up to
// the content height when served same-origin (common case for trafico.live embeds).
export function EmbedWrapper({
  src,
  title,
  height = 420,
  fallbackHref,
  fallbackLabel = "Abrir en trafico.live",
  className = "",
}: EmbedWrapperProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; height?: number } | null;
      if (data?.type === "trafico:resize" && typeof data.height === "number" && iframeRef.current) {
        iframeRef.current.style.height = `${data.height}px`;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className={`overflow-hidden rounded-xl border border-tl-100 dark:border-slate-800 ${className}`}>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          height: typeof height === "number" ? `${height}px` : height,
          border: "0",
        }}
      />
      {fallbackHref && (
        <noscript>
          <div className="p-3 text-center text-sm">
            <a href={fallbackHref} rel="noopener noreferrer">
              {fallbackLabel}
            </a>
          </div>
        </noscript>
      )}
    </div>
  );
}

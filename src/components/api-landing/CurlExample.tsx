"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export interface CurlExampleProps {
  title: string;
  command: string;
  /** Optional description shown above the code block */
  description?: string;
}

export function CurlExample({ title, command, description }: CurlExampleProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = command;
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-2xl border border-tl-200 dark:border-tl-800 overflow-hidden bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-tl-50 dark:bg-tl-900/60 border-b border-tl-100 dark:border-tl-800">
        <span className="text-xs font-semibold text-tl-600 dark:text-tl-300 font-data">
          {title}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-tl-200 dark:border-tl-700 text-tl-500 dark:text-tl-400 hover:bg-[color:var(--tl-primary-bg)] hover:text-[color:var(--tl-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tl-600"
          aria-label={copied ? "Comando copiado" : "Copiar comando"}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[color:var(--tl-success)]" aria-hidden="true" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Optional description */}
      {description && (
        <div className="px-4 pt-3 pb-0">
          <p className="text-xs text-tl-500 dark:text-tl-400 leading-relaxed">{description}</p>
        </div>
      )}

      {/* Code block */}
      <div className="bg-tl-950 p-5 overflow-x-auto">
        <pre
          className="font-data text-sm text-tl-100 leading-relaxed whitespace-pre"
          aria-label={`Ejemplo de comando: ${title}`}
        >
          <code>
            {/* Simple syntax accent: highlight the URL in tl-amber */}
            {command.split("\n").map((line, i) => {
              // Highlight lines that start with curl or contain https
              if (line.trim().startsWith("curl")) {
                return (
                  <span key={i} className="text-tl-300">
                    {line}
                    {"\n"}
                  </span>
                );
              }
              if (line.includes("https://")) {
                // Split at the URL
                const urlMatch = line.match(/(.*?)(https?:\/\/[^\s"]+)(.*)/);
                if (urlMatch) {
                  return (
                    <span key={i}>
                      <span className="text-tl-300">{urlMatch[1]}</span>
                      <span className="text-tl-amber-300">{urlMatch[2]}</span>
                      <span className="text-tl-300">{urlMatch[3]}</span>
                      {"\n"}
                    </span>
                  );
                }
              }
              if (line.includes("-H") || line.includes("--header")) {
                return (
                  <span key={i} className="text-tl-400">
                    {line}
                    {"\n"}
                  </span>
                );
              }
              return (
                <span key={i} className="text-tl-200">
                  {line}
                  {"\n"}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

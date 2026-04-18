"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlock {
  label: string;
  language: string;
  code: string;
}

interface CodeSampleProps {
  blocks: CodeBlock[];
}

export function CodeSample({ blocks }: CodeSampleProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(blocks[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-tl-100 dark:border-tl-800 overflow-hidden bg-tl-950 text-sm">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 bg-tl-900/80 border-b border-tl-800">
        {blocks.map((b, i) => (
          <button
            key={b.label}
            onClick={() => setActive(i)}
            className={[
              "px-3 py-1 rounded-md text-xs font-mono transition-colors",
              i === active
                ? "bg-tl-700 text-tl-100"
                : "text-tl-400 hover:text-tl-200",
            ].join(" ")}
          >
            {b.label}
          </button>
        ))}
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1 text-xs text-tl-400 hover:text-tl-200 transition-colors"
          aria-label="Copiar código"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="p-5 overflow-x-auto leading-relaxed text-tl-200 font-mono text-xs">
        <code>{blocks[active].code}</code>
      </pre>
    </div>
  );
}

// ─── Pre-built samples ─────────────────────────────────────────────────────────

export const INGEST_SAMPLE: CodeBlock[] = [
  {
    label: "curl",
    language: "bash",
    code: `curl -X POST https://trafico.live/api/flotas/positions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: tl_fleet_YOUR_KEY" \\
  -d '{
    "positions": [
      {
        "vehicleId": "van-001",
        "lat": 40.4168,
        "lon": -3.7038,
        "speed": 58.3,
        "heading": 275,
        "timestamp": "2026-04-17T10:30:00Z"
      },
      {
        "vehicleId": "van-002",
        "lat": 41.3851,
        "lon": 2.1734,
        "speed": 0,
        "heading": 90
      }
    ]
  }'`,
  },
  {
    label: "JavaScript",
    language: "javascript",
    code: `await fetch("https://trafico.live/api/flotas/positions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "tl_fleet_YOUR_KEY",
  },
  body: JSON.stringify({
    positions: [
      {
        vehicleId: "van-001",
        lat: 40.4168,
        lon: -3.7038,
        speed: 58.3,
        heading: 275,
        timestamp: new Date().toISOString(),
      },
    ],
  }),
});`,
  },
  {
    label: "Python",
    language: "python",
    code: `import requests

resp = requests.post(
    "https://trafico.live/api/flotas/positions",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "tl_fleet_YOUR_KEY",
    },
    json={
        "positions": [
            {
                "vehicleId": "van-001",
                "lat": 40.4168,
                "lon": -3.7038,
                "speed": 58.3,
                "heading": 275,
            }
        ]
    },
)
print(resp.json())  # {"accepted": 1, "rejected": []}`,
  },
];

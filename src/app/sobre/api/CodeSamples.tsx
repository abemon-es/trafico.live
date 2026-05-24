"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

// ---------------------------------------------------------------------------
// Endpoints chosen for samples
// 1. /api/incidents        — tráfico, FREE, máxima relevancia
// 2. /api/maritimo         — buques AIS, visual
// 3. /api/trafico/intensidad — sensores Madrid, numérico
// 4. /api/trenes/alertas   — ferrocarril, PRO-adjacent but readable
// 5. /api/gas-stations     — combustible, FREE, muy consultado
// ---------------------------------------------------------------------------

type Lang = "curl" | "js" | "python";

interface Endpoint {
  id: string;
  label: string;
  path: string;
  tier: "FREE" | "PRO";
  description: string;
  samples: Record<Lang, string>;
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "incidents",
    label: "Incidencias de tráfico",
    path: "/api/incidents",
    tier: "FREE",
    description: "Incidencias activas en carreteras españolas. Fuente DGT DATEX II, actualización cada 60 s.",
    samples: {
      curl: `curl -s \\
  -H "X-API-Key: tl_free_TU_CLAVE_AQUI" \\
  "https://trafico.live/api/incidents?province=Madrid&severity=HIGH"`,
      js: `const res = await fetch(
  "https://trafico.live/api/incidents?province=Madrid&severity=HIGH",
  { headers: { "X-API-Key": "tl_free_TU_CLAVE_AQUI" } }
);
const { total, incidents } = await res.json();
console.log(\`\${total} incidencias graves en Madrid\`);
incidents.forEach(inc =>
  console.log(\`\${inc.road} km \${inc.km} — \${inc.description}\`)
);`,
      python: `import httpx

resp = httpx.get(
    "https://trafico.live/api/incidents",
    params={"province": "Madrid", "severity": "HIGH"},
    headers={"X-API-Key": "tl_free_TU_CLAVE_AQUI"},
)
data = resp.json()
print(f"{data['total']} incidencias graves en Madrid")
for inc in data["incidents"]:
    print(f"{inc['road']} km {inc['km']} — {inc['description']}")`,
    },
    response: `{
  "total": 3,
  "updated_at": "2026-05-24T08:31:00Z",
  "incidents": [
    {
      "id": "SP_INC_20260524_0041",
      "type": "ACCIDENT",
      "road": "A-4",
      "km": 28.3,
      "province": "Madrid",
      "severity": "HIGH",
      "description": "Accidente con retención sentido Córdoba",
      "delay_minutes": 22,
      "lat": 40.3456,
      "lon": -3.7632,
      "created_at": "2026-05-24T08:12:00Z"
    }
  ]
}`,
  },
  {
    id: "maritimo",
    label: "Posiciones de buques (AIS)",
    path: "/api/maritimo",
    tier: "FREE",
    description: "Posiciones AIS en tiempo real de buques en aguas españolas. GeoJSON, buffer 48 h.",
    samples: {
      curl: `curl -s \\
  -H "X-API-Key: tl_free_TU_CLAVE_AQUI" \\
  "https://trafico.live/api/maritimo?type=CARGO&limit=5"`,
      js: `const res = await fetch(
  "https://trafico.live/api/maritimo?type=CARGO&limit=5",
  { headers: { "X-API-Key": "tl_free_TU_CLAVE_AQUI" } }
);
const geojson = await res.json();
geojson.features.forEach(f =>
  console.log(f.properties.name, f.properties.speed, "kn")
);`,
      python: `import httpx

resp = httpx.get(
    "https://trafico.live/api/maritimo",
    params={"type": "CARGO", "limit": 5},
    headers={"X-API-Key": "tl_free_TU_CLAVE_AQUI"},
)
geojson = resp.json()
for feat in geojson["features"]:
    props = feat["properties"]
    print(f"{props['name']}  {props['speed']} kn")`,
    },
    response: `{
  "type": "FeatureCollection",
  "count": 5,
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-3.8021, 43.4610] },
      "properties": {
        "mmsi": 224145680,
        "name": "CABO VILLANO",
        "type": "CARGO",
        "speed": 11.4,
        "heading": 275,
        "updated_at": "2026-05-24T08:29:44Z"
      }
    }
  ]
}`,
  },
  {
    id: "intensidad",
    label: "Intensidad de tráfico (Madrid)",
    path: "/api/trafico/intensidad",
    tier: "FREE",
    description: "6.117 sensores de Madrid: veh/h, ocupación, nivel de servicio. Actualización cada 5 min.",
    samples: {
      curl: `curl -s \\
  -H "X-API-Key: tl_free_TU_CLAVE_AQUI" \\
  "https://trafico.live/api/trafico/intensidad?serviceLevel=3&limit=3"`,
      js: `const res = await fetch(
  "https://trafico.live/api/trafico/intensidad?serviceLevel=3&limit=3",
  { headers: { "X-API-Key": "tl_free_TU_CLAVE_AQUI" } }
);
const { sensors } = await res.json();
sensors.forEach(s =>
  console.log(\`\${s.id}  \${s.intensity} veh/h  nivel \${s.serviceLevel}\`)
);`,
      python: `import httpx

resp = httpx.get(
    "https://trafico.live/api/trafico/intensidad",
    params={"serviceLevel": 3, "limit": 3},
    headers={"X-API-Key": "tl_free_TU_CLAVE_AQUI"},
)
data = resp.json()
for s in data["sensors"]:
    print(f"{s['id']}  {s['intensity']} veh/h  nivel {s['serviceLevel']}")`,
    },
    response: `{
  "updated_at": "2026-05-24T08:30:00Z",
  "total": 124,
  "sensors": [
    {
      "id": "5001",
      "road": "M-30",
      "intensity": 4820,
      "occupancy": 78,
      "load": 91,
      "serviceLevel": 3,
      "lat": 40.4198,
      "lon": -3.7029,
      "updated_at": "2026-05-24T08:25:00Z"
    }
  ]
}`,
  },
  {
    id: "trenes-alertas",
    label: "Alertas ferroviarias Renfe",
    path: "/api/trenes/alertas",
    tier: "FREE",
    description: "Alertas de servicio Renfe en tiempo real: cancelaciones, retrasos >5 min. Cadencia 2 min.",
    samples: {
      curl: `curl -s \\
  -H "X-API-Key: tl_free_TU_CLAVE_AQUI" \\
  "https://trafico.live/api/trenes/alertas?brand=Cercanias"`,
      js: `const res = await fetch(
  "https://trafico.live/api/trenes/alertas?brand=Cercanias",
  { headers: { "X-API-Key": "tl_free_TU_CLAVE_AQUI" } }
);
const { total, alerts } = await res.json();
console.log(\`\${total} alertas activas en Cercanías\`);
alerts.forEach(a =>
  console.log(\`[\${a.severity}] \${a.route} — \${a.header}\`)
);`,
      python: `import httpx

resp = httpx.get(
    "https://trafico.live/api/trenes/alertas",
    params={"brand": "Cercanias"},
    headers={"X-API-Key": "tl_free_TU_CLAVE_AQUI"},
)
data = resp.json()
print(f"{data['total']} alertas activas en Cercanías")
for a in data["alerts"]:
    print(f"[{a['severity']}] {a['route']} — {a['header']}")`,
    },
    response: `{
  "total": 2,
  "updated_at": "2026-05-24T08:28:00Z",
  "alerts": [
    {
      "id": "alert_c1_240524_01",
      "brand": "Cercanias",
      "route": "C-1",
      "header": "Retrasos en C-1 por incidencia en Recoletos",
      "description": "Se esperan retrasos de hasta 15 minutos en la línea C-1.",
      "severity": "WARNING",
      "start": "2026-05-24T07:45:00Z",
      "end": null
    }
  ]
}`,
  },
  {
    id: "gasolineras",
    label: "Precios de gasolineras",
    path: "/api/gas-stations",
    tier: "FREE",
    description: "11.000+ gasolineras con precio por tipo de combustible, coordenadas y operador.",
    samples: {
      curl: `curl -s \\
  -H "X-API-Key: tl_free_TU_CLAVE_AQUI" \\
  "https://trafico.live/api/gas-stations?fuelType=GASOLINA_95&province=Madrid&limit=3&sort=price_asc"`,
      js: `const res = await fetch(
  "https://trafico.live/api/gas-stations?fuelType=GASOLINA_95&province=Madrid&limit=3&sort=price_asc",
  { headers: { "X-API-Key": "tl_free_TU_CLAVE_AQUI" } }
);
const { stations } = await res.json();
stations.forEach(s =>
  console.log(\`\${s.name} — \${s.prices.GASOLINA_95}€/L\`)
);`,
      python: `import httpx

resp = httpx.get(
    "https://trafico.live/api/gas-stations",
    params={
        "fuelType": "GASOLINA_95",
        "province": "Madrid",
        "limit": 3,
        "sort": "price_asc",
    },
    headers={"X-API-Key": "tl_free_TU_CLAVE_AQUI"},
)
data = resp.json()
for s in data["stations"]:
    print(f"{s['name']}  {s['prices']['GASOLINA_95']}€/L")`,
    },
    response: `{
  "total": 1842,
  "updated_at": "2026-05-24T07:00:00Z",
  "stations": [
    {
      "id": "5613",
      "name": "REPSOL ALCOBENDAS",
      "operator": "Repsol",
      "address": "Av. de la Industria, 14",
      "province": "Madrid",
      "lat": 40.5343,
      "lon": -3.6247,
      "prices": {
        "GASOLINA_95": 1.589,
        "GASOLINA_98": 1.699,
        "DIESEL": 1.479
      },
      "updated_at": "2026-05-24T06:55:00Z"
    }
  ]
}`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-tl-400 hover:text-tl-200 transition-colors"
      title="Copiar código"
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
  );
}

const LANG_LABELS: Record<Lang, string> = {
  curl: "cURL",
  js: "JavaScript / TypeScript",
  python: "Python",
};

const TIER_BADGE: Record<string, string> = {
  FREE: "bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200",
  PRO: "bg-[color:var(--tl-primary)] text-white",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodeSamples() {
  const [activeEndpoint, setActiveEndpoint] = useState<string>(ENDPOINTS[0].id);
  const [activeLang, setActiveLang] = useState<Lang>("curl");
  const [showResponse, setShowResponse] = useState(false);

  const endpoint = ENDPOINTS.find((e) => e.id === activeEndpoint)!;
  const code = endpoint.samples[activeLang];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-tl-200 dark:border-tl-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-tl-100 dark:border-tl-800 bg-tl-50 dark:bg-tl-900/50">
        <Terminal className="w-4 h-4 text-tl-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-tl-500 dark:text-tl-400 uppercase tracking-wide">
          Ejemplos de código
        </span>
      </div>

      {/* Endpoint selector */}
      <div className="flex flex-wrap gap-2 p-4 border-b border-tl-100 dark:border-tl-800">
        {ENDPOINTS.map((ep) => (
          <button
            key={ep.id}
            type="button"
            onClick={() => {
              setActiveEndpoint(ep.id);
              setShowResponse(false);
            }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeEndpoint === ep.id
                ? "bg-[color:var(--tl-primary)] text-white"
                : "bg-tl-100 dark:bg-tl-800 text-tl-600 dark:text-tl-300 hover:bg-tl-200 dark:hover:bg-tl-700"
            }`}
          >
            {ep.label}
          </button>
        ))}
      </div>

      {/* Endpoint meta */}
      <div className="flex items-start gap-3 px-5 py-3 border-b border-tl-100 dark:border-tl-800">
        <span className="font-mono text-xs font-bold bg-tl-100 dark:bg-tl-800 text-tl-700 dark:text-tl-200 px-2 py-1 rounded flex-shrink-0">
          GET
        </span>
        <div className="flex-1 min-w-0">
          <code className="font-mono text-sm text-gray-900 dark:text-gray-100">
            {endpoint.path}
          </code>
          <p className="text-xs text-tl-500 dark:text-tl-400 mt-0.5 leading-relaxed">
            {endpoint.description}
          </p>
        </div>
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${TIER_BADGE[endpoint.tier]}`}
        >
          {endpoint.tier}
        </span>
      </div>

      {/* Language tabs */}
      <div className="flex gap-0 border-b border-tl-100 dark:border-tl-800">
        {(["curl", "js", "python"] as Lang[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setActiveLang(lang)}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeLang === lang
                ? "border-[color:var(--tl-primary)] text-[color:var(--tl-primary)]"
                : "border-transparent text-tl-500 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-200"
            }`}
          >
            {LANG_LABELS[lang]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowResponse((v) => !v)}
          className="px-4 py-2.5 text-xs font-semibold text-tl-500 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-200 border-b-2 border-transparent transition-colors"
        >
          {showResponse ? "Ocultar respuesta" : "Ver respuesta JSON"}
        </button>
      </div>

      {/* Code area */}
      <div className="relative bg-tl-950 p-5">
        <div className="absolute top-3 right-3">
          <CopyButton text={code} />
        </div>
        <pre className="font-mono text-sm text-tl-100 leading-relaxed whitespace-pre overflow-x-auto pr-16">
          {code}
        </pre>
      </div>

      {/* Response */}
      {showResponse && (
        <div className="border-t border-tl-800">
          <div className="flex items-center justify-between px-5 py-2 bg-tl-900">
            <span className="text-xs font-semibold text-tl-400 uppercase tracking-wide">
              Respuesta de ejemplo
            </span>
            <CopyButton text={endpoint.response} />
          </div>
          <div className="bg-tl-950 p-5 overflow-x-auto">
            <pre className="font-mono text-sm text-tl-200 leading-relaxed whitespace-pre">
              {endpoint.response}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

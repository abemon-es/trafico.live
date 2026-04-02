import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Predicción de tráfico en Madrid — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1b4bd5 100%)",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Top label */}
        <div
          style={{
            display: "flex",
            fontSize: "18px",
            fontWeight: 600,
            opacity: 0.7,
            marginBottom: "24px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          trafico.live
        </div>

        {/* Main title */}
        <div
          style={{
            display: "flex",
            fontSize: "64px",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          Predicción de tráfico
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: "28px",
            fontWeight: 400,
            opacity: 0.75,
            marginBottom: "48px",
          }}
        >
          Mapa de calor · 6.100+ sensores · Madrid
        </div>

        {/* Decorative heatmap strip */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "48px" }}>
          {[
            "#16a34a",
            "#4ade80",
            "#86efac",
            "#fde68a",
            "#fbbf24",
            "#f97316",
            "#ef4444",
            "#dc2626",
            "#f97316",
            "#fbbf24",
            "#86efac",
            "#4ade80",
          ].map((color, i) => (
            <div
              key={i}
              style={{
                width: "64px",
                height: "32px",
                borderRadius: "6px",
                backgroundColor: color,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: "16px",
            opacity: 0.45,
          }}
        >
          Datos en tiempo real · Ayuntamiento de Madrid
        </div>
      </div>
    ),
    { ...size }
  );
}

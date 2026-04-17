import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vuelos en Directo — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(145deg, #000025 0%, #011577 55%, #1b4bd5 100%)",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 40%, #6393ff55 0%, #1b4bd522 60%, transparent 100%)",
            border: "1.5px solid #6393ff33",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: "20px",
            fontWeight: 600,
            color: "#94b6ff",
            letterSpacing: "0.04em",
            marginBottom: "auto",
          }}
        >
          trafico.live
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "60px",
            right: "60px",
            fontSize: "15px",
            fontWeight: 600,
            color: "#6393ff",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          VUELOS · LIVE
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.05,
              flexWrap: "wrap",
              gap: "0 14px",
            }}
          >
            <span style={{ color: "white" }}>Vuelos en</span>
            <span style={{ color: "#eca66e" }}>directo</span>
            <span style={{ color: "white" }}>sobre España</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              fontWeight: 400,
              color: "#dde8ff",
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            Tracker ADS-B · Aerolíneas · Altitud · Tipo de aeronave
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

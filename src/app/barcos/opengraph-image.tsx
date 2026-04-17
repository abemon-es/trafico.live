import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Barcos en Directo — trafico.live";
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
          background: "linear-gradient(145deg, #001025 0%, #033d77 55%, #0891b2 100%)",
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
              "radial-gradient(circle at 40% 40%, #22d3ee55 0%, #0891b222 60%, transparent 100%)",
            border: "1.5px solid #22d3ee33",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: "20px",
            fontWeight: 600,
            color: "#a5f3fc",
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
            color: "#22d3ee",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          BARCOS · LIVE AIS
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
            <span style={{ color: "white" }}>Barcos en</span>
            <span style={{ color: "#fbbf24" }}>directo</span>
            <span style={{ color: "white" }}>en costas españolas</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              fontWeight: 400,
              color: "#cffafe",
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            Tracker AIS · Pasajeros · Carga · Petroleros · Pesca
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

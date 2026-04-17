import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Red Ferroviaria Española — trafico.live";
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
          background:
            "linear-gradient(145deg, #000025 0%, #011577 55%, #1b4bd5 100%)",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circle — rail tracks hint */}
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
              "radial-gradient(circle at 40% 40%, #eca66e44 0%, #b5620011 60%, transparent 100%)",
            border: "1.5px solid #eca66e22",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "60px",
            right: "60px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 35%, #eca66e33 0%, #eca66e0a 70%, transparent 100%)",
          }}
        />

        {/* Top-left wordmark */}
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

        {/* Bottom-right vertical label */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "60px",
            right: "60px",
            fontSize: "15px",
            fontWeight: 600,
            color: "#eca66e",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          FERROVIARIO
        </div>

        {/* Bottom content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Title */}
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
            <span style={{ color: "white" }}>Red</span>
            <span style={{ color: "#eca66e" }}>Ferroviaria</span>
            <span style={{ color: "white" }}>Española</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 400,
              color: "#dde8ff",
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            Trenes en directo · 2.154 estaciones · 14 operadores · Alertas Renfe
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "trafico.live — Inteligencia multimodal del transporte en España";
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
          padding: "72px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative geometry */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 40%, #ff994430 0%, #ff99440f 60%, transparent 100%)",
            border: "1.5px solid #ff994422",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 60% 60%, #34d39926 0%, transparent 70%)",
          }}
        />

        {/* Top-left wordmark */}
        <div
          style={{
            display: "flex",
            fontSize: "22px",
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
            bottom: "72px",
            right: "72px",
            fontSize: "15px",
            fontWeight: 600,
            color: "#ff9944",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          ESPAÑA · MULTIMODAL · TIEMPO REAL
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.04,
              flexWrap: "wrap",
              gap: "0 16px",
            }}
          >
            <span style={{ color: "#ff9944" }}>Tráfico,</span>
            <span style={{ color: "white" }}>combustible,</span>
            <span style={{ color: "#eca66e" }}>trenes,</span>
            <span style={{ color: "white" }}>meteo.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              fontWeight: 400,
              color: "#dde8ff",
              opacity: 0.92,
              lineHeight: 1.35,
            }}
          >
            Toda la información del transporte español, en un único lugar.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

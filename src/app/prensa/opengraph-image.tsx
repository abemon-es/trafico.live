import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Kit de prensa trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b0f1a 0%, #011577 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "32px",
          }}
        >
          <span style={{ color: "#94b6ff", fontSize: "16px", fontWeight: 600 }}>
            trafico.live · Kit de prensa
          </span>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: "#ffffff",
              fontSize: "60px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "20px",
            }}
          >
            <span>Inteligencia de movilidad</span>
            <span>para España</span>
          </div>
          <div style={{ color: "#94b6ff", fontSize: "20px", marginBottom: "32px" }}>
            Tráfico · Trenes · Aviación · Marítimo · Combustible · Aire
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "32px" }}>
            {[
              { v: "150+", l: "páginas" },
              { v: "43", l: "colectores" },
              { v: "121", l: "endpoints" },
              { v: "27K+", l: "páginas SSG" },
            ].map((s) => (
              <div key={s.l} style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
                <div style={{ color: "#6393ff", fontSize: "28px", fontWeight: 700 }}>
                  {s.v}
                </div>
                <div style={{ color: "#6b7280", fontSize: "13px" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid rgba(148, 182, 255, 0.2)",
            paddingTop: "24px",
          }}
        >
          <span style={{ color: "#6393ff", fontSize: "18px", fontWeight: 700 }}>
            trafico.live
          </span>
          <span style={{ color: "#6b7280", fontSize: "14px" }}>
            prensa@trafico.live
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

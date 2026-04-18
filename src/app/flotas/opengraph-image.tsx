import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Flotas SaaS — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function FlotasOGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #000245 0%, #011577 40%, #092ea8 100%)",
          padding: "60px",
          gap: "28px",
          position: "relative",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(99,147,255,0.08) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(99,147,255,0.08) 40px)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 18px",
            borderRadius: "100px",
            border: "1px solid rgba(99,147,255,0.3)",
            background: "rgba(27,75,213,0.2)",
            color: "#94b6ff",
            fontSize: "18px",
            fontWeight: 600,
          }}
        >
          🚛 Flotas SaaS
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "68px",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-2px",
            }}
          >
            Tu flota, al minuto.
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "28px",
              color: "#6393ff",
              fontWeight: 600,
            }}
          >
            Tráfico · Peajes · Combustible
          </p>
        </div>

        {/* Price strip */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "12px",
          }}
        >
          {[
            { tier: "Starter", price: "19 €/veh" },
            { tier: "Pro", price: "14 €/veh" },
            { tier: "Enterprise", price: "9 €/veh" },
          ].map((t) => (
            <div
              key={t.tier}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px 28px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "13px", color: "#6393ff", fontWeight: 600 }}>
                {t.tier}
              </span>
              <span style={{ fontSize: "22px", color: "#ffffff", fontWeight: 700 }}>
                {t.price}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p
          style={{
            position: "absolute",
            bottom: "32px",
            right: "48px",
            margin: 0,
            fontSize: "20px",
            color: "rgba(255,255,255,0.25)",
            fontWeight: 500,
          }}
        >
          trafico.live
        </p>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import prisma from "@/lib/db";

export const runtime = "nodejs";
export const alt = "Portal de movilidad municipal — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function humanizeName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  let name = humanizeName(slug);

  try {
    const muni = await prisma.municipality.findUnique({
      where: { slug },
      select: { name: true },
    });
    if (muni) name = muni.name;
  } catch {
    // Use humanized fallback
  }

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
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#34d399",
            }}
          />
          <span style={{ color: "#94b6ff", fontSize: "16px", fontWeight: 600 }}>
            trafico.live · Portal Municipal
          </span>
        </div>

        {/* Municipality name */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ color: "#e2e8f0", fontSize: "20px", marginBottom: "12px" }}>
            Movilidad en tiempo real
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "20px",
            }}
          >
            {name}
          </div>
          <div style={{ color: "#94b6ff", fontSize: "22px" }}>
            Tráfico · Calidad del aire · Combustible · Alertas
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
            Datos DGT · AEMET · MITECO
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

/**
 * Welcome email after successful newsletter confirmation.
 * Plain React with inline styles — no @react-email deps needed.
 */

import { createElement } from "react";
import type { ReactElement } from "react";

interface WelcomeEmailTemplateProps {
  email: string;
  unsubscribeUrl: string;
}

const FEATURES = [
  {
    icon: "🚦",
    title: "Tráfico en tiempo real",
    desc: "Incidencias, cortes y obras en carretera con datos de la DGT.",
  },
  {
    icon: "🚄",
    title: "Trenes y retrasos",
    desc: "Posiciones en directo, alertas de Renfe y estadísticas de puntualidad.",
  },
  {
    icon: "✈️",
    title: "Aviación y ferris",
    desc: "Vuelos sobre España, aeropuertos AENA y rutas de ferry.",
  },
  {
    icon: "⛽",
    title: "Precios de combustible",
    desc: "Gasolineras baratas, evolución de precios y tendencias CNMC.",
  },
];

export function WelcomeEmailTemplate({
  email,
  unsubscribeUrl,
}: WelcomeEmailTemplateProps): ReactElement {
  return createElement(
    "html",
    { lang: "es" },
    createElement(
      "head",
      null,
      createElement("meta", { charSet: "UTF-8" }),
      createElement("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      createElement("title", null, "Bienvenido/a a trafico.live"),
      createElement(
        "style",
        null,
        `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Exo+2:wght@700&display=swap');
        body { margin: 0; padding: 0; background: #f0f5ff; font-family: 'DM Sans', Arial, sans-serif; }`
      )
    ),
    createElement(
      "body",
      { style: { margin: 0, padding: "32px 16px", backgroundColor: "#f0f5ff" } },
      createElement(
        "table",
        {
          role: "presentation",
          cellPadding: 0,
          cellSpacing: 0,
          style: { maxWidth: "560px", margin: "0 auto", width: "100%" },
        },
        createElement(
          "tbody",
          null,
          // Header gradient bar
          createElement(
            "tr",
            null,
            createElement(
              "td",
              {
                style: {
                  background: "linear-gradient(135deg, #1b4bd5 0%, #092ea8 100%)",
                  borderRadius: "12px 12px 0 0",
                  padding: "32px",
                  textAlign: "center" as const,
                },
              },
              createElement(
                "span",
                {
                  style: {
                    fontFamily: "'Exo 2', Arial, sans-serif",
                    fontWeight: 700,
                    fontSize: "24px",
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                  },
                },
                "trafico.live"
              ),
              createElement("br", null),
              createElement(
                "span",
                {
                  style: {
                    fontSize: "14px",
                    color: "#c0d5ff",
                    marginTop: "4px",
                    display: "inline-block",
                  },
                },
                "Movilidad española en tiempo real"
              )
            )
          ),
          // Main body
          createElement(
            "tr",
            null,
            createElement(
              "td",
              {
                style: {
                  backgroundColor: "#ffffff",
                  padding: "40px 32px",
                  borderLeft: "1px solid #c0d5ff",
                  borderRight: "1px solid #c0d5ff",
                },
              },
              // Welcome text
              createElement(
                "h1",
                {
                  style: {
                    fontFamily: "'Exo 2', Arial, sans-serif",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 16px",
                    letterSpacing: "-0.02em",
                  },
                },
                "¡Ya estás dentro! 🎉"
              ),
              createElement(
                "p",
                {
                  style: {
                    fontSize: "15px",
                    lineHeight: "1.7",
                    color: "#4b5563",
                    margin: "0 0 24px",
                  },
                },
                "Gracias por confirmar tu suscripción. Cada lunes te enviaremos un resumen conciso con lo más relevante de la semana en el transporte español: tráfico, trenes, vuelos, ferris, calidad del aire y precios de combustible."
              ),
              // What to expect title
              createElement(
                "p",
                {
                  style: {
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#111827",
                    margin: "0 0 16px",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                  },
                },
                "Qué recibirás cada semana"
              ),
              // Feature grid (2x2 table)
              createElement(
                "table",
                {
                  role: "presentation",
                  cellPadding: 0,
                  cellSpacing: 0,
                  style: { width: "100%", marginBottom: "28px" },
                },
                createElement(
                  "tbody",
                  null,
                  ...(
                    [
                      [FEATURES[0], FEATURES[1]],
                      [FEATURES[2], FEATURES[3]],
                    ] as (typeof FEATURES)[]
                  ).map((row, ri) =>
                    createElement(
                      "tr",
                      { key: ri },
                      ...row.map((feat, fi) =>
                        createElement(
                          "td",
                          {
                            key: fi,
                            style: {
                              width: "50%",
                              padding: "12px",
                              verticalAlign: "top" as const,
                              backgroundColor: "#f0f5ff",
                              borderRadius: "8px",
                              ...(fi === 0 ? { paddingRight: "6px" } : { paddingLeft: "6px" }),
                              ...(ri === 0 ? { paddingBottom: "6px" } : { paddingTop: "6px" }),
                            },
                          },
                          createElement(
                            "div",
                            { style: { fontSize: "24px", marginBottom: "6px" } },
                            feat.icon
                          ),
                          createElement(
                            "strong",
                            { style: { fontSize: "13px", color: "#1b4bd5", display: "block" } },
                            feat.title
                          ),
                          createElement(
                            "span",
                            { style: { fontSize: "12px", color: "#6b7280", lineHeight: "1.5" } },
                            feat.desc
                          )
                        )
                      )
                    )
                  )
                )
              ),
              // CTA
              createElement(
                "div",
                { style: { textAlign: "center" as const, margin: "0 0 28px" } },
                createElement(
                  "a",
                  {
                    href: "https://trafico.live",
                    style: {
                      display: "inline-block",
                      backgroundColor: "#1b4bd5",
                      color: "#ffffff",
                      padding: "12px 28px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "14px",
                    },
                  },
                  "Explorar trafico.live →"
                )
              ),
              createElement("hr", {
                style: {
                  border: "none",
                  borderTop: "1px solid #e5e7eb",
                  margin: "0 0 20px",
                },
              }),
              createElement(
                "p",
                {
                  style: {
                    fontSize: "12px",
                    color: "#9ca3af",
                    margin: 0,
                    lineHeight: "1.5",
                  },
                },
                "Recibirás este email en ",
                createElement("strong", null, email),
                ". Si no deseas recibir más correos, puedes ",
                createElement(
                  "a",
                  {
                    href: unsubscribeUrl,
                    style: { color: "#6b7280", textDecoration: "underline" },
                  },
                  "darte de baja aquí"
                ),
                "."
              )
            )
          ),
          // Footer
          createElement(
            "tr",
            null,
            createElement(
              "td",
              {
                style: {
                  backgroundColor: "#f9fafb",
                  borderRadius: "0 0 12px 12px",
                  border: "1px solid #c0d5ff",
                  borderTop: "none",
                  padding: "20px 32px",
                  textAlign: "center" as const,
                },
              },
              createElement(
                "p",
                {
                  style: { fontSize: "12px", color: "#9ca3af", margin: "0 0 4px" },
                },
                "trafico.live · Certus SPV, SLU"
              ),
              createElement(
                "p",
                { style: { fontSize: "12px", color: "#9ca3af", margin: 0 } },
                createElement(
                  "a",
                  { href: "https://trafico.live/privacidad", style: { color: "#9ca3af" } },
                  "Privacidad"
                ),
                " · ",
                createElement(
                  "a",
                  { href: unsubscribeUrl, style: { color: "#9ca3af" } },
                  "Darse de baja"
                )
              )
            )
          )
        )
      )
    )
  );
}

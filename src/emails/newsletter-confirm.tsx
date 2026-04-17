/**
 * Double opt-in confirmation email template.
 * Written as a plain React component with inline styles for maximum email client compatibility.
 * No @react-email dependencies required.
 */

import { createElement } from "react";
import type { ReactElement } from "react";

interface ConfirmEmailTemplateProps {
  confirmUrl: string;
  email: string;
}

export function ConfirmEmailTemplate({
  confirmUrl,
  email,
}: ConfirmEmailTemplateProps): ReactElement {
  return createElement(
    "html",
    { lang: "es" },
    createElement(
      "head",
      null,
      createElement("meta", { charSet: "UTF-8" }),
      createElement("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      createElement("title", null, "Confirma tu suscripción — trafico.live"),
      createElement(
        "style",
        null,
        `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Exo+2:wght@700&display=swap');
        body { margin: 0; padding: 0; background: #f0f5ff; font-family: 'DM Sans', Arial, sans-serif; }
        `
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
          style: {
            maxWidth: "560px",
            margin: "0 auto",
            width: "100%",
          },
        },
        createElement(
          "tbody",
          null,
          // Header
          createElement(
            "tr",
            null,
            createElement(
              "td",
              {
                style: {
                  backgroundColor: "#1b4bd5",
                  borderRadius: "12px 12px 0 0",
                  padding: "28px 32px",
                  textAlign: "center" as const,
                },
              },
              createElement(
                "span",
                {
                  style: {
                    fontFamily: "'Exo 2', Arial, sans-serif",
                    fontWeight: 700,
                    fontSize: "22px",
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                  },
                },
                "trafico.live"
              )
            )
          ),
          // Body
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
              // Icon
              createElement(
                "div",
                {
                  style: {
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    backgroundColor: "#dde8ff",
                    margin: "0 auto 24px",
                    display: "table-cell",
                    verticalAlign: "middle",
                    textAlign: "center" as const,
                    fontSize: "24px",
                    lineHeight: "52px",
                  },
                },
                "✉️"
              ),
              // Headline
              createElement(
                "h1",
                {
                  style: {
                    fontFamily: "'Exo 2', Arial, sans-serif",
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 12px",
                    textAlign: "center" as const,
                    letterSpacing: "-0.02em",
                  },
                },
                "Confirma tu suscripción"
              ),
              // Body text
              createElement(
                "p",
                {
                  style: {
                    fontSize: "15px",
                    lineHeight: "1.6",
                    color: "#4b5563",
                    margin: "0 0 8px",
                    textAlign: "center" as const,
                  },
                },
                "Hemos recibido tu solicitud para suscribirte al resumen semanal de trafico.live con la dirección:"
              ),
              createElement(
                "p",
                {
                  style: {
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#1b4bd5",
                    margin: "0 0 28px",
                    textAlign: "center" as const,
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  },
                },
                email
              ),
              // CTA button
              createElement(
                "div",
                { style: { textAlign: "center" as const, margin: "0 0 28px" } },
                createElement(
                  "a",
                  {
                    href: confirmUrl,
                    style: {
                      display: "inline-block",
                      backgroundColor: "#1b4bd5",
                      color: "#ffffff",
                      padding: "14px 32px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "15px",
                      fontFamily: "'DM Sans', Arial, sans-serif",
                      letterSpacing: "0.01em",
                    },
                  },
                  "Confirmar mi suscripción →"
                )
              ),
              // Alt link
              createElement(
                "p",
                {
                  style: {
                    fontSize: "12px",
                    color: "#9ca3af",
                    textAlign: "center" as const,
                    margin: "0 0 8px",
                    lineHeight: "1.5",
                  },
                },
                "Si el botón no funciona, copia y pega este enlace en tu navegador:"
              ),
              createElement(
                "p",
                {
                  style: {
                    fontSize: "11px",
                    color: "#6b7280",
                    textAlign: "center" as const,
                    wordBreak: "break-all" as const,
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  },
                },
                confirmUrl
              ),
              // Divider
              createElement("hr", {
                style: {
                  border: "none",
                  borderTop: "1px solid #e5e7eb",
                  margin: "28px 0 20px",
                },
              }),
              // Note
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
                "Si no solicitaste esta suscripción, puedes ignorar este email. No recibirás nada más de nuestra parte."
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
                  style: {
                    fontSize: "12px",
                    color: "#9ca3af",
                    margin: 0,
                    lineHeight: "1.5",
                  },
                },
                "trafico.live · Inteligencia de transporte multimodal en España",
                createElement("br", null),
                "Certus SPV, SLU"
              )
            )
          )
        )
      )
    )
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { OnboardingStep } from "@/components/flotas/OnboardingStep";
import { CodeSample, INGEST_SAMPLE } from "@/components/flotas/CodeSample";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Configuración inicial — Flotas SaaS | trafico.live",
  description:
    "Configura tu integración GPS en menos de 30 minutos. Guía paso a paso para conectar tu flota a trafico.live.",
  alternates: { canonical: `${BASE_URL}/flotas/onboarding` },
  robots: { index: false, follow: true },
};

const GET_KEY_SAMPLE = [
  {
    label: "curl",
    language: "bash",
    code: `# Solicita tu API key (se envía por email)
curl -X POST https://trafico.live/api/keys \\
  -H "Content-Type: application/json" \\
  -d '{"email": "tu@empresa.es", "name": "Mi flota"}'

# Respuesta:
# {
#   "key": "tl_free_abc123...",
#   "tier": "FREE",
#   "rateLimits": { "perMinute": 10, "perDay": 1000 }
# }`,
  },
];

const VERIFY_SAMPLE = [
  {
    label: "curl",
    language: "bash",
    code: `# Envía tu primera posición de prueba
curl -X POST https://trafico.live/api/flotas/positions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: tl_free_TU_CLAVE" \\
  -d '{
    "positions": [{
      "vehicleId": "test-001",
      "lat": 40.4168,
      "lon": -3.7038,
      "speed": 0,
      "heading": 0
    }]
  }'

# Respuesta esperada:
# { "accepted": 1, "rejected": [] }`,
  },
];

export default function OnboardingPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Flotas SaaS", href: "/flotas" },
          { name: "Configuración", href: "/flotas/onboarding" },
        ]}
      />

      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold mb-3">
          Conecta tu flota en 4 pasos
        </h1>
        <p className="text-foreground/60">
          Sin hardware adicional. Solo una API key y una llamada HTTP.
          Tiempo estimado: menos de 30 minutos.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Step 1: Create account */}
        <OnboardingStep
          step={1}
          title="Crea tu cuenta"
          description="Regístrate con tu email corporativo para obtener acceso a la plataforma."
          active
        >
          <div className="flex flex-wrap gap-3 mt-1">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-medium transition-colors"
            >
              Crear cuenta
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-tl-200 dark:border-tl-700 hover:bg-tl-50 dark:hover:bg-tl-900 text-sm font-medium transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </OnboardingStep>

        {/* Step 2: Get API key */}
        <OnboardingStep
          step={2}
          title="Obtén tu API key de flota"
          description="Genera tu clave de acceso. Úsala en la cabecera x-api-key de cada llamada a la API de posiciones."
          active
        >
          <CodeSample blocks={GET_KEY_SAMPLE} />
          <p className="text-xs text-foreground/40 mt-2">
            También puedes generar y gestionar tus claves desde{" "}
            <Link href="/account" className="text-tl-500 hover:underline">
              tu cuenta
            </Link>
            .
          </p>
        </OnboardingStep>

        {/* Step 3: Send first position */}
        <OnboardingStep
          step={3}
          title="Envía tu primera posición de prueba"
          description="Copia el ejemplo, reemplaza la clave y ejecuta. Deberías ver accepted: 1 en la respuesta."
          active
        >
          <CodeSample blocks={VERIFY_SAMPLE} />
          <p className="text-xs text-foreground/40 mt-2">
            En producción envía lotes de hasta 500 posiciones por llamada para mayor eficiencia.
            Ver{" "}
            <Link href="/flotas/api-docs" className="text-tl-500 hover:underline">
              documentación completa
            </Link>
            .
          </p>
        </OnboardingStep>

        {/* Step 4: View on map */}
        <OnboardingStep
          step={4}
          title="Ve tu vehículo en el mapa"
          description="Una vez enviada la primera posición, entra al dashboard y verás tu vehículo sobre el mapa con tráfico en tiempo real."
          active
        >
          <div className="flex flex-wrap gap-3 mt-1">
            <Link
              href="/flotas/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-medium transition-colors"
            >
              Abrir dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/flotas/api-docs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-tl-200 dark:border-tl-700 hover:bg-tl-50 dark:hover:bg-tl-900 text-sm font-medium transition-colors"
              target="_blank"
            >
              API docs
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </OnboardingStep>
      </div>

      {/* Full API sample */}
      <div className="mt-12 pt-10 border-t border-tl-100 dark:border-tl-800">
        <h2 className="font-heading font-semibold text-lg mb-4">
          Ejemplo completo de ingestión
        </h2>
        <CodeSample blocks={INGEST_SAMPLE} />
      </div>

      <div className="mt-8 p-5 rounded-xl bg-tl-50 dark:bg-tl-900/50 border border-tl-100 dark:border-tl-800">
        <p className="text-sm text-foreground/60">
          ¿Problemas con la integración? Escríbenos a{" "}
          <a href="mailto:flotas@trafico.live" className="text-tl-500 hover:underline">
            flotas@trafico.live
          </a>{" "}
          o consulta la{" "}
          <Link href="/flotas/api-docs" className="text-tl-500 hover:underline">
            documentación completa de la API
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

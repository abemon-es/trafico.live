import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";
import { auth } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mi cuenta — trafico.live",
  description:
    "Gestiona tu perfil, suscripción, claves API y preferencias de notificación en trafico.live. Acceso al historial de consumo y opciones de facturación.",
  alternates: {
    canonical: `${BASE_URL}/account`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=/account");
  }

  const schema = generateWebPageSchema({
    title: "Mi cuenta — trafico.live",
    description:
      "Gestiona tu perfil, suscripción, claves API y preferencias de notificación en trafico.live.",
    url: `${BASE_URL}/account`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Mi cuenta", href: "/account" },
          ]}
        />
        <ComingSoon
          icon={UserCircle}
          title="Mi cuenta"
          description="Perfil, suscripción, claves API y preferencias de notificación desde un único lugar. Historial de consumo y opciones de facturación incluidos."
          eta="S1 (abril 2026)"
          ctaLabel="Gestionar claves API"
          ctaHref="/api-keys"
        />
      </main>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import CercaniasNetworkContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const NETWORK_MAP: Record<string, string> = {
  madrid: "Madrid",
  barcelona: "Barcelona",
  valencia: "Valencia",
  sevilla: "Sevilla",
  malaga: "Málaga",
  bilbao: "Bilbao",
  asturias: "Asturias",
  santander: "Santander",
  cadiz: "Cádiz",
  "murcia-alicante": "Murcia/Alicante",
  zaragoza: "Zaragoza",
  "san-sebastian": "San Sebastián",
};

type Props = {
  params: Promise<{ network: string }>;
};

export function generateStaticParams() {
  return Object.keys(NETWORK_MAP).map((network) => ({ network }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { network } = await params;
  const name = NETWORK_MAP[network];

  if (!name) {
    return { title: "Red no encontrada" };
  }

  return {
    title: `Cercanías ${name} — estaciones y líneas | trafico.live`,
    description: `Todas las estaciones y líneas de Cercanías ${name}. Consulta alertas activas, paradas, conexiones y el estado de la red en tiempo real.`,
    keywords: [
      `Cercanías ${name}`,
      `trenes cercanías ${name}`,
      `estaciones ${name}`,
      `líneas cercanías`,
      `Renfe Cercanías ${name}`,
    ],
    alternates: {
      canonical: `${BASE_URL}/trenes/cercanias/${network}`,
    },
    openGraph: {
      title: `Cercanías ${name} — estaciones y líneas`,
      description: `Estaciones, líneas C1–C10 y alertas de Cercanías ${name}. Información actualizada de Renfe.`,
      url: `${BASE_URL}/trenes/cercanias/${network}`,
      images: [`${BASE_URL}/og-image.webp`],
    },
  };
}

export default async function CercaniasNetworkPage({ params }: Props) {
  const { network } = await params;
  const name = NETWORK_MAP[network];

  if (!name) {
    notFound();
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Red Ferroviaria", href: "/trenes" },
          { name: "Cercanías", href: "/trenes/cercanias" },
          { name: name, href: `/trenes/cercanias/${network}` },
        ]}
      />

      <CercaniasNetworkContent network={network} displayName={name} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Cercanías ${name}`,
            description: `Estaciones y líneas de la red de Cercanías ${name}.`,
            url: `${BASE_URL}/trenes/cercanias/${network}`,
            publisher: {
              "@type": "Organization",
              name: "trafico.live",
              url: BASE_URL,
            },
          }),
        }}
      />
    </main>
  );
}

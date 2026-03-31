import { Metadata } from "next";
import RoadDetailContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ roadId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const roadName = decodeURIComponent(roadId);

  return {
    title: `${roadName} | Carreteras`,
    description: `Estado del tráfico en tiempo real en la carretera ${roadName}. Incidencias, radares, cámaras e intensidad media diaria.`,
    alternates: { canonical: `${BASE_URL}/explorar/carreteras/${roadId}` },
    openGraph: {
      title: `Tráfico en ${roadName}`,
      description: `Estado del tráfico en la carretera ${roadName}`,
    },
  };
}

export default async function RoadDetailPage({ params }: PageProps) {
  const { roadId } = await params;
  const roadName = decodeURIComponent(roadId);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Explorar", href: "/explorar" },
          { name: "Carreteras", href: "/explorar/carreteras" },
          { name: roadName, href: `/explorar/carreteras/${roadId}` },
        ]} />
      </div>
      <RoadDetailContent />
    </>
  );
}

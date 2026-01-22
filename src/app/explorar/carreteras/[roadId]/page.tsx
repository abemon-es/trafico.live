import { Metadata } from "next";
import RoadDetailContent from "./content";

interface PageProps {
  params: Promise<{ roadId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const roadName = decodeURIComponent(roadId);

  return {
    title: `${roadName} | Carreteras`,
    description: `Estado del tráfico en tiempo real en la carretera ${roadName}. Incidencias, radares, cámaras e intensidad media diaria.`,
    openGraph: {
      title: `Tráfico en ${roadName}`,
      description: `Estado del tráfico en la carretera ${roadName}`,
    },
  };
}

export default function RoadDetailPage() {
  return <RoadDetailContent />;
}

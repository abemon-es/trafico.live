import { Metadata } from "next";
import { notFound } from "next/navigation";
import CiudadCargaEVContent from "./content";

// City data for SEO and matching
const CITIES: Record<string, { name: string; province: string }> = {
  madrid: { name: "Madrid", province: "Madrid" },
  barcelona: { name: "Barcelona", province: "Barcelona" },
  valencia: { name: "Valencia", province: "Valencia" },
  sevilla: { name: "Sevilla", province: "Sevilla" },
  zaragoza: { name: "Zaragoza", province: "Zaragoza" },
  malaga: { name: "Málaga", province: "Málaga" },
  murcia: { name: "Murcia", province: "Murcia" },
  palma: { name: "Palma", province: "Baleares" },
  bilbao: { name: "Bilbao", province: "Bizkaia" },
  alicante: { name: "Alicante", province: "Alicante" },
  cordoba: { name: "Córdoba", province: "Córdoba" },
  valladolid: { name: "Valladolid", province: "Valladolid" },
  vigo: { name: "Vigo", province: "Pontevedra" },
  gijon: { name: "Gijón", province: "Asturias" },
  hospitalet: { name: "L'Hospitalet", province: "Barcelona" },
  vitoria: { name: "Vitoria-Gasteiz", province: "Álava" },
  granada: { name: "Granada", province: "Granada" },
  elche: { name: "Elche", province: "Alicante" },
  oviedo: { name: "Oviedo", province: "Asturias" },
  santander: { name: "Santander", province: "Cantabria" },
  "san-sebastian": { name: "San Sebastián", province: "Gipuzkoa" },
  pamplona: { name: "Pamplona", province: "Navarra" },
};

type Props = {
  params: Promise<{ ciudad: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad } = await params;
  const cityData = CITIES[ciudad];

  if (!cityData) {
    return {
      title: "Ciudad no encontrada",
    };
  }

  return {
    title: `Cargadores Eléctricos en ${cityData.name}`,
    description: `Encuentra puntos de carga para vehículos eléctricos en ${cityData.name}. Mapa de cargadores, potencia disponible y tipos de conectores.`,
    keywords: [
      `cargadores ${cityData.name}`,
      `puntos de carga ${cityData.name}`,
      "vehículos eléctricos",
      "EV",
      "electrolineras",
      cityData.province,
    ],
  };
}

export function generateStaticParams() {
  return Object.keys(CITIES).map((ciudad) => ({ ciudad }));
}

export default async function CiudadCargaEVPage({ params }: Props) {
  const { ciudad } = await params;
  const cityData = CITIES[ciudad];

  if (!cityData) {
    notFound();
  }

  return <CiudadCargaEVContent ciudad={ciudad} cityData={cityData} />;
}

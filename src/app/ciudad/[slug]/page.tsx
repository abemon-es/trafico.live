import { Metadata } from "next";
import { notFound } from "next/navigation";
import CiudadContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// City data
const CITIES: Record<
  string,
  { name: string; province: string; community: string; lat: number; lng: number }
> = {
  madrid: { name: "Madrid", province: "Madrid", community: "Comunidad de Madrid", lat: 40.4168, lng: -3.7038 },
  barcelona: { name: "Barcelona", province: "Barcelona", community: "Cataluña", lat: 41.3851, lng: 2.1734 },
  valencia: { name: "Valencia", province: "Valencia", community: "Comunidad Valenciana", lat: 39.4699, lng: -0.3763 },
  sevilla: { name: "Sevilla", province: "Sevilla", community: "Andalucía", lat: 37.3891, lng: -5.9845 },
  zaragoza: { name: "Zaragoza", province: "Zaragoza", community: "Aragón", lat: 41.6488, lng: -0.8891 },
  malaga: { name: "Málaga", province: "Málaga", community: "Andalucía", lat: 36.7213, lng: -4.4214 },
  murcia: { name: "Murcia", province: "Murcia", community: "Región de Murcia", lat: 37.9922, lng: -1.1307 },
  palma: { name: "Palma", province: "Baleares", community: "Islas Baleares", lat: 39.5696, lng: 2.6502 },
  bilbao: { name: "Bilbao", province: "Bizkaia", community: "País Vasco", lat: 43.2630, lng: -2.9350 },
  alicante: { name: "Alicante", province: "Alicante", community: "Comunidad Valenciana", lat: 38.3452, lng: -0.4810 },
  cordoba: { name: "Córdoba", province: "Córdoba", community: "Andalucía", lat: 37.8882, lng: -4.7794 },
  valladolid: { name: "Valladolid", province: "Valladolid", community: "Castilla y León", lat: 41.6523, lng: -4.7245 },
  vigo: { name: "Vigo", province: "Pontevedra", community: "Galicia", lat: 42.2328, lng: -8.7226 },
  gijon: { name: "Gijón", province: "Asturias", community: "Asturias", lat: 43.5322, lng: -5.6611 },
  granada: { name: "Granada", province: "Granada", community: "Andalucía", lat: 37.1773, lng: -3.5986 },
  vitoria: { name: "Vitoria-Gasteiz", province: "Álava", community: "País Vasco", lat: 42.8467, lng: -2.6726 },
  oviedo: { name: "Oviedo", province: "Asturias", community: "Asturias", lat: 43.3619, lng: -5.8494 },
  "san-sebastian": { name: "San Sebastián", province: "Gipuzkoa", community: "País Vasco", lat: 43.3183, lng: -1.9812 },
  santander: { name: "Santander", province: "Cantabria", community: "Cantabria", lat: 43.4623, lng: -3.8100 },
  pamplona: { name: "Pamplona", province: "Navarra", community: "Navarra", lat: 42.8125, lng: -1.6458 },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cityData = CITIES[slug];

  if (!cityData) {
    return {
      title: "Ciudad no encontrada",
    };
  }

  return {
    title: `Tráfico en ${cityData.name}`,
    description: `Información de tráfico en tiempo real en ${cityData.name}: incidencias, cámaras, precios de combustible, cargadores eléctricos y zonas ZBE.`,
    keywords: [
      `tráfico ${cityData.name}`,
      `incidencias ${cityData.name}`,
      `cámaras ${cityData.name}`,
      `gasolineras ${cityData.name}`,
      cityData.province,
    ],
    openGraph: {
      title: `Tráfico en ${cityData.name} en Tiempo Real`,
      description: `Información de tráfico en tiempo real en ${cityData.name}: incidencias, cámaras, precios de combustible, cargadores eléctricos y zonas ZBE.`,
      url: `${BASE_URL}/ciudad/${slug}`,
      type: "website",
      locale: "es_ES",
    },
    alternates: {
      canonical: `${BASE_URL}/ciudad/${slug}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(CITIES).map((slug) => ({ slug }));
}

export default async function CiudadPage({ params }: Props) {
  const { slug } = await params;
  const cityData = CITIES[slug];

  if (!cityData) {
    notFound();
  }

  const citySchema = {
    "@context": "https://schema.org",
    "@type": "City",
    name: cityData.name,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: cityData.province,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: cityData.community,
      },
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: cityData.lat,
      longitude: cityData.lng,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(citySchema) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Ciudades", href: "/ciudad" },
          { name: cityData.name, href: `/ciudad/${slug}` },
        ]} />
      </div>
      <CiudadContent slug={slug} cityData={cityData} />
    </>
  );
}

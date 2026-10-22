/**
 * Ocupantes de camión fallecidos en accidentes de tráfico.
 *
 * Built on deaths at 30 days by user type (src/lib/user-type-deaths.ts,
 * src/components/insights/UserTypeDeathsPage.tsx). The DGT doesn't publish
 * the vehicles involved in each accident, so this page counts people killed,
 * never accidents (CMO, 2026-10-22). When they can't be read it shows
 * UserTypeDeathsUnavailable, noindex.
 */

import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { USER_TYPE_DEATHS_UNAVAILABLE, UserTypeDeathsUnavailable } from "@/components/insights/UserTypeDeathsUnavailable";
import { UserTypeDeathsPage, fieldsKey, introSentence, type UserTypeDeathsConfig } from "@/components/insights/UserTypeDeathsPage";
import { userTypeDeaths } from "@/lib/user-type-deaths";

// Rendered per request, so there is no build copy: the build has no DB, and
// its copy would be the noindex fallback, served after every deploy. The
// figures come from Redis (an hour; src/lib/user-type-deaths.ts).
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const CONFIG: UserTypeDeathsConfig = {
  slug: "camiones",
  title: "Ocupantes de camión fallecidos en accidentes de tráfico",
  crumb: "Camiones",
  subject: "Ocupantes de camión",
  icon: Truck,
  series: [
    { field: "lightTruckDeaths30d", label: "Camión de hasta 3.500 kg", plural: "ocupantes de camiones de hasta 3.500 kg" },
    { field: "heavyTruckDeaths30d", label: "Camión de más de 3.500 kg", plural: "ocupantes de camiones de más de 3.500 kg" },
  ],
  note:
    "Cuenta a los conductores y pasajeros de camiones fallecidos, no a todas las víctimas de los accidentes en los que intervino un camión: la DGT no publica qué vehículos intervienen en cada accidente.",
};

const data = () => userTypeDeaths(fieldsKey(CONFIG));

export async function generateMetadata(): Promise<Metadata> {
  const d = await data();
  const url = `${BASE_URL}/inteligencia/camiones`;
  if (!d) {
    return {
      title: CONFIG.title,
      description: USER_TYPE_DEATHS_UNAVAILABLE,
      robots: { index: false, follow: true },
      alternates: { canonical: url },
      openGraph: { title: CONFIG.title, description: USER_TYPE_DEATHS_UNAVAILABLE, url, siteName: "trafico.live", locale: "es_ES", type: "website" },
    };
  }
  const title = `Ocupantes de camión fallecidos en España ${d.from}-${d.to}`;
  const description = introSentence(CONFIG, d);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "trafico.live", locale: "es_ES", type: "website" },
  };
}

export default async function CamionesPage() {
  const d = await data();
  if (!d) {
    return (
      <UserTypeDeathsUnavailable
        title={CONFIG.title}
        icon={Truck}
        breadcrumbs={[
          { name: "Inicio", href: "/" },
          { name: "Inteligencia", href: "/inteligencia/lluvia-y-accidentes" },
          { name: CONFIG.crumb, href: "/inteligencia/camiones" },
        ]}
      />
    );
  }
  return <UserTypeDeathsPage config={CONFIG} data={d} />;
}

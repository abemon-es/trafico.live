/**
 * Ocupantes de camión fallecidos en accidentes de tráfico.
 *
 * Built on deaths at 30 days by user type (src/lib/user-type-deaths.ts,
 * src/components/insights/UserTypeDeathsPage.tsx). The DGT doesn't publish
 * the vehicles involved in each accident, so this page counts people killed,
 * never accidents (CMO, 2026-10-22). When those columns can't be read it shows
 * VehicleDataPending.
 */

import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { VEHICLE_DATA_PENDING_DESCRIPTION, VehicleDataPending } from "@/components/insights/VehicleDataPending";
import { UserTypeDeathsPage, fieldsKey, introSentence, type UserTypeDeathsConfig } from "@/components/insights/UserTypeDeathsPage";
import { hasUserTypeDeaths, userTypeDeaths } from "@/lib/user-type-deaths";
import { isBuildWithoutDb } from "@/lib/db";

// 300: build-blank policy (2026-08-17). The Docker build has no DB, so this
// page prerenders the pending view, and the revalidate window is how long
// that blank copy survives every deploy.
export const revalidate = 300;

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

async function data() {
  return (await hasUserTypeDeaths("lightTruckDeaths30d")) ? userTypeDeaths(fieldsKey(CONFIG)) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await data();
  const url = `${BASE_URL}/inteligencia/camiones`;
  if (!d) {
    // noindex only when the DB answered: the build's copy (no DB) is served
    // once after every deploy, and must not be noindex (src/lib/db.ts).
    return {
      title: CONFIG.title,
      description: VEHICLE_DATA_PENDING_DESCRIPTION,
      ...(isBuildWithoutDb() ? {} : { robots: { index: false, follow: true } }),
      alternates: { canonical: url },
      openGraph: { title: CONFIG.title, description: VEHICLE_DATA_PENDING_DESCRIPTION, url, siteName: "trafico.live", locale: "es_ES", type: "website" },
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
      <VehicleDataPending
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

import { Metadata } from "next";
import { redirect } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Explorar | Tráfico España",
  description: "Explora el tráfico en España por territorios, carreteras e infraestructura.",
  alternates: { canonical: `${BASE_URL}/explorar` },
};

export default function ExplorarPage() {
  // Redirect to the default tab (territorios)
  redirect("/explorar/territorios");
}

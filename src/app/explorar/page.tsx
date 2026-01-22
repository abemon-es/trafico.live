import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Explorar | Tráfico España",
  description: "Explora el tráfico en España por territorios, carreteras e infraestructura.",
};

export default function ExplorarPage() {
  // Redirect to the default tab (territorios)
  redirect("/explorar/territorios");
}

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";

// 300: build-blank policy (2026-08-17). The Docker build has no DB, so this
// page prerenders empty and the revalidate window is how long that blank copy
// survives every deploy. Data freshness is not the constraint here.
export const revalidate = 300;

type Props = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  return {
    title: `Informe Mensual de Tráfico — ${month}`,
    description: `Resumen mensual de incidencias, accidentes y estado del tráfico en España para ${month}. Datos oficiales DGT.`,
  };
}

export default async function InformeMensualPage({ params }: Props) {
  const { month } = await params;
  // Try monthly accident report first, then fuel
  const slugs = [
    `siniestralidad-${month}`,
    `combustible-mensual-${month}`,
  ];
  for (const slug of slugs) {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (article) redirect(`/noticias/${slug}`);
  }
  notFound();
}

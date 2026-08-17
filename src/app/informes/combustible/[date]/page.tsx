import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";

// 300: build-blank policy (2026-08-17). The Docker build has no DB, so this
// page prerenders empty and the revalidate window is how long that blank copy
// survives every deploy. Data freshness is not the constraint here.
export const revalidate = 300;

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Informe de Combustible — ${date}`,
    description: `Análisis de precios de combustible en España para ${date}. Gasolineras más baratas y tendencias.`,
  };
}

export default async function InformeCombustiblePage({ params }: Props) {
  const { date } = await params;
  const slug = `precios-combustible-${date}`;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!article) notFound();
  redirect(`/noticias/${slug}`);
}

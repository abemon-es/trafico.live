import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";

// 300: build-blank policy (2026-08-17). The Docker build has no DB, so this
// page prerenders empty and the revalidate window is how long that blank copy
// survives every deploy. Data freshness is not the constraint here.
export const revalidate = 300;

type Props = { params: Promise<{ week: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { week } = await params;
  return {
    title: `Informe Semanal de Tráfico — Semana ${week}`,
    description: `Resumen semanal de incidencias y estado del tráfico en España. Semana ${week}.`,
  };
}

export default async function InformeSemanalPage({ params }: Props) {
  const { week } = await params;
  const slug = `informe-semanal-${week}`;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!article) notFound();
  redirect(`/noticias/${slug}`);
}

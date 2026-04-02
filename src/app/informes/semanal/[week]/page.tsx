import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";

export const revalidate = 3600;

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

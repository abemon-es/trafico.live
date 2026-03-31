import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const slug = `informe-diario-${date}`;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { title: true, summary: true },
  });
  if (!article) return { title: "Informe no encontrado" };
  return {
    title: `${article.title} — trafico.live`,
    description: article.summary,
    alternates: { canonical: `${BASE_URL}/informes/nacional/${date}` },
  };
}

export default async function InformeNacionalPage({ params }: Props) {
  const { date } = await params;
  // Redirect to the canonical /noticias/ URL where the article is rendered
  const slug = `informe-diario-${date}`;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!article) notFound();
  redirect(`/noticias/${slug}`);
}

import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";

export const revalidate = 60;

type Props = { params: Promise<{ week: string }> };

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

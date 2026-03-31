import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";

export const revalidate = 60;

type Props = { params: Promise<{ date: string }> };

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

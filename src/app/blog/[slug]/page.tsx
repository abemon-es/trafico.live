import { redirect } from "next/navigation";

/** @deprecated Use /noticias/[slug] instead */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/noticias/${slug}`);
}

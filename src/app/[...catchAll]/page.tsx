import { redirect, notFound } from "next/navigation";
import { findRedirect, recordHit } from "@/lib/redirects";

/**
 * Catch-all route: runs AFTER all specific routes fail to match.
 * Checks the Redirect table before returning 404.
 */
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ catchAll: string[] }>;
}) {
  const { catchAll } = await params;
  const path = "/" + catchAll.join("/");

  const entry = await findRedirect(path);
  if (entry) {
    recordHit(path);
    redirect(entry.destination);
  }

  notFound();
}

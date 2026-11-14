import { redirect, permanentRedirect, notFound } from "next/navigation";
import { findRedirect, recordHit } from "@/lib/redirects";
import { isSameSitePath } from "@/lib/redirect-destination";

/**
 * Catch-all route: runs AFTER all specific routes fail to match.
 * Checks the Redirect table before returning 404.
 *
 * Only destinations that are paths of this site are followed
 * (src/lib/redirect-destination.ts). A row pointing anywhere else is treated
 * as missing, so a stored full URL can never send a visitor off the site.
 */
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ catchAll: string[] }>;
}) {
  const { catchAll } = await params;
  const path = "/" + catchAll.join("/");

  const entry = await findRedirect(path);
  if (entry && isSameSitePath(entry.destination)) {
    recordHit(path);
    if (entry.permanent) {
      permanentRedirect(entry.destination);
    } else {
      redirect(entry.destination);
    }
  }

  notFound();
}

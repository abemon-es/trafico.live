/**
 * /trenes/estacion — hub stub redirecting to the catalog.
 *
 * /trenes/estacion/[slug] resolves but /trenes/estacion alone had no
 * page.tsx → 404 (Spanish singular vs plural mismatch with /trenes/
 * estaciones catalog). 308 redirect keeps any stray inbound link
 * resolved.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/trenes/estaciones");
}

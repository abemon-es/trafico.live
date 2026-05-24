/**
 * /trenes/linea — hub stub redirecting to the catalog.
 *
 * Mirror of /trenes/estacion/page.tsx: per-entity page lives at
 * /trenes/linea/[slug] but the bare /trenes/linea URL 404'd. Redirect
 * to /trenes/lineas (the actual catalog) so any external link or
 * mistyped URL lands somewhere useful.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/trenes/lineas");
}

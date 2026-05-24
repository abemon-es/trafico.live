/**
 * /maritimo/ferries — hub stub.
 *
 * /maritimo/ferries/[slug] (per-route page) and /maritimo/ferries/
 * proximo (next-ferry tool) both exist and link back to /maritimo/
 * ferries — but the parent URL had no page.tsx and 404'd. The
 * /maritimo main page also has a 'Ferries' CTA pointing here.
 *
 * Redirect to /maritimo/ferries/proximo (the actively useful tool)
 * rather than a generic /maritimo page so users land on a working
 * surface.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/maritimo/ferries/proximo");
}

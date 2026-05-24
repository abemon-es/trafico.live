/**
 * /aviacion/avion — stub redirect.
 *
 * Per-aeronave entity pages live at /aviacion/avion/[icao24].
 * The bare /aviacion/avion URL redirects to the aviation hub.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/aviacion");
}

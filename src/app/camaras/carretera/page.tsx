/**
 * /camaras/carretera — sibling stub of /camaras/carretera/[road].
 *
 * Per-road camera pages exist at /camaras/carretera/[road]. The bare
 * hub URL had no page → 404. Redirect to /camaras (catalog).
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/camaras");
}

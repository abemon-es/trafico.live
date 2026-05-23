/**
 * /calidad-aire/estacion — hub stub.
 *
 * /calidad-aire/estacion/[id] resolves to a per-station page, but the
 * parent /calidad-aire/estacion URL had no page.tsx and 404'd. The
 * /calidad-aire main page links here with a 'Directorio estaciones'
 * CTA. Until a proper directory page is built, permanently redirect
 * to /calidad-aire which already renders the station directory + map.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/calidad-aire");
}

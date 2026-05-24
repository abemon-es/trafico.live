/**
 * /calidad-aire/provincia — hub stub.
 *
 * Same shape as /calidad-aire/estacion/page.tsx: linked from a
 * homepage CTA but had no page.tsx → 404. Redirect to the main
 * /calidad-aire page which already lets the user pick a province.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/calidad-aire");
}

/**
 * /accidentes/carretera — sibling stub of /accidentes/carretera/[road].
 *
 * The per-road accident pages live at /accidentes/carretera/[road] (80
 * pre-generated + lazy). The bare /accidentes/carretera URL had no
 * page → 404. Redirect to /accidentes which has the 'Explorar por
 * carretera' section linking to all per-road pages.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/accidentes");
}

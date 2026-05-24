/**
 * /carga-ev/punto — sibling stub of /carga-ev/punto/[id].
 *
 * Per-charger pages live at /carga-ev/punto/[id] (rebuilt earlier in
 * this PR). Bare /carga-ev/punto 404'd. Redirect to /carga-ev which
 * is the catalog + map.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/carga-ev");
}

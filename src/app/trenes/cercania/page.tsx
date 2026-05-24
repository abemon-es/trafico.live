/**
 * /trenes/cercania — singular typo of /trenes/cercanias.
 *
 * The canonical hub is /trenes/cercanias (plural — 12 Cercanías
 * networks). The singular sibling 404'd. Defensive redirect for
 * typos and stray inbound links.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/trenes/cercanias");
}

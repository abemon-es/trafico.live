/**
 * /aviacion/aeropuerto — singular sibling stub.
 *
 * Canonical hub is /aviacion/aeropuertos (plural) which has both the
 * catalog and a working per-airport [iata] sub-route. Catch the
 * singular typo + redirect.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/aviacion/aeropuertos");
}

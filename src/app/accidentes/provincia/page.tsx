/**
 * /accidentes/provincia — 308 redirect to /accidentes
 *
 * Catch sibling URL pattern /accidentes/provincia (without a slug) that
 * might be crawled or linked. Permanent redirect to the accident hub.
 */

import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default function AccidentesProvinciaRedirect() {
  redirect("/accidentes");
}

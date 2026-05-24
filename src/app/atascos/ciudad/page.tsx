/**
 * /atascos/ciudad — 308 redirect to /atascos
 *
 * Catch sibling URL pattern /atascos/ciudad (without a slug) that might be
 * crawled or linked. Permanent redirect to the atascos hub.
 */

import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default function AtascosCiudadRedirect() {
  redirect("/atascos");
}

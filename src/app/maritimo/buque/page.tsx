/**
 * /maritimo/buque — singular sibling stub.
 *
 * The canonical entity-page URL is /maritimo/buques/[slug] (plural).
 * /maritimo/buque alone (singular) had no page → 404. Catches typos
 * and stray inbound links by redirecting to the buques catalog.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/maritimo/buques");
}

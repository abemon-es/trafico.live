/**
 * /maritimo/puerto — stub redirect.
 *
 * Per-puerto entity pages live at /maritimo/puerto/[slug].
 * The bare /maritimo/puerto URL redirects to the maritime hub.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/maritimo");
}

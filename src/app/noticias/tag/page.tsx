/**
 * /noticias/tag — sibling stub of /noticias/tag/[slug].
 *
 * Per-tag article listings live at /noticias/tag/[slug]. Bare hub
 * 404'd. Redirect to /noticias catalog where tags are discoverable
 * via article chips.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/noticias");
}

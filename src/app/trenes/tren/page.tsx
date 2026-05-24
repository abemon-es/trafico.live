/**
 * /trenes/tren — sibling stub of /trenes/tren/[trainId].
 *
 * Per-train live pages (built earlier in this PR) live at
 * /trenes/tren/[trainId]. The bare /trenes/tren URL 404'd. Redirect
 * to /trenes which has the live hero map of every train.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/trenes");
}

/**
 * /camaras/camara — stub redirect.
 *
 * Per-cámara entity pages live at /camaras/camara/[id].
 * The bare /camaras/camara URL redirects to the cameras hub.
 */

import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/camaras");
}

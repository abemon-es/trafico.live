import { redirect } from "next/navigation";

/**
 * /viaje is a SEO-variant namespace that consolidates into /ir.
 * All traffic is redirected to the canonical landing.
 */
export default function ViajePage() {
  redirect("/ir");
}

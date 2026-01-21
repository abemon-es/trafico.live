import { redirect } from "next/navigation";

// Redirect /comunidad-autonoma to /espana for cleaner URLs
export default function ComunidadAutonomaIndexPage() {
  redirect("/espana");
}

import { redirect } from "next/navigation";

/**
 * /flotas/api-docs — redirect to the public API documentation markdown file.
 * The docs are served as a static markdown page via the /docs route (future)
 * or linked from the onboarding flow.
 */
export default function FlotasApiDocsRedirect() {
  redirect("/flotas/onboarding");
}

import { redirect } from "next/navigation";

/** @deprecated Use /noticias instead */
export default function BlogPage() {
  redirect("/noticias");
}

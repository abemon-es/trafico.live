import { Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/email/contact-forms";

/** Shown instead of a form while the forms are off (see contact-forms.ts). */
export function ContactByEmail({ subject }: { subject?: string }) {
  const href = `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
      <Mail className="w-10 h-10 text-tl-600 dark:text-tl-400 mx-auto mb-4" aria-hidden="true" />
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        Escríbenos por correo y te respondemos desde la misma dirección.
      </p>
      <a
        href={href}
        className="inline-block font-semibold text-tl-700 dark:text-tl-300 hover:underline text-lg"
      >
        {CONTACT_EMAIL}
      </a>
    </div>
  );
}

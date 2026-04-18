import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth-config";

/**
 * Admin shell for /admin/affiliates.
 *
 * Access check: authenticated session + email in ADMIN_EMAILS env var.
 * TODO(T3.6): switch to session.user.role === 'ADMIN' once the role field
 * lands in the User model.
 */

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

export default async function AdminAffiliatesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?redirect=/admin/affiliates");
  }

  if (!isAdmin(session.user.email)) {
    redirect("/login?redirect=/admin/affiliates");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tl-100 text-tl-700 dark:bg-tl-900/40 dark:text-tl-300">
              Admin
            </span>
            <span className="font-semibold font-heading text-gray-900 dark:text-gray-100 text-sm">
              Afiliados
            </span>
          </div>
          <a
            href="/"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            ← trafico.live
          </a>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}

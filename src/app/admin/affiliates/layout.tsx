import { redirect } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Admin shell for /admin/affiliates.
 *
 * Access check: ADMIN_EMAILS env var (comma-separated).
 * TODO(T3.6): switch to session.user.role === 'ADMIN' once the role field
 * lands in the User model and B1's auth() is wired.
 *
 * For S0/S4 scaffold we read a custom header set by middleware/session.
 * In production this must come from a verified server-side session.
 */

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

// eslint-disable-next-line @typescript-eslint/require-await
export default async function AdminAffiliatesLayout({
  children,
}: {
  children: ReactNode;
}) {
  // In a real auth setup, read session here (e.g. getServerSession).
  // For now, check ADMIN_EMAILS against a session placeholder.
  // When B1's auth() is integrated, replace this block:
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? null; // dev override

  // In production this check will use real session email.
  // For S4, this effectively always allows access when ADMIN_SEED_EMAIL is set,
  // or blocks everyone otherwise — intentional, prevents accidental exposure.
  if (!isAdmin(adminEmail)) {
    redirect("/");
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

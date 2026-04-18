import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import {
  LayoutDashboard,
  Key,
  Activity,
  CreditCard,
  Bell,
  Truck,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { TierBadge } from "@/components/dashboard/TierBadge";
import type { ApiTierName } from "@/lib/api-tiers";
import { prisma } from "@/lib/db";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/keys", label: "Claves API", icon: Key },
  { href: "/dashboard/usage", label: "Uso", icon: Activity },
  { href: "/dashboard/billing", label: "Facturación", icon: CreditCard },
  { href: "/dashboard/alertas", label: "Alertas", icon: Bell },
] as const;

const EXTERNAL_NAV = [
  { href: "/flotas", label: "Flotas", icon: Truck },
  { href: "/api-docs", label: "Documentación API", icon: BookOpen },
  { href: "mailto:soporte@trafico.live", label: "Soporte", icon: HelpCircle },
] as const;

async function getUserTier(email: string): Promise<ApiTierName> {
  const keys = await prisma.apiKey.findMany({
    where: { email, isActive: true },
    select: { tier: true },
  });
  const tierRank: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
  let best: string = "FREE";
  for (const k of keys) {
    if ((tierRank[k.tier] ?? 0) > (tierRank[best] ?? 0)) best = k.tier;
  }
  return best as ApiTierName;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;
  const name = session.user.name ?? email.split("@")[0];
  const image = session.user.image ?? null;
  const tier = await getUserTier(email);

  return (
    <div className="min-h-screen bg-tl-50/30 dark:bg-tl-950">
      <div className="max-w-screen-xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 sticky top-0 h-screen border-r border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 flex flex-col">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-tl-100 dark:border-tl-800">
            <Link
              href="/"
              className="flex items-center gap-2 text-tl-700 dark:text-tl-300 hover:text-tl-500 transition-colors"
            >
              <span className="font-heading font-700 text-base">trafico.live</span>
            </Link>
          </div>

          {/* User card */}
          <div className="px-4 py-4 border-b border-tl-100 dark:border-tl-800">
            <div className="flex items-center gap-3">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={name}
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-tl-100 dark:bg-tl-800 flex items-center justify-center">
                  <span className="text-sm font-heading font-600 text-tl-600 dark:text-tl-300 uppercase">
                    {name[0]}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate font-body">{name}</p>
                <p className="text-xs text-tl-400 truncate font-body">{email}</p>
              </div>
            </div>
            <div className="mt-2 pl-11">
              <TierBadge tier={tier} size="sm" />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto" aria-label="Navegación del panel">
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-tl-600 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900 hover:text-tl-700 dark:hover:text-tl-200 transition-colors group"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-tl-400 group-hover:text-tl-500 transition-colors" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 pt-4 border-t border-tl-100 dark:border-tl-800">
              <p className="px-3 mb-1.5 text-xs font-medium text-tl-400 uppercase tracking-wide font-body">
                Más
              </p>
              <ul className="space-y-0.5">
                {EXTERNAL_NAV.map((item) => {
                  const Icon = item.icon;
                  const isExternal = item.href.startsWith("mailto:");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        {...(isExternal ? {} : {})}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-tl-500 dark:text-tl-400 hover:bg-tl-50 dark:hover:bg-tl-900 hover:text-tl-600 dark:hover:text-tl-300 transition-colors group"
                      >
                        <Icon className="w-4 h-4 shrink-0 text-tl-300 dark:text-tl-600 group-hover:text-tl-400 transition-colors" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-tl-100 dark:border-tl-800">
            <p className="text-xs text-tl-400 font-body">
              &copy; {new Date().getFullYear()} trafico.live
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 py-8 px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

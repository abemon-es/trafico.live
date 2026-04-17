"use client";

import type { ReactNode } from "react";

export interface MunicipalBranding {
  slug: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  tier?: "FREE" | "BASE" | "DATA_FEED" | null;
}

interface BrandingShellProps {
  branding: MunicipalBranding | null;
  children: ReactNode;
}

/**
 * Applies optional municipal branding (logo + colors) around the dashboard.
 * Free-tier and unknown municipalities always show trafico.live branding.
 */
export function BrandingShell({ branding, children }: BrandingShellProps) {
  const isPaid =
    branding?.tier === "BASE" || branding?.tier === "DATA_FEED";

  // Only apply custom colors on paid tier
  const customStyles =
    isPaid && branding?.primaryColor
      ? ({
          "--municipal-primary": branding.primaryColor,
          "--municipal-secondary": branding.secondaryColor ?? branding.primaryColor,
        } as React.CSSProperties)
      : {};

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" style={customStyles}>
      {/* Municipal header strip — only for paid tier */}
      {isPaid && (branding?.logoUrl || branding?.name) && (
        <div
          className="border-b border-gray-200 dark:border-gray-800"
          style={
            isPaid && branding?.primaryColor
              ? { borderColor: branding.primaryColor + "33" }
              : {}
          }
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
            {branding?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={`Escudo ${branding.name}`}
                className="h-10 w-auto object-contain"
              />
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-body">
                Portal de movilidad
              </p>
              <p className="text-sm font-heading font-semibold text-gray-900 dark:text-white">
                {branding?.name}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span>Datos por</span>
              <span className="font-semibold text-tl-600 dark:text-tl-400 font-heading">
                trafico.live
              </span>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

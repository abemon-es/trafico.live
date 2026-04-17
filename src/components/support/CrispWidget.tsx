"use client";

/**
 * CrispWidget — Lazy-loads the Crisp chat script.
 *
 * Usage (in a Server Component):
 *   import CrispWidget from "@/components/support/CrispWidget";
 *   <CrispWidget email={session?.user?.email} name={session?.user?.name} />
 *
 * Requires env:
 *   NEXT_PUBLIC_CRISP_WEBSITE_ID — Crisp website ID (omit to disable gracefully)
 *
 * Mount points (DO NOT add to root layout — T2.3 owns it):
 *   - src/app/api-landing/layout.tsx  or  src/app/api-landing/page.tsx
 *   - src/app/dashboard/layout.tsx
 *   - src/app/flotas/dashboard/layout.tsx
 *   - src/app/account/page.tsx
 */

import Script from "next/script";
import { useEffect } from "react";

interface CrispWidgetProps {
  /** User email — sent to Crisp to pre-identify the session (optional) */
  email?: string | null;
  /** User display name — sent to Crisp (optional) */
  name?: string | null;
}

declare global {
  interface Window {
    $crisp?: unknown[][];
    CRISP_WEBSITE_ID?: string;
  }
}

export default function CrispWidget({ email, name }: CrispWidgetProps) {
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

  // Graceful fallback: if the env var is missing, render nothing
  if (!websiteId) return null;

  return (
    <>
      {/* Crisp global config must be set before the script loads */}
      <Script
        id="crisp-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.$crisp = [];
            window.CRISP_WEBSITE_ID = "${websiteId}";
          `,
        }}
      />

      {/* Main Crisp SDK */}
      <Script
        id="crisp-sdk"
        src="https://client.crisp.chat/l.js"
        strategy="lazyOnload"
        onLoad={() => {
          // Identify the user once the SDK has loaded, if credentials provided
          if (typeof window !== "undefined" && window.$crisp) {
            if (email) {
              window.$crisp.push(["set", "user:email", [email]]);
            }
            if (name) {
              window.$crisp.push(["set", "user:nickname", [name]]);
            }
          }
        }}
      />

      {/* Hydration-safe user identification — runs after component mounts */}
      <CrispIdentify email={email} name={name} />
    </>
  );
}

/**
 * Inner client component that handles re-identification when props change
 * (e.g. user logs in after initial render).
 */
function CrispIdentify({ email, name }: CrispWidgetProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.$crisp) return;
    if (email) window.$crisp.push(["set", "user:email", [email]]);
    if (name) window.$crisp.push(["set", "user:nickname", [name]]);
  }, [email, name]);

  return null;
}

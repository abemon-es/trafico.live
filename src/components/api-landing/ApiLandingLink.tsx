"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackApiLandingClick } from "@/lib/analytics";

interface ApiLandingLinkProps {
  source: "footer" | "hub";
  hub?: string;
  className?: string;
  children: ReactNode;
}

/** A link to /api-landing that records cta_click (cta_id api_landing). No UTMs:
 *  internal links keep the session's attribution. */
export function ApiLandingLink({ source, hub, className, children }: ApiLandingLinkProps) {
  return (
    <Link href="/api-landing" className={className} onClick={() => trackApiLandingClick(source, hub)}>
      {children}
    </Link>
  );
}

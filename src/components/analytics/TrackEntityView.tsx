"use client";

import { useEffect } from "react";
import { trackEntityView } from "@/lib/analytics";

/**
 * Fires a GA4 `view_item` event once on mount. Drop into server-rendered
 * entity detail pages (camera, gas station, radar, railway station, …) —
 * the page itself stays a server component; this renders nothing.
 *
 * Wired 2026-06-10: GA4 showed zero `view_item` events in 28 days even
 * though detail pages are the core engagement surface — the helper in
 * src/lib/analytics.ts existed but had no call sites.
 */
export function TrackEntityView({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  useEffect(() => {
    trackEntityView(entityType, entityId);
  }, [entityType, entityId]);

  return null;
}

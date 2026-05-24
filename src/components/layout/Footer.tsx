import { NewsletterCTA } from "@/components/layout/footer/NewsletterCTA";
import { FooterGrid } from "@/components/layout/footer/FooterGrid";
import { GeoLinks } from "@/components/layout/footer/GeoLinks";
import { TrustStrip } from "@/components/layout/footer/TrustStrip";
import { LegalStrip } from "@/components/layout/footer/LegalStrip";

/**
 * 5-strip footer
 *
 * Strip 1 — NewsletterCTA   — pre-footer CTA (client component)
 * Strip 2 — FooterGrid      — 6-column primary link grid (server)
 * Strip 3 — GeoLinks        — 130+ geo deep-links SEO workhorse (server)
 * Strip 4 — TrustStrip      — data attribution / E-E-A-T signal (server)
 * Strip 5 — LegalStrip      — brand + legal + meta + git sha (server)
 */
export function Footer() {
  return (
    <footer>
      {/* Strip 1 — Newsletter CTA */}
      <NewsletterCTA />

      {/* Strip 2 — Primary link grid */}
      <FooterGrid />

      {/* Strip 3 — Geo long-tail SEO */}
      <GeoLinks />

      {/* Strip 4 — Trust + attribution */}
      <TrustStrip />

      {/* Strip 5 — Brand + legal + meta */}
      <LegalStrip />
    </footer>
  );
}

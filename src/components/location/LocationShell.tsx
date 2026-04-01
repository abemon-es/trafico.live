import type { GeoEntity } from "@/lib/geo/types";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SectionNav } from "./SectionNav";

interface LocationShellProps {
  entity: GeoEntity;
  /** Breadcrumb items — label maps to `name` used by Breadcrumbs */
  breadcrumbs: { label: string; href: string }[];
  children: React.ReactNode;
  /** Sections visible on this page (determined by parent based on data availability) */
  visibleSections: { id: string; label: string; count?: number }[];
}

export function LocationShell({
  entity: _entity,
  breadcrumbs,
  children,
  visibleSections,
}: LocationShellProps) {
  // Breadcrumbs component expects { name, href } — map label → name
  const breadcrumbItems = breadcrumbs.map((b) => ({ name: b.label, href: b.href }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="mt-4 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
          {/* Sidebar nav — desktop only */}
          <aside className="hidden lg:block">
            <SectionNav sections={visibleSections} variant="sidebar" />
          </aside>

          {/* Mobile nav — sticky horizontal strip */}
          <div className="lg:hidden sticky top-16 z-30 -mx-4 px-4 bg-white/95 backdrop-blur border-b border-gray-200">
            <SectionNav sections={visibleSections} variant="horizontal" />
          </div>

          {/* Main content */}
          <main className="mt-4 lg:mt-0 space-y-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

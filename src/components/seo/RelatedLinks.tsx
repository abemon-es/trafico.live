import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface RelatedLink {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
}

interface RelatedLinksProps {
  title?: string;
  links: RelatedLink[];
}

export function RelatedLinks({ title = "Te puede interesar", links }: RelatedLinksProps) {
  return (
    <section aria-labelledby="related-links-heading" className="mt-8">
      <h2
        id="related-links-heading"
        className="text-lg font-bold text-gray-900 mb-4"
      >
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-tl-300 transition-all group"
          >
            {link.icon && (
              <div className="flex-shrink-0 mt-0.5 text-tl-600 group-hover:text-tl-700 transition-colors">
                {link.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm group-hover:text-tl-700 transition-colors leading-snug">
                {link.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{link.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-tl-400 transition-colors flex-shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

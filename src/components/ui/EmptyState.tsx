import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mx-auto">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center mt-4 px-4 py-2 bg-tl-600 text-white rounded-lg hover:bg-tl-700 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

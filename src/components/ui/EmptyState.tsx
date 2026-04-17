import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?:
    | { label: string; href: string }
    | { label: string; onClick: () => void };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 sm:p-12 text-center flex flex-col items-center",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {"href" in action ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 text-white font-semibold hover:bg-tl-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600 transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 text-white font-semibold hover:bg-tl-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      {children && <div className="mt-4 w-full">{children}</div>}
    </div>
  );
}

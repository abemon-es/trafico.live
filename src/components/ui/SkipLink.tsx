export interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

/**
 * Visible-on-focus link that lets keyboard and screen-reader users skip
 * past the chrome straight to the main content landmark.
 *
 * Must be mounted as the first focusable element inside <body>.
 */
export function SkipLink({
  targetId = "main-content",
  label = "Saltar al contenido",
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-tl-700 focus:text-white focus:font-semibold focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600"
    >
      {label}
    </a>
  );
}

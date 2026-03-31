import Link from "next/link";

interface LogoProps {
  variant?: "horizontal" | "stacked" | "icon";
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark" | "auto";
  href?: string;
  className?: string;
}

/* Diagonal heat flow: opacity increases from top-left → bottom-right */
const GRID_OPACITIES = [0.1, 0.2, 0.35, 0.2, 0.5, 0.7, 0.35, 0.7, 1];

function HeatmapGrid({
  size,
  theme = "light",
}: {
  size: number;
  theme: "light" | "dark";
}) {
  const fill = theme === "dark" ? "#6393ff" : "#1b4bd5";
  // 3x3 grid with tight gaps: cell = 148/512 of size, gap = 16/512 of size
  const s = size / 512;
  const cellW = 148 * s;
  const r = 16 * s;
  const starts = [18 * s, 182 * s, 346 * s];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
    >
      {starts.map((y, row) =>
        starts.map((x, col) => (
          <rect
            key={`${row}-${col}`}
            x={x}
            y={y}
            width={cellW}
            height={cellW}
            rx={r}
            fill={fill}
            opacity={GRID_OPACITIES[row * 3 + col]}
          />
        ))
      )}
    </svg>
  );
}

const SIZES = {
  sm: { icon: 20, text: 16, gap: 7 },
  md: { icon: 28, text: 22, gap: 9 },
  lg: { icon: 48, text: 36, gap: 12 },
};

export function Logo({
  variant = "horizontal",
  size = "md",
  theme = "auto",
  href = "/",
  className = "",
}: LogoProps) {
  const s = SIZES[size];
  const resolvedTheme = theme === "auto" ? "light" : theme;

  const textColor =
    resolvedTheme === "dark"
      ? "text-gray-100"
      : "text-gray-900 dark:text-gray-100";
  const accentColor =
    resolvedTheme === "dark"
      ? "text-tl-400"
      : "text-tl-600 dark:text-tl-400";

  const wordmark = (
    <span
      style={{
        fontFamily: "var(--font-heading)",
        fontSize: `${s.text}px`,
        letterSpacing: "-0.3px",
        lineHeight: 1,
      }}
    >
      <span className={textColor} style={{ fontWeight: 800 }}>
        trafico
      </span>
      <span className={accentColor} style={{ fontWeight: 800 }}>
        .
      </span>
      <span className={accentColor} style={{ fontWeight: 600 }}>
        live
      </span>
    </span>
  );

  const content = (() => {
    switch (variant) {
      case "icon":
        return <HeatmapGrid size={s.icon} theme={resolvedTheme} />;

      case "stacked":
        return (
          <div
            className="flex flex-col items-center"
            style={{ gap: `${s.gap}px` }}
          >
            <HeatmapGrid size={s.icon} theme={resolvedTheme} />
            {wordmark}
          </div>
        );

      case "horizontal":
      default:
        return (
          <div
            className="flex items-center"
            style={{ gap: `${s.gap}px` }}
          >
            <HeatmapGrid size={s.icon} theme={resolvedTheme} />
            {wordmark}
          </div>
        );
    }
  })();

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex ${className}`}
        aria-label="trafico.live — Inicio"
      >
        {content}
      </Link>
    );
  }

  return <div className={`inline-flex ${className}`}>{content}</div>;
}

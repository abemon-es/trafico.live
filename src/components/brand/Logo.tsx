import Link from "next/link";

interface LogoProps {
  variant?: "horizontal" | "inline" | "stacked" | "icon";
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark" | "auto";
  href?: string;
  className?: string;
}

const SIGNAL = {
  light: { red: "#dc2626", amber: "#d97706", green: "#059669" },
  dark: { red: "#f87171", amber: "#fbbf24", green: "#34d399" },
};

function Icon3Puntos({
  height,
  theme = "light",
}: {
  height: number;
  theme: "light" | "dark";
}) {
  const c = SIGNAL[theme];
  // Geometry: 3 dots, gap = 0.5d, total = 4d
  const d = height / 4;
  const r = d / 2;
  const cx = r;
  return (
    <svg
      width={d}
      height={height}
      viewBox={`0 0 ${d} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <circle cx={cx} cy={r} r={r} fill={c.red} />
      <circle cx={cx} cy={height / 2} r={r} fill={c.amber} />
      <circle cx={cx} cy={height - r} r={r} fill={c.green} />
    </svg>
  );
}

function LiveBadge({
  fontSize,
  theme = "light",
}: {
  fontSize: number;
  theme: "light" | "dark";
}) {
  const bg = theme === "dark" ? "bg-tl-500" : "bg-tl-600";
  const dotSize = Math.max(2, fontSize * 0.35);
  const py = Math.max(1, fontSize * 0.2);
  const px = Math.max(4, fontSize * 0.6);
  const radius = Math.max(3, fontSize * 0.5);

  return (
    <span
      className={`inline-flex items-center ${bg}`}
      style={{
        gap: `${dotSize}px`,
        padding: `${py}px ${px}px`,
        borderRadius: `${radius}px`,
      }}
    >
      <span
        className="block rounded-full bg-white"
        style={{
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          opacity: 0.85,
        }}
      />
      <span
        className="text-white"
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: `${fontSize}px`,
          letterSpacing: `${fontSize * 0.1}px`,
          lineHeight: 1,
        }}
      >
        .LIVE
      </span>
    </span>
  );
}

const SIZES = {
  sm: { iconH: 20, text: 14, badge: 7, gap: 6 },
  md: { iconH: 28, text: 18, badge: 9, gap: 8 },
  lg: { iconH: 48, text: 32, badge: 13, gap: 12 },
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
    resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900";

  const content = (() => {
    switch (variant) {
      case "icon":
        return <Icon3Puntos height={s.iconH} theme={resolvedTheme} />;

      case "stacked":
        return (
          <div className="flex flex-col items-center" style={{ gap: `${s.gap}px` }}>
            <Icon3Puntos height={s.iconH} theme={resolvedTheme} />
            <div className="text-center">
              <div
                className={textColor}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: `${s.text}px`,
                  letterSpacing: "-0.5px",
                  lineHeight: 1,
                }}
              >
                trafico
              </div>
              <div style={{ marginTop: `${s.gap * 0.5}px` }}>
                <LiveBadge fontSize={s.badge} theme={resolvedTheme} />
              </div>
            </div>
          </div>
        );

      case "inline":
      case "horizontal":
      default:
        return (
          <div className="flex items-center" style={{ gap: `${s.gap}px` }}>
            <Icon3Puntos height={s.iconH} theme={resolvedTheme} />
            {variant === "inline" ? (
              <>
                <span
                  className={textColor}
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: `${s.text}px`,
                    letterSpacing: "-0.3px",
                    lineHeight: 1,
                  }}
                >
                  trafico
                </span>
                <LiveBadge fontSize={s.badge} theme={resolvedTheme} />
              </>
            ) : (
              <div>
                <div
                  className={textColor}
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: `${s.text}px`,
                    letterSpacing: "-0.5px",
                    lineHeight: 1,
                  }}
                >
                  trafico
                </div>
                <div style={{ marginTop: `${s.gap * 0.4}px` }}>
                  <LiveBadge fontSize={s.badge} theme={resolvedTheme} />
                </div>
              </div>
            )}
          </div>
        );
    }
  })();

  if (href) {
    return (
      <Link href={href} className={`inline-flex ${className}`} aria-label="trafico.live — Inicio">
        {content}
      </Link>
    );
  }

  return <div className={`inline-flex ${className}`}>{content}</div>;
}

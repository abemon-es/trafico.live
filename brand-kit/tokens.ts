/**
 * trafico.live — Brand Tokens
 * OKLCH-generated palettes + icon geometry + typography
 */

// === COLOR PALETTES ===

export const tl = {
  50: "#f0f5ff",
  100: "#dde8ff",
  200: "#c0d5ff",
  300: "#94b6ff",
  400: "#6393ff",
  500: "#366cf8",
  600: "#1b4bd5",
  700: "#092ea8",
  800: "#011577",
  900: "#000245",
  950: "#000025",
} as const;

export const tlAmber = {
  50: "#fff3ea",
  100: "#ffe2cc",
  200: "#fcc8a1",
  300: "#eca66e",
  400: "#d48139",
  500: "#b56200",
  600: "#8c4a00",
  700: "#653400",
  800: "#401f00",
  900: "#1f0c00",
  950: "#0d0400",
} as const;

export const signal = {
  red: "#dc2626",
  amber: "#d97706",
  green: "#059669",
} as const;

export const signalDark = {
  red: "#f87171",
  amber: "#fbbf24",
  green: "#34d399",
} as const;

export const signalPastel = {
  red: "#fca5a5",
  amber: "#fde68a",
  green: "#6ee7b7",
} as const;

// === ICON GEOMETRY ===

export const icon = {
  /** 3 Puntos: red/amber/green vertically stacked */
  colors: [signal.red, signal.amber, signal.green] as const,
  colorsDark: [signalDark.red, signalDark.amber, signalDark.green] as const,
  colorsPastel: [signalPastel.red, signalPastel.amber, signalPastel.green] as const,
  /** At base size (96px total height) */
  geometry: {
    dotDiameter: 24,
    gap: 12,
    centerToCenter: 36,
    totalHeight: 96,
  },
  /** App icon: dots on blue background */
  appIcon: {
    background: tl[600],
    cornerRadius: "22%",
    padding: "8%",
  },
} as const;

// === TYPOGRAPHY ===

export const fonts = {
  heading: "Exo 2",
  body: "DM Sans",
  mono: "JetBrains Mono",
} as const;

// === BADGE (.LIVE) ===

export const badge = {
  background: tl[600],
  backgroundDark: tl[500],
  text: ".LIVE",
  textColor: "#ffffff",
  dotColor: "#ffffff",
  dotOpacity: 0.85,
  borderRadius: 7,
  letterSpacing: "1.5px",
  fontSize: 15,
  fontWeight: 700,
} as const;

// === BRAND ===

export const brand = {
  name: "trafico.live",
  wordmark: "trafico",
  tagline: "Inteligencia vial en tiempo real",
  themeColor: tl[600],
  primary: tl,
  accent: tlAmber,
  signal,
  signalDark,
  signalPastel,
  icon,
  badge,
  fonts,
} as const;

export default brand;

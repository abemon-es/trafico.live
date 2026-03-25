/**
 * trafico.live — Brand Tokens
 * OKLCH-generated palettes for programmatic use
 */

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
  green: "#059669",
  amber: "#d97706",
  red: "#dc2626",
} as const;

export const fonts = {
  heading: "Exo 2",
  body: "DM Sans",
  mono: "JetBrains Mono",
} as const;

export const brand = {
  name: "trafico.live",
  tagline: "Inteligencia vial en tiempo real",
  themeColor: "#1b4bd5",
  primary: tl,
  accent: tlAmber,
  signal,
  fonts,
} as const;

export default brand;

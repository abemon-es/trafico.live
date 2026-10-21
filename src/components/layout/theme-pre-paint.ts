/**
 * Inline <head> script: puts `dark` on <html> before the first paint when the
 * visitor chose dark mode, or has no choice stored and the system prefers it.
 *
 * Until 2026-10-21 only ThemeToggle's effect set it, after hydration: a
 * dark-mode visitor saw the page light for ~0.3 s on desktop and 1.2–1.4 s on
 * a 4×-throttled CPU, then the flip. Static on purpose: nothing from the
 * server or the URL goes into it. Same rule as ThemeToggle (localStorage
 * "theme", then prefers-color-scheme).
 */
export const THEME_PRE_PAINT_SCRIPT =
  "try{var t=localStorage.getItem(\"theme\");" +
  "if(t===\"dark\"||(!t&&window.matchMedia(\"(prefers-color-scheme: dark)\").matches))" +
  "document.documentElement.classList.add(\"dark\")}catch(e){}";

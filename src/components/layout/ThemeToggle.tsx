"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// The class on <html> is the state: THEME_PRE_PAINT_SCRIPT sets it before the
// first paint (components/layout/theme-pre-paint), and this button only reads
// it and flips it. Setting it again on mount is what made dark mode appear
// after hydration, ~0.3–1.4 s late, until 2026-10-21.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");
const serverIsDark = () => false;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, serverIsDark);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="p-3 rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600 transition-colors dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
      aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
      aria-pressed={dark}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

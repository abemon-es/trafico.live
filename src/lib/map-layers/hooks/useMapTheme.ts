"use client";

import { useState, useEffect } from "react";
import { MAP_STYLE_PROTOMAPS, MAP_STYLE_PROTOMAPS_DARK } from "@/lib/map-config";
import type { StyleSpecification } from "maplibre-gl";

export type ThemeProp = "light" | "dark" | "auto";

interface UseMapThemeResult {
  resolvedTheme: "light" | "dark";
  mapStyle: StyleSpecification;
  toggleTheme: () => void;
}

/**
 * Returns the correct Protomaps style based on the active theme.
 * - "light" / "dark" — fixed
 * - "auto" — follows prefers-color-scheme, toggleable by user
 */
export function useMapTheme(theme: ThemeProp = "auto"): UseMapThemeResult {
  // In auto mode the map theme tracks the APP theme class (`.dark` on
  // documentElement set by ThemeProvider), falling back to
  // prefers-color-scheme when the app hasn't set one explicitly.
  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    if (document.documentElement.classList.contains("dark")) return "dark";
    if (document.documentElement.classList.contains("light")) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const [userOverride, setUserOverride] = useState<"light" | "dark" | null>(null);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setSystemTheme(getSystemTheme());
    // Observe the app-level theme class so the map follows the site-wide
    // dark/light toggle, not just OS preference.
    const observer = new MutationObserver(() => {
      setSystemTheme(getSystemTheme());
      setUserOverride(null);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setSystemTheme(getSystemTheme());
      setUserOverride(null);
    };
    mq.addEventListener("change", handler);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", handler);
    };
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "light" ? "light"
    : theme === "dark" ? "dark"
    : (userOverride ?? systemTheme);

  const mapStyle: StyleSpecification =
    resolvedTheme === "dark" ? MAP_STYLE_PROTOMAPS_DARK : MAP_STYLE_PROTOMAPS;

  const toggleTheme = () => {
    if (theme !== "auto") return;
    setUserOverride((prev) =>
      prev === null
        ? systemTheme === "dark" ? "light" : "dark"
        : prev === "dark" ? "light" : "dark",
    );
  };

  return { resolvedTheme, mapStyle, toggleTheme };
}

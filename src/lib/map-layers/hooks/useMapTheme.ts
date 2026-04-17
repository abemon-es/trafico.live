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
  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const [userOverride, setUserOverride] = useState<"light" | "dark" | null>(null);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setSystemTheme(getSystemTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
      setUserOverride(null);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
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

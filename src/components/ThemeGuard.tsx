"use client";

import { useEffect } from "react";

/**
 * Re-asserts the persisted theme after hydration.
 *
 * The inline <head> script applies the theme before first paint, but React can
 * reconcile the <html> className during hydration (and client navigations can
 * momentarily reset it). This guard reads the saved preference on mount and
 * re-applies it, so dark mode stays applied throughout the session and on every
 * refresh. Default is dark — light only when explicitly saved.
 */
export default function ThemeGuard() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("trailhub-theme");
      // Normalise: persist an explicit value so the state is always deterministic.
      if (saved !== "light" && saved !== "dark") {
        localStorage.setItem("trailhub-theme", "dark");
      }
      document.documentElement.classList.toggle("theme-light", saved === "light");
    } catch {}
  }, []);

  return null;
}

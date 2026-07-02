"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type Theme = "dark" | "light";

interface Ctx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}
const ThemeCtx = createContext<Ctx>({ theme: "dark", toggle: () => {}, setTheme: () => {} });

const KEY = "trailhub-theme";
function applyClass(t: Theme) {
  document.documentElement.classList.toggle("theme-light", t === "light");
}
function currentClass(): Theme {
  return typeof document !== "undefined" && document.documentElement.classList.contains("theme-light") ? "light" : "dark";
}

/**
 * Single source of truth for the light/dark theme.
 *
 * First paint is handled by the inline <head> script (localStorage → system →
 * dark). On mount we sync React state to that class, then — once authenticated —
 * the DB preference wins (per spec). Toggling applies the class instantly and
 * persists to BOTH localStorage and the user profile in the DB.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [theme, setThemeState] = useState<Theme>("dark");

  // Adopt whatever the head script already applied (avoids a flash / mismatch).
  useEffect(() => {
    setThemeState(currentClass());
  }, []);

  // DB preference is authoritative for logged-in users, across devices.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (cancelled || !p) return;
        const pref = p.themePref;
        if (pref === "light" || pref === "dark") {
          applyClass(pref);
          setThemeState(pref);
          try { localStorage.setItem(KEY, pref); } catch {}
        } else {
          // No stored preference yet — persist the current (localStorage/system) choice.
          const cur = currentClass();
          fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ themePref: cur }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status]);

  const setTheme = useCallback((t: Theme) => {
    applyClass(t);
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
    // Persist to DB (silently no-ops with 401 for guests).
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themePref: t }),
    }).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setTheme(currentClass() === "light" ? "dark" : "light");
  }, [setTheme]);

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

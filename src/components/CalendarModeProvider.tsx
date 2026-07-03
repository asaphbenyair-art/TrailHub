"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatDatePref, formatDualDate, type CalendarMode } from "@/lib/hebrewDate";

interface Ctx {
  mode: CalendarMode;
  setSessionMode: (m: CalendarMode) => void; // session-only (panel toggle)
  setProfileMode: (m: CalendarMode) => void; // permanent (profile setting)
}
const CalendarCtx = createContext<Ctx>({ mode: "gregorian", setSessionMode: () => {}, setProfileMode: () => {} });

export function CalendarModeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [mode, setMode] = useState<CalendarMode>("gregorian");

  useEffect(() => {
    // Session override (this tab) wins; otherwise fall back to the saved profile pref.
    try {
      const s = sessionStorage.getItem("trailhub-calendar");
      if (s === "hebrew" || s === "gregorian") { setMode(s); return; }
    } catch {}
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => { if (p?.calendarPref === "hebrew") setMode("hebrew"); })
        .catch(() => {});
    }
  }, [status]);

  const setSessionMode = useCallback((m: CalendarMode) => {
    setMode(m);
    try { sessionStorage.setItem("trailhub-calendar", m); } catch {}
  }, []);

  const setProfileMode = useCallback((m: CalendarMode) => {
    setMode(m);
    try { sessionStorage.setItem("trailhub-calendar", m); } catch {}
    fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarPref: m }),
    }).catch(() => {});
  }, []);

  return <CalendarCtx.Provider value={{ mode, setSessionMode, setProfileMode }}>{children}</CalendarCtx.Provider>;
}

export function useCalendarMode() {
  return useContext(CalendarCtx);
}

/** Returns a formatter that renders a Gregorian-stored date under the active mode. */
export function useDateFmt() {
  const { mode } = useContext(CalendarCtx);
  return useCallback(
    (date: string | Date, opts: { long?: boolean; weekday?: boolean; greg?: Intl.DateTimeFormatOptions } = {}) =>
      formatDatePref(date, mode, opts),
    [mode]
  );
}

/**
 * Returns a formatter showing BOTH the Gregorian and Hebrew date together,
 * ordered by the user's active calendar preference — e.g. "10 יולי (כ׳ תמוז)".
 * Optionally append a clock time.
 */
export function useDualDate() {
  const { mode } = useContext(CalendarCtx);
  return useCallback(
    (date: string | Date, opts: { time?: boolean } = {}) => {
      const base = formatDualDate(date, mode);
      if (opts.time) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) return `${base} · ${d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
      }
      return base;
    },
    [mode]
  );
}

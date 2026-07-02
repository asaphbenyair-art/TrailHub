import { HDate } from "@hebcal/core";

export type CalendarMode = "gregorian" | "hebrew";

// Strip Hebrew niqqud/cantillation so the date reads clean ("שבט" not "שְׁבָט").
function stripNiqqud(s: string): string {
  return s.replace(/[֑-ׇ]/g, "");
}

/** Gregorian date → Hebrew: "י״ד תמוז תשפ״ה" (long) or "י״ד תמוז" (short). */
export function toHebrewDate(date: string | Date, opts: { long?: boolean } = {}): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const parts = new HDate(d).renderGematriya().split(" "); // [day, month, year]
  const use = opts.long ? parts : parts.slice(0, -1);       // drop year for short form
  return stripNiqqud(use.join(" "));
}

/** Hebrew weekday label ("יום ה׳") — same day-of-week in both calendars. */
export function weekdayHe(date: string | Date): string {
  return new Date(date).toLocaleDateString("he-IL", { weekday: "short" });
}

/**
 * Format a (Gregorian-stored) date for display under the chosen calendar mode.
 * - gregorian: standard he-IL formatting via `greg` Intl options.
 * - hebrew: Hebrew date (short/long), optionally prefixed with the weekday.
 */
export function formatDatePref(
  date: string | Date,
  mode: CalendarMode,
  opts: { long?: boolean; weekday?: boolean; greg?: Intl.DateTimeFormatOptions } = {}
): string {
  if (!date) return "";
  if (mode === "hebrew") {
    const heb = toHebrewDate(date, { long: opts.long });
    return opts.weekday ? `${weekdayHe(date)}, ${heb}` : heb;
  }
  return new Date(date).toLocaleDateString("he-IL", opts.greg ?? { day: "numeric", month: "short" });
}

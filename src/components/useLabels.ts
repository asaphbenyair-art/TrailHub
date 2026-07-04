"use client";

import { useLocale } from "@/components/LanguageProvider";
import {
  REGION_EN, DIFFICULTY_HE, DIFFICULTY_EN, STATUS_HE, STATUS_EN,
  TRIP_TYPE_HE, TRIP_TYPE_EN, ROUTE_TYPE_HE, ROUTE_TYPE_EN,
} from "@/lib/labels";
import { TAG_LABEL, TAG_LABEL_EN } from "@/lib/tripTags";

/**
 * Locale-aware display labels for enum/coded/Hebrew-stored values so trip cards,
 * badges and filters translate with the UI language. Hebrew is the source, so in
 * Hebrew mode most pass through unchanged; English mode maps to English.
 */
export function useLabels() {
  const { locale } = useLocale();
  const en = locale === "en";
  return {
    en,
    dir: (en ? "ltr" : "rtl") as "ltr" | "rtl",
    region: (r?: string | null) => (r ? (en ? REGION_EN[r] ?? r : r) : ""),
    difficulty: (d?: string | null) => (d ? (en ? DIFFICULTY_EN[d] ?? d : DIFFICULTY_HE[d] ?? d) : ""),
    status: (s?: string | null) => (s ? (en ? STATUS_EN[s] ?? s : STATUS_HE[s] ?? s) : ""),
    tripType: (t?: string | null) => (t ? (en ? TRIP_TYPE_EN[t] ?? t : TRIP_TYPE_HE[t] ?? t) : ""),
    routeType: (t?: string | null) => (t ? (en ? ROUTE_TYPE_EN[t] ?? t : ROUTE_TYPE_HE[t] ?? t) : ""),
    tag: (v?: string | null) => (v ? (en ? TAG_LABEL_EN[v] ?? v : TAG_LABEL[v] ?? v) : ""),
  };
}

/** Just the current text direction, for flipping hardcoded dir="rtl" containers. */
export function useDir(): "ltr" | "rtl" {
  const { locale } = useLocale();
  return locale === "en" ? "ltr" : "rtl";
}

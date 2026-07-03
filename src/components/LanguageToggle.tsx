"use client";

import { useLocale } from "@/components/LanguageProvider";

/** עב / EN segmented toggle for the top nav. Switches UI language + RTL/LTR instantly. */
export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`inline-flex items-center rounded-full p-0.5 text-[11px] font-semibold shrink-0 ${className}`}
      style={{ background: "var(--surface-2)" }} dir="ltr">
      {(["he", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLocale(l)} aria-label={l === "he" ? "עברית" : "English"}
          className="px-2 py-1 rounded-full transition-colors"
          style={locale === l ? { background: "#1A6B4A", color: "#fff" } : { color: "var(--fg-muted)" }}>
          {l === "he" ? "עב" : "EN"}
        </button>
      ))}
    </div>
  );
}

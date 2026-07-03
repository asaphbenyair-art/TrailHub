"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/LanguageProvider";

/**
 * Small "Translate" affordance shown next to USER-GENERATED content (trip
 * descriptions, Q&A, reviews). It translates on demand into the active UI
 * language — the original content is never modified or stored translated.
 * Renders `children` (the original) until translated; toggles back on click.
 */
export default function TranslateButton({ text, className = "", children }: { text: string; className?: string; children: React.ReactNode }) {
  const t = useTranslations("common");
  const { locale } = useLocale();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (showing) { setShowing(false); return; }
    if (translated) { setShowing(true); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, to: locale }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.translated) { setTranslated(d.translated); setShowing(true); }
    } finally { setBusy(false); }
  }

  if (!text?.trim()) return <>{children}</>;

  return (
    <span className={className}>
      {showing && translated ? (
        <>
          <span>{translated}</span>
          <span className="block text-[10px] text-fg-faint mt-0.5">{t("translatedFrom")}</span>
        </>
      ) : (
        children
      )}
      <button type="button" onClick={toggle} disabled={busy}
        className="inline-flex items-center gap-1 text-[11px] text-[#185FA5] hover:underline mt-1 disabled:opacity-50">
        <Languages size={12} />
        {busy ? t("translating") : showing ? t("showOriginal") : t("translate")}
      </button>
    </span>
  );
}

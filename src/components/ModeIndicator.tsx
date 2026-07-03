"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Backpack } from "lucide-react";

/**
 * Consistent guide/hiker mode control: a colored badge showing the CURRENT mode
 * + an identical-looking switch button, used the same way in both directions.
 * Only rendered for users who are guides (others have no mode to switch).
 */
export default function ModeIndicator({ mode }: { mode?: "guide" | "hiker" }) {
  const router = useRouter();
  const [isGuide, setIsGuide] = useState(false);
  const [detected, setDetected] = useState<"guide" | "hiker" | null>(null);

  useEffect(() => {
    fetch("/api/me/mode").then((r) => r.json()).then((d) => {
      setIsGuide(!!d.isGuide);
      setDetected(d.mode === "guide" ? "guide" : "hiker");
    }).catch(() => {});
  }, []);

  if (!isGuide) return null;
  const cur = mode ?? detected ?? "hiker";
  const isG = cur === "guide";
  const target = isG ? "hiker" : "guide";

  async function switchMode() {
    await fetch("/api/me/mode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: target }),
    }).catch(() => {});
    router.push(target === "guide" ? "/guide/dashboard" : "/trips");
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Current-mode badge */}
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
        style={isG ? { background: "#D6EDE3", color: "#0F5038" } : { background: "#EEF5FC", color: "#185FA5" }}>
        {isG ? <Compass size={11} /> : <Backpack size={11} />}
        {isG ? "מצב מדריך" : "מצב מטייל"}
      </span>
      {/* Switch button — identical style in both directions */}
      <button type="button" onClick={switchMode}
        className="text-[11px] text-fg-muted border border-border rounded-full px-2.5 py-1 hover:bg-surface-2 whitespace-nowrap">
        ↪ {target === "guide" ? "למצב מדריך" : "למצב מטייל"}
      </button>
    </div>
  );
}

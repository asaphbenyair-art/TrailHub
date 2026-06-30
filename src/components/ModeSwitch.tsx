"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Toggle between guide and hiker views. Only shown to users who are guides.
// `current` is the mode of the page this is placed on.
export default function ModeSwitch({ current }: { current: "guide" | "hiker" }) {
  const router = useRouter();
  const [isGuide, setIsGuide] = useState(false);

  useEffect(() => {
    fetch("/api/me/mode").then((r) => r.json()).then((d) => setIsGuide(!!d.isGuide)).catch(() => {});
  }, []);

  if (!isGuide) return null;
  const target = current === "guide" ? "hiker" : "guide";

  async function switchMode() {
    await fetch("/api/me/mode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: target }),
    }).catch(() => {});
    router.push(target === "guide" ? "/guide/dashboard" : "/trips");
  }

  return (
    <button type="button" onClick={switchMode}
      className="text-[11px] text-[#185FA5] border border-[#185FA5]/30 rounded-full px-2.5 py-1 hover:bg-[#EEF5FC] whitespace-nowrap">
      {target === "guide" ? "↪ למצב מדריך" : "↪ למצב מטייל"}
    </button>
  );
}

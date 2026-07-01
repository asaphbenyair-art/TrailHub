"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/** Toggles between the default dark mode and light mode, persisted to localStorage. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("theme-light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("theme-light", next);
    try {
      localStorage.setItem("trailhub-theme", next ? "light" : "dark");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "מצב כהה" : "מצב בהיר"}
      className={`w-9 h-9 flex items-center justify-center rounded-full border border-border ${className}`}
      style={{ color: "var(--fg-muted)" }}
    >
      {light ? <Moon size={17} strokeWidth={1.8} /> : <Sun size={17} strokeWidth={1.8} />}
    </button>
  );
}

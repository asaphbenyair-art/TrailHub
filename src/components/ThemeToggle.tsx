"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/** Round icon button that toggles light/dark. Persists via ThemeProvider (localStorage + DB). */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const light = theme === "light";

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

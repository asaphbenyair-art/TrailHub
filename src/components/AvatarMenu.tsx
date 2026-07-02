"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Settings, LogOut, Repeat } from "lucide-react";

const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];
function avatarColor(name: string | null) {
  if (!name) return "#777";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

/** Avatar in the top bar → dropdown: name/email, guide/hiker toggle, settings, sign out. */
export default function AvatarMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hiker" | "guide">("hiker");
  const [isGuide, setIsGuide] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/me/mode")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setMode(d.mode === "guide" ? "guide" : "hiker"); setIsGuide(!!d.isGuide); } })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!session?.user) {
    return (
      <Link href="/auth/login" className="text-xs text-[#1A6B4A] border border-[#1A6B4A] rounded-full px-2.5 py-1 whitespace-nowrap">
        כניסה
      </Link>
    );
  }

  const name = session.user.name ?? null;
  const email = session.user.email ?? "";
  const image = session.user.image ?? null;
  const target = mode === "guide" ? "hiker" : "guide";

  async function switchMode() {
    setOpen(false);
    await fetch("/api/me/mode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: target }),
    }).catch(() => {});
    router.push(target === "guide" ? "/guide/dashboard" : "/trips");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="תפריט משתמש"
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
        style={{ background: image ? undefined : avatarColor(name) }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : initials(name)}
      </button>

      {open && (
        <div dir="rtl" className="absolute left-0 top-10 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-[70] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-900 truncate">{name ?? "משתמש"}</div>
            <div className="text-xs text-gray-400 truncate" dir="ltr">{email}</div>
          </div>
          <div className="py-1">
            {isGuide && (
              <button type="button" onClick={switchMode}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-right">
                <Repeat size={16} className="text-[#185FA5]" />
                {target === "guide" ? "עבור למצב מדריך" : "עבור למצב מטייל"}
              </button>
            )}
            <button type="button" onClick={() => { setOpen(false); router.push("/profile"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-right">
              <Settings size={16} className="text-gray-400" /> הגדרות
            </button>
            <button type="button" onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#C0392B] hover:bg-red-50 text-right">
              <LogOut size={16} /> התנתק
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

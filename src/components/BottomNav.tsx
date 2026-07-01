"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Compass, Backpack, Bell, User } from "lucide-react";

// Bottom nav shows only on the primary hiker surfaces — never on detail,
// register, guide, auth or admin routes (those have their own chrome / CTAs).
const ALLOWED = new Set(["/", "/trips", "/my-trips", "/notifications", "/profile"]);

const TABS = [
  { href: "/trips", label: "חיפוש", Icon: Compass },
  { href: "/my-trips", label: "הטיולים שלי", Icon: Backpack },
  { href: "/notifications", label: "התראות", Icon: Bell },
  { href: "/profile", label: "פרופיל", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((n) => Array.isArray(n) && setUnread(n.filter((x: { read: boolean }) => !x.read).length))
      .catch(() => {});
  }, [status, pathname]);

  if (!pathname || !ALLOWED.has(pathname) || status !== "authenticated") return null;

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-[480px] mx-auto flex items-stretch">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            href === "/trips"
              ? pathname === "/trips" || pathname === "/"
              : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative"
            >
              <span className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.7}
                  style={{ color: active ? "var(--accent)" : "var(--fg-muted)" }}
                />
                {href === "/notifications" && unread > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {active && (
                <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

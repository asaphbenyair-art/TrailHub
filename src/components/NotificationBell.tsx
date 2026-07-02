"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  tripId: string | null;
  link: string | null;
  trip: { id: string; title: string } | null;
}

export default function NotificationBell() {
  const router = useRouter();
  const { data: session } = useSession();
  const meId = (session?.user as { id?: string })?.id;
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function openNotif(n: Notification) {
    markRead(n.id);
    setOpen(false);
    const dest = n.link ?? (n.tripId ? `/trips/${n.tripId}` : null);
    if (dest) router.push(dest);
  }

  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    fetchNotifs();
  }, []);

  // Live updates: Supabase Realtime when configured, else polling + on focus.
  useLiveNotifications(meId, fetchNotifs);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function fetchNotifs() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifs(await res.json());
    } catch {}
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  const typeIcon: Record<string, string> = {
    TRIP_UPDATED: "📝",
    TRIP_CANCELLED: "❌",
    QUESTION_ANSWERED: "💬",
    NEW_MESSAGE: "✉️",
  };

  function relativeTime(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`;
    return `לפני ${Math.floor(diff / 86400)} ימים`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) fetchNotifs(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
        aria-label="התראות"
      >
        <svg className="w-5 h-5 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 w-80 bg-surface rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm text-fg">התראות</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#1A6B4A] hover:underline">
                סמן הכל כנקרא
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-fg-faint">אין התראות</div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-surface-2 transition-colors ${!n.read ? "bg-accent/10" : ""}`}
                  onClick={() => openNotif(n)}
                >
                  <span className="text-lg mt-0.5 shrink-0">{typeIcon[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-fg leading-snug">{n.title}</p>
                      <span className="text-[10px] text-fg-faint shrink-0">{relativeTime(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">{n.body}</p>
                    {(n.link || n.tripId) && (
                      <span className="text-[10px] text-[#1A6B4A] mt-1 inline-block">פתח ←</span>
                    )}
                  </div>
                  {!n.read && (
                    <button type="button" title="סמן כנקרא"
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center border border-border text-[#1A6B4A] hover:bg-[#D6EDE3] self-start text-xs">
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

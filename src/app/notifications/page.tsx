"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, XCircle, MessageCircle, Mail, Bell, ChevronRight, Check } from "lucide-react";
import AvatarMenu from "@/components/AvatarMenu";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  tripId: string | null;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  TRIP_UPDATED: FileText,
  TRIP_CANCELLED: XCircle,
  QUESTION_ANSWERED: MessageCircle,
  NEW_MESSAGE: Mail,
};

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "עכשיו";
  if (d < 3600) return `לפני ${Math.floor(d / 60)} דק׳`;
  if (d < 86400) return `לפני ${Math.floor(d / 3600)} שע׳`;
  return `לפני ${Math.floor(d / 86400)} ימים`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/auth/login?callbackUrl=/notifications"); return; }
    if (status !== "authenticated") return;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((n) => setNotifs(Array.isArray(n) ? n : []))
      .finally(() => setLoading(false));
  }, [status, router]);

  const unread = notifs.filter((n) => !n.read).length;

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  }
  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg pb-24">
      <div className="max-w-[480px] mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-3xl text-fg">התראות</h1>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button type="button" onClick={markAll}
                className="text-xs text-accent flex items-center gap-1">
                <Check size={13} /> סמן הכל כנקרא
              </button>
            )}
            <AvatarMenu />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-fg-faint text-sm">טוען…</div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-20">
            <Bell size={40} className="mx-auto text-fg-faint mb-3" strokeWidth={1.4} />
            <div className="text-fg-muted text-sm">אין התראות</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifs.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <div
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  className="flex gap-3 rounded-2xl p-3.5 cursor-pointer border transition-colors"
                  style={{
                    background: n.read ? "var(--surface)" : "var(--surface-2)",
                    borderColor: n.read ? "var(--border)" : "var(--accent)",
                  }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--bg)" }}>
                    <Icon size={17} style={{ color: "var(--accent)" }} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-fg leading-snug">{n.title}</p>
                      <span className="text-[10px] text-fg-faint shrink-0">{relTime(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{n.body}</p>
                    {n.tripId && (
                      <Link href={`/trips/${n.tripId}`} onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-accent mt-1.5 inline-flex items-center gap-0.5">
                        לטיול <ChevronRight size={12} className="rotate-180" />
                      </Link>
                    )}
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

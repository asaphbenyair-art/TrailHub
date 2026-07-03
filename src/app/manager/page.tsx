"use client";

import { useEffect, useState } from "react";
import Brand from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { coverImages } from "@/lib/tripImage";
import AvatarMenu from "@/components/AvatarMenu";
import { useDualDate } from "@/components/CalendarModeProvider";

const STATUS_LABEL: Record<string, { t: string; bg: string; c: string }> = {
  OPEN: { t: "פתוח", bg: "#D6EDE3", c: "#0F5038" },
  FULL: { t: "מלא", bg: "#FADBD8", c: "#791F1F" },
  DRAFT: { t: "טיוטה", bg: "#f3f4f6", c: "#555" },
  PENDING_REVIEW: { t: "ממתין לאישור", bg: "#FEF9EC", c: "#92400E" },
  POSTPONED: { t: "נדחה", bg: "#FDF3DC", c: "#7A5010" },
  CANCELLED: { t: "בוטל", bg: "#f3f4f6", c: "#999" },
  COMPLETED: { t: "הושלם", bg: "#EEF5FC", c: "#185FA5" },
};

interface Registrant { id: string; status: string; paymentStatus: string; user: { name: string | null; email: string } }
interface MTrip {
  id: string; title: string; region: string; date: string; startTime: string; status: string;
  maxSpots: number; spotsBooked: number; images: string[]; tripType?: string;
  guide: { user: { name: string | null } };
  _count: { registrations: number };
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const dd = useDualDate();
  const [trips, setTrips] = useState<MTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [regs, setRegs] = useState<Record<string, Registrant[]>>({});

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/auth/login?callbackUrl=/manager"); return; }
    if (status !== "authenticated") return;
    const role = (session?.user as { role?: string })?.role;
    if (role === "GUIDE") { router.replace("/guide/dashboard"); return; }
    fetch("/api/manager/trips", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTrips(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [status, session, router]);

  async function toggle(tripId: string) {
    if (expanded === tripId) { setExpanded(null); return; }
    setExpanded(tripId);
    if (!regs[tripId]) {
      const d = await fetch(`/api/guide/trips/${tripId}/registrants`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (d?.registrations) setRegs((m) => ({ ...m, [tripId]: d.registrations }));
    }
  }

  const REG_STATUS: Record<string, string> = { CONFIRMED: "✓ רשום", WAITLIST: "⏰ המתנה", PENDING: "👀 מתעניין", CANCELLED: "✕ בוטל" };

  return (
    <div dir="rtl" className="min-h-screen bg-bg">
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2"><Brand variant="word" href="/" /><ThemeToggle />
            <LanguageToggle /></span>
          <span className="text-xs bg-[#EEF5FC] text-[#185FA5] px-2 py-0.5 rounded-full font-semibold">מנהל טיול · צפייה בלבד</span>
        </div>
        <AvatarMenu />
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-lg font-bold text-fg mb-1">הטיולים שאני מנהל</h1>
        <p className="text-xs text-fg-muted mb-4">גישת צפייה לכל מה שהמדריך רואה — רשומים, קיבולת וסטטוס. ללא הרשאת עריכה.</p>

        {loading ? (
          <div className="text-center py-16 text-fg-faint text-sm">טוען…</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 text-fg-faint text-sm">עדיין לא הוקצית לניהול אף טיול. מדריך יכול להוסיף אותך כמנהל טיול.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {trips.map((t) => {
              const st = STATUS_LABEL[t.status] ?? { t: t.status, bg: "#eee", c: "#555" };
              const occ = t.maxSpots > 0 ? t.spotsBooked / t.maxSpots : 0;
              const isOpen = expanded === t.id;
              return (
                <div key={t.id} className="bg-surface rounded-2xl border border-border overflow-hidden">
                  <div className="flex">
                    <div className="w-24 shrink-0" style={{ minHeight: 96 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverImages(t.images, t.id, { region: t.region, title: t.title })[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold text-fg truncate">{t.title}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ background: st.bg, color: st.c }}>{st.t}</span>
                      </div>
                      <div className="text-[11px] text-fg-muted mt-0.5">
                        👤 {t.guide?.user?.name ?? "מדריך"} · 📍 {t.region}
                        {t.tripType !== "SELF_GUIDED" && t.date ? ` · 📅 ${dd(t.date)}` : ""}
                      </div>
                      {t.tripType !== "SELF_GUIDED" && (
                        <div className="mt-2">
                          <div className="h-[3px] bg-surface-2 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(occ * 100, 100)}%`, background: occ >= 1 ? "#C0392B" : "#1A6B4A" }} />
                          </div>
                          <div className="text-[10px] text-fg-faint mt-1">{t.spotsBooked}/{t.maxSpots} רשומים · {t._count.registrations} סה״כ פניות</div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => toggle(t.id)}
                          className="text-[11px] text-[#185FA5] border border-[#185FA5]/30 rounded-full px-2.5 py-1">
                          {isOpen ? "הסתר רשומים" : "צפה ברשומים"}
                        </button>
                        <Link href={`/trips/${t.id}`} className="text-[11px] text-fg-muted border border-border rounded-full px-2.5 py-1">עמוד הטיול</Link>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border px-3 py-2 bg-surface-2/60">
                      {!regs[t.id] ? (
                        <div className="text-xs text-fg-faint py-2">טוען רשומים…</div>
                      ) : regs[t.id].length === 0 ? (
                        <div className="text-xs text-fg-faint py-2">אין רשומים עדיין</div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {regs[t.id].map((r) => (
                            <div key={r.id} className="flex items-center justify-between text-xs py-1">
                              <span className="text-fg">{r.user.name ?? r.user.email}</span>
                              <span className="text-fg-faint">{REG_STATUS[r.status] ?? r.status}{r.paymentStatus === "PAID" ? " · שולם" : ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

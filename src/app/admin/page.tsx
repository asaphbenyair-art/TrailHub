"use client";

import { useEffect, useState } from "react";
import Brand from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:          { bg: "#F3F4F6", color: "#6B7280", label: "טיוטה" },
  PENDING_REVIEW: { bg: "#FEF3C7", color: "#92400E", label: "ממתין לאישור" },
  REJECTED:       { bg: "#FEE2E2", color: "#991B1B", label: "נדחה" },
  OPEN:           { bg: "#D6EDE3", color: "#0F5038", label: "פתוח" },
  FULL:           { bg: "#DBEAFE", color: "#1E40AF", label: "מלא" },
  CANCELLED:      { bg: "#F3F4F6", color: "#9CA3AF", label: "בוטל" },
  COMPLETED:      { bg: "#E5E7EB", color: "#374151", label: "הסתיים" },
};

interface PendingTrip {
  id: string;
  title: string;
  region: string;
  status: string;
  date: string;
  price: number;
  approvalNote: string | null;
  guide: {
    isVerified: boolean;
    user: { name: string | null; email: string };
  };
}

interface PendingGuide {
  id: string;
  isVerified: boolean;
  user: { id: string; name: string | null; email: string };
  _count: { trips: number };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "2-digit" });
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const [tab, setTab] = useState<"trips" | "guides">("trips");
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [unverifiedGuides, setUnverifiedGuides] = useState<PendingGuide[]>([]);
  const [loading, setLoading] = useState(true);

  // Trip review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && role !== "ADMIN") router.push("/");
  }, [status, role, router]);

  useEffect(() => {
    if (role !== "ADMIN") return;
    setLoading(true);
    Promise.all([
      fetch("/api/admin/trips?status=PENDING_REVIEW").then((r) => r.json()),
      fetch("/api/admin/guides?unverified=1").then((r) => r.json()),
    ]).then(([trips, guides]) => {
      setPendingTrips(Array.isArray(trips) ? trips : []);
      setUnverifiedGuides(Array.isArray(guides) ? guides : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [role]);

  async function approveTrip(tripId: string) {
    setSaving(true);
    await fetch("/api/admin/trips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, action: "approve" }),
    });
    setPendingTrips((prev) => prev.filter((t) => t.id !== tripId));
    setSaving(false);
    setReviewingId(null);
  }

  async function rejectTrip(tripId: string) {
    setSaving(true);
    await fetch("/api/admin/trips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, action: "reject", note: rejectNote }),
    });
    setPendingTrips((prev) => prev.filter((t) => t.id !== tripId));
    setSaving(false);
    setReviewingId(null);
    setRejectNote("");
  }

  async function toggleVerifyGuide(guide: PendingGuide) {
    setSaving(true);
    await fetch("/api/admin/guides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guideId: guide.id, isVerified: !guide.isVerified }),
    });
    setUnverifiedGuides((prev) =>
      prev.map((g) => g.id === guide.id ? { ...g, isVerified: !g.isVerified } : g)
    );
    setSaving(false);
  }

  if (status === "loading" || loading) {
    return <div dir="rtl" className="min-h-screen bg-bg flex items-center justify-center text-fg-faint text-sm">טוען...</div>;
  }

  const TABS = [
    { key: "trips", label: "טיולים לאישור", count: pendingTrips.length },
    { key: "guides", label: "מדריכים", count: unverifiedGuides.filter((g) => !g.isVerified).length },
  ] as const;

  return (
    <div dir="rtl" className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2"><Brand href="/" /><ThemeToggle /></span>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
          <Link href="/admin/moderation" className="text-xs text-[#185FA5] border border-[#185FA5]/30 rounded-full px-2.5 py-0.5 hover:bg-[#EEF5FC]">ניהול ותלונות</Link>
        </div>
        <NotificationBell />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-px bg-surface-2 border-b border-border">
        {[
          { label: "ממתינים לאישור", val: pendingTrips.length, color: "#92400E", bg: "#FEF9EC" },
          { label: "מדריכים לא מאושרים", val: unverifiedGuides.filter((g) => !g.isVerified).length, color: "#1E40AF", bg: "#EFF6FF" },
        ].map((s) => (
          <div key={s.label} className="py-3 px-4 text-center" style={{ background: s.bg }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] text-fg-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key ? "border-[#1A6B4A] text-[#1A6B4A]" : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full min-w-[18px] h-4.5 px-1 text-[10px] font-bold flex items-center justify-center ${
                tab === t.key ? "bg-[#1A6B4A] text-white" : "bg-surface-2 text-fg-muted"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-3">

        {/* ── Trips pending review ── */}
        {tab === "trips" && (
          <>
            {pendingTrips.length === 0 && (
              <div className="py-16 text-center text-sm text-fg-faint bg-surface rounded-2xl">
                ✓ אין טיולים הממתינים לאישור
              </div>
            )}
            {pendingTrips.map((trip) => {
              const isReviewing = reviewingId === trip.id;
              return (
                <div key={trip.id} className="bg-surface rounded-2xl border border-border overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link href={`/trips/${trip.id}`} className="text-sm font-semibold text-fg hover:underline leading-snug">
                        {trip.title}
                      </Link>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: STATUS_BADGE[trip.status]?.bg, color: STATUS_BADGE[trip.status]?.color }}>
                        {STATUS_BADGE[trip.status]?.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-fg-muted mb-2">
                      <span>👤 {trip.guide.user.name ?? trip.guide.user.email}</span>
                      {trip.guide.isVerified && <span className="text-[#1A6B4A]">✓ מאושר</span>}
                      <span>📅 {formatDate(trip.date)}</span>
                      <span>📍 {trip.region}</span>
                      <span>₪{trip.price}</span>
                    </div>

                    {!isReviewing ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => approveTrip(trip.id)} disabled={saving}
                          className="flex-1 py-1.5 bg-[#1A6B4A] text-white text-xs rounded-full font-semibold disabled:opacity-50">
                          ✓ אשר לפרסום
                        </button>
                        <button type="button" onClick={() => setReviewingId(trip.id)}
                          className="flex-1 py-1.5 bg-surface-2 text-red-600 border border-red-200 text-xs rounded-full font-semibold">
                          ✕ דחה
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <textarea
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="סיבת הדחייה (תישלח למדריך)..."
                          rows={2}
                          className="w-full border border-border rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-red-400 mb-2"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => rejectTrip(trip.id)} disabled={saving}
                            className="flex-1 py-1.5 bg-red-500 text-white text-xs rounded-full font-semibold disabled:opacity-50">
                            {saving ? "..." : "שלח דחייה"}
                          </button>
                          <button type="button" onClick={() => { setReviewingId(null); setRejectNote(""); }}
                            className="px-4 py-1.5 border border-border text-fg-muted text-xs rounded-full">
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Guides ── */}
        {tab === "guides" && (
          <>
            {unverifiedGuides.length === 0 && (
              <div className="py-16 text-center text-sm text-fg-faint bg-surface rounded-2xl">אין מדריכים</div>
            )}
            {unverifiedGuides.map((guide) => (
              <div key={guide.id} className="bg-surface rounded-2xl border border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-fg">{guide.user.name ?? "—"}</div>
                    <div className="text-xs text-fg-muted">{guide.user.email}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-fg-faint">
                      <span>{guide._count.trips} טיולים</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVerifyGuide(guide)}
                    disabled={saving}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      guide.isVerified
                        ? "bg-surface-2 text-fg-muted hover:bg-surface-2 hover:text-red-600"
                        : "bg-[#D6EDE3] text-[#0F5038] hover:bg-[#1A6B4A] hover:text-white"
                    }`}
                  >
                    {guide.isVerified ? "✓ מאושר — ביטול" : "אשר מדריך"}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}

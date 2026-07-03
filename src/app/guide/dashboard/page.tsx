"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import ModeIndicator from "@/components/ModeIndicator";
import AvatarMenu from "@/components/AvatarMenu";
import { googleCalendarUrl } from "@/lib/calendar";
import { coverImages } from "@/lib/tripImage";
import { useDateFmt } from "@/components/CalendarModeProvider";
import Brand from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import RegistrantsModal from "@/components/RegistrantsModal";
import BroadcastModal from "@/components/BroadcastModal";

const DIFF_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  EASY: { bg: "#EAF3DE", color: "#27500A", label: "קל" },
  MEDIUM: { bg: "#FAEEDA", color: "#633806", label: "בינוני" },
  HARD: { bg: "#FADBD8", color: "#791F1F", label: "קשה" },
  EXTREME: { bg: "#E8D0D0", color: "#4A0F0F", label: "קיצוני" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:          { bg: "#F3F4F6", color: "#6B7280", label: "טיוטה" },
  PENDING_REVIEW: { bg: "#FEF3C7", color: "#92400E", label: "ממתין לאישור" },
  REJECTED:       { bg: "#FEE2E2", color: "#991B1B", label: "נדחה" },
  OPEN:           { bg: "#D6EDE3", color: "#0F5038", label: "פתוח" },
  FULL:           { bg: "#FEF3C7", color: "#92400E", label: "מלא" },
  POSTPONED:      { bg: "#FEF3C7", color: "#7A5010", label: "נדחה" },
  CANCELLED:      { bg: "#FEE2E2", color: "#991B1B", label: "בוטל" },
  COMPLETED:      { bg: "#DBEAFE", color: "#1E40AF", label: "הסתיים" },
};

interface Trip {
  id: string;
  title: string;
  region: string;
  difficulty: string;
  status: string;
  date: string;
  startTime: string;
  durationMin: number;
  distanceKm: number;
  price: number;
  maxSpots: number;
  spotsBooked: number;
  images: string[];
  approvalNote: string | null;
  unmatchedSeekers?: number;
  visibility?: string;
  tripType?: string;
}

interface SelfGuidedTrip {
  id: string; title: string; region: string; images: string[]; price: number; status: string;
  difficulty?: string; visibility?: string; accessWindowDays?: number | null;
  purchaseCount: number; revenue: number; reviewCount: number;
}

interface Guide {
  rating: number;
  reviewCount: number;
}

function formatDuration(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}:${String(m).padStart(2, "0")} שע'` : `${h} שע'`;
}

export default function GuideDashboard() {
  const router = useRouter();
  const dfmt = useDateFmt();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [tab, setTab] = useState<"trips" | "selfguided" | "stats">("trips");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selfGuided, setSelfGuided] = useState<SelfGuidedTrip[]>([]);
  const [registrantsModal, setRegistrantsModal] = useState<{ id: string; title: string } | null>(null);
  const [broadcastModal, setBroadcastModal] = useState<{ id: string; title: string } | null>(null);

  function copyLink(tripId: string) {
    const url = `${window.location.origin}/trips/${tripId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(tripId);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  }

  const loadTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/guide/trips");
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data?.trips)) {
        const now = new Date();
        const regular = data.trips.filter((t: Trip) => t.tripType !== "SELF_GUIDED");
        const upcoming = regular.filter((t: Trip) => new Date(t.date) >= now);
        const past = regular.filter((t: Trip) => new Date(t.date) < now);
        setTrips([...upcoming, ...past]);
        if (data.guide) setGuide(data.guide);
      }
      await fetch("/api/guide/self-guided").then((r) => r.ok ? r.json() : []).then((d) => setSelfGuided(Array.isArray(d) ? d : [])).catch(() => {});
    } catch {
      // Never leave the view stuck on the loader if a request fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);
  useEffect(() => { fetch("/api/me/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "guide" }) }).catch(() => {}); }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/guide/trips/${id}`, { method: "DELETE" });
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
    setConfirmId(null);
  }

  const now = new Date();

  return (
    <div dir="rtl" className="min-h-screen bg-bg p-4 flex justify-center">
      <div className="w-full max-w-5xl flex flex-col gap-3">

        {/* Header */}
        <div className="bg-surface rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Brand variant="word" href="/guide/dashboard" />
            <ThemeToggle className="flex-shrink-0" />
            <LanguageToggle />
            {guide && (
              <span className="text-xs text-fg-faint">
                ★{guide.rating > 0 ? guide.rating.toFixed(1) : "—"} · {guide.reviewCount} ביקורות
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ModeIndicator mode="guide" />
            <NotificationBell />
            <Link
              href={tab === "selfguided" ? "/guide/trips/new?type=self_guided" : "/guide/trips/new"}
              className="bg-[#1A6B4A] text-white text-sm rounded-full px-4 py-2 font-medium hover:bg-[#155a3e] transition-colors whitespace-nowrap"
            >
              {tab === "selfguided" ? "+ טיול עצמאי" : "+ טיול חדש"}
            </Link>
            <AvatarMenu />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-surface rounded-xl overflow-hidden flex shadow-sm">
          {([["trips", "הטיולים שלי"], ["selfguided", "עצמאיים"], ["stats", "סטטיסטיקות"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === k ? "border-[#1A6B4A] text-[#1A6B4A]" : "border-transparent text-fg-faint"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-surface rounded-xl p-10 text-center text-fg-faint text-sm shadow-sm">טוען...</div>
        )}

        {/* Self-guided tab */}
        {!loading && tab === "selfguided" && (
          <div className="flex flex-col gap-3">
            {selfGuided.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-border p-10 text-center shadow-sm text-fg-muted text-sm">עוד אין טיולים עצמאיים</div>
            ) : selfGuided.map((t) => {
              const diffBadge = t.difficulty ? DIFF_BADGE[t.difficulty] : null;
              const statusBadge = STATUS_BADGE[t.status] ?? STATUS_BADGE.DRAFT;
              return (
              <div key={t.id} className="bg-surface rounded-2xl overflow-hidden border border-border shadow-sm">
                {/* Image — same template as regular guided cards */}
                <div className="relative cursor-pointer" style={{ height: 150 }} onClick={() => router.push(`/trips/${t.id}`)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImages(t.images, t.id, { region: t.region, title: t.title })[0]} alt={t.title} className="w-full h-full object-cover" />

                  <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                      {statusBadge.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ background: "rgba(61,143,95,0.92)" }}>🎒 עצמאי</span>
                    {(t.status === "OPEN" || t.status === "FULL") && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: t.visibility === "PRIVATE" ? "rgba(0,0,0,0.6)" : "rgba(44,95,138,0.9)", color: "#fff" }}>
                        {t.visibility === "PRIVATE" ? "🔒 פרטי" : "🌍 ציבורי"}
                      </span>
                    )}
                    {diffBadge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: diffBadge.bg, color: diffBadge.color }}>
                        {diffBadge.label}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 left-2.5 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => router.push(`/guide/trips/${t.id}/edit`)}
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full px-2.5 py-1 text-[11px] transition-colors">✏️ עריכה</button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}>
                    <div className="text-sm font-medium text-white leading-snug">{t.title}</div>
                  </div>
                </div>

                {/* Card body — self-guided meta (no capacity/date; no revenue/purchase boxes) */}
                <div className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mb-2">
                    <span className="text-[11px] text-fg-muted">📍 {t.region}</span>
                    <span className="text-[11px] text-fg-muted">🔓 גישה ל-{t.accessWindowDays ?? 30} ימים</span>
                    {t.reviewCount > 0 && <span className="text-[11px] text-fg-muted">⭐ {t.reviewCount} ביקורות</span>}
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm font-medium text-fg">
                      {t.price === 0
                        ? <span className="px-2 py-0.5 rounded-full text-[13px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>חינם</span>
                        : <>₪{t.price.toLocaleString("he-IL")}<span className="text-xs font-normal text-fg-faint mr-1">לחבילה</span></>}
                    </span>
                  </div>

                  {(t.status === "DRAFT" || t.status === "PENDING_REVIEW") && (
                    <Link href={`/guide/trips/${t.id}/edit`}
                      className="block text-center w-full mt-2 py-1.5 text-xs font-semibold rounded-full border-2 border-dashed border-[#1A6B4A] text-[#1A6B4A] hover:bg-[#D6EDE3]">
                      ✏️ המשך עריכה כדי לפרסם
                    </Link>
                  )}

                  <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-border">
                    <Link href={`/guide/trips/${t.id}/edit`} className="flex-1 text-center text-[11px] text-fg-muted border border-border rounded-lg py-1.5 hover:bg-surface-2">✏️ עריכה</Link>
                    <Link href={`/trips/${t.id}`} className="flex-1 text-center text-[11px] text-[#1A6B4A] border border-[#1A6B4A]/25 bg-[#F0FAF5] rounded-lg py-1.5 hover:bg-[#D6EDE3]">👁 תצוגה</Link>
                  </div>
                </div>
              </div>
            );})}
          </div>
        )}

        {/* Statistics tab */}
        {!loading && tab === "stats" && (() => {
          const active = trips.filter((t) => t.status !== "CANCELLED");
          const revenue = active.reduce((s, t) => s + t.price * t.spotsBooked, 0);
          const registrants = active.reduce((s, t) => s + t.spotsBooked, 0);
          const completed = trips.filter((t) => t.status === "COMPLETED" || new Date(t.date) < now).length;
          const cancelled = trips.filter((t) => t.status === "CANCELLED").length;
          const completionRate = trips.length > 0 ? Math.round((completed / trips.length) * 100) : 0;
          const cards = [
            { v: `₪${revenue.toLocaleString("he-IL")}`, l: "הכנסה" },
            { v: trips.length, l: "טיולים" },
            { v: registrants, l: "נרשמים" },
            { v: guide && guide.rating > 0 ? `★${guide.rating.toFixed(1)}` : "—", l: "דירוג ממוצע" },
            { v: `${completionRate}%`, l: "אחוז השלמה" },
            { v: cancelled, l: "ביטולים" },
          ];
          return (
            <div className="bg-surface rounded-2xl border border-border shadow-sm p-4 grid grid-cols-3 gap-2">
              {cards.map((c, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-3 text-center">
                  <div className="text-base font-semibold text-fg">{c.v}</div>
                  <div className="text-[10px] text-fg-faint mt-0.5">{c.l}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {!loading && tab === "trips" && trips.length === 0 && (
          <div className="bg-surface rounded-2xl border border-border p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">🥾</div>
            <p className="text-fg-muted text-sm mb-4">עוד לא יצרת טיולים</p>
            <Link
              href="/guide/trips/new"
              className="bg-[#1A6B4A] text-white text-sm rounded-full px-6 py-2.5 font-medium hover:bg-[#155a3e] transition-colors"
            >
              צור טיול ראשון
            </Link>
          </div>
        )}

        <div className={`flex flex-col gap-3 ${tab !== "trips" ? "hidden" : ""}`}>
          {trips.map((trip) => {
            const occupancy = trip.maxSpots > 0 ? trip.spotsBooked / trip.maxSpots : 0;
            const isFull = trip.status === "FULL" || occupancy >= 1;
            const diffBadge = DIFF_BADGE[trip.difficulty];
            const statusBadge = STATUS_BADGE[trip.status] ?? STATUS_BADGE.DRAFT;
            const isPast = new Date(trip.date) < now;
            const isConfirmDelete = confirmId === trip.id;

            return (
              <div
                key={trip.id}
                className={`bg-surface rounded-2xl overflow-hidden border border-border shadow-sm ${isPast ? "opacity-60" : ""}`}
              >
                {/* Image */}
                <div
                  className="relative cursor-pointer"
                  style={{ height: 150 }}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImages(trip.images, trip.id, { region: trip.region, title: trip.title })[0]} alt={trip.title} className="w-full h-full object-cover" />

                  <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                      {statusBadge.label}
                    </span>
                    {(trip.status === "OPEN" || trip.status === "FULL") && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: trip.visibility === "PRIVATE" ? "rgba(0,0,0,0.6)" : "rgba(44,95,138,0.9)", color: "#fff" }}>
                        {trip.visibility === "PRIVATE" ? "🔒 פרטי" : "🌍 ציבורי"}
                      </span>
                    )}
                    {diffBadge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: diffBadge.bg, color: diffBadge.color }}>
                        {diffBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Edit + Delete buttons */}
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => router.push(`/guide/trips/${trip.id}/edit`)}
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full px-2.5 py-1 text-[11px] transition-colors"
                    >
                      ✏️ עריכה
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(isConfirmDelete ? null : trip.id)}
                      className="bg-black/50 hover:bg-red-600/80 text-white rounded-full px-2.5 py-1 text-[11px] transition-colors"
                    >
                      🗑
                    </button>
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}
                  >
                    <div className="text-sm font-medium text-white leading-snug">{trip.title}</div>
                  </div>
                </div>

                {/* Delete confirmation bar */}
                {isConfirmDelete && (
                  <div className="bg-surface-2 border-b border-red-100 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-red-700">בטוח? הפעולה לא הפיכה</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="text-xs text-fg-muted px-3 py-1 border border-border rounded-full hover:bg-surface-2"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(trip.id)}
                        disabled={deletingId === trip.id}
                        className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full disabled:opacity-60"
                      >
                        {deletingId === trip.id ? "מוחק..." : "מחק"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Card body */}
                <div className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mb-2">
                    <span className="text-[11px] text-fg-muted">📅 {dfmt(trip.date, { greg: { weekday: "short", day: "numeric", month: "short" } })}</span>
                    <span className="text-[11px] text-fg-muted">🕐 {trip.startTime}</span>
                    {trip.distanceKm > 0 && <span className="text-[11px] text-fg-muted">📍 {trip.distanceKm} ק"מ</span>}
                    {trip.durationMin > 0 && <span className="text-[11px] text-fg-muted">⏱ {formatDuration(trip.durationMin)}</span>}
                  </div>

                  <div className="h-[3px] bg-surface-2 rounded-full overflow-hidden mb-2.5">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(occupancy * 100, 100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fg">
                      ₪{trip.price.toLocaleString("he-IL")}
                      <span className="text-xs font-normal text-fg-faint mr-1">לאדם</span>
                    </span>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setRegistrantsModal({ id: trip.id, title: trip.title }); }}
                      className="text-xs text-[#1A6B4A] font-medium hover:underline">
                      נרשמים · {trip.spotsBooked}/{trip.maxSpots}
                    </button>
                  </div>

                  {/* Unmatched ride seekers — informational only */}
                  {(trip.unmatchedSeekers ?? 0) > 0 && (
                    <div className="mt-1.5 text-[11px] text-[#185FA5] flex items-center gap-1">
                      🙋 {trip.unmatchedSeekers} {trip.unmatchedSeekers === 1 ? "מחפש טרמפ" : "מחפשי טרמפ"}
                    </div>
                  )}

                  {/* Draft cannot be published directly — must complete required fields in the editor */}
                  {(trip.status === "DRAFT" || trip.status === "PENDING_REVIEW" || trip.status === "REJECTED") && (
                    <Link href={`/guide/trips/${trip.id}/edit`} onClick={(e) => e.stopPropagation()}
                      className="block text-center w-full mt-2 py-1.5 text-xs font-semibold rounded-full border-2 border-dashed border-[#1A6B4A] text-[#1A6B4A] hover:bg-[#D6EDE3] transition-colors">
                      ✏️ המשך עריכה כדי לפרסם
                    </Link>
                  )}

                  {/* Communication links */}
                  <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-border">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setRegistrantsModal({ id: trip.id, title: trip.title }); }}
                      className="flex-1 text-center text-[11px] text-[#7A5010] border border-[#E8A020]/30 bg-[#FDF6E8] rounded-lg py-1.5 hover:bg-[#FBEFD5] transition-colors"
                    >
                      👥 נרשמים
                    </button>
                    <Link
                      href={`/guide/trips/${trip.id}/qa`}
                      className="flex-1 text-center text-[11px] text-[#1A6B4A] border border-[#1A6B4A]/25 bg-[#F0FAF5] rounded-lg py-1.5 hover:bg-[#D6EDE3] transition-colors"
                    >
                      💬 שאלות
                    </Link>
                  </div>

                  {/* Group messages + private link */}
                  {(trip.status === "OPEN" || trip.status === "FULL") && (
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => setBroadcastModal({ id: trip.id, title: trip.title })}
                        className="flex-1 text-center text-[11px] text-fg-muted border border-border rounded-lg py-1.5 hover:bg-surface-2 transition-colors">
                        📢 הודעות קבוצתיות
                      </button>
                      <a href={googleCalendarUrl({ title: trip.title, dateISO: trip.date, startTime: trip.startTime, location: trip.region })}
                        target="_blank" rel="noreferrer"
                        className="flex-1 text-center text-[11px] text-[#185FA5] border border-[#185FA5]/30 rounded-lg py-1.5 hover:bg-[#EEF5FC] transition-colors">
                        📅 ליומן
                      </a>
                      {trip.visibility === "PRIVATE" && (
                        <button type="button" onClick={() => copyLink(trip.id)}
                          className="flex-1 text-center text-[11px] text-[#185FA5] border border-[#185FA5]/25 rounded-lg py-1.5 hover:bg-[#EEF5FC] transition-colors">
                          {copiedId === trip.id ? "✓ הועתק" : "🔗 העתק לינק"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {registrantsModal && (
        <RegistrantsModal
          tripId={registrantsModal.id}
          tripTitle={registrantsModal.title}
          onClose={() => setRegistrantsModal(null)}
        />
      )}

      {broadcastModal && (
        <BroadcastModal
          tripId={broadcastModal.id}
          tripTitle={broadcastModal.title}
          onClose={() => setBroadcastModal(null)}
        />
      )}
    </div>
  );
}

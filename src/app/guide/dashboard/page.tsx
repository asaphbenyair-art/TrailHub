"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";

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
}

interface Guide {
  rating: number;
  reviewCount: number;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
}
function formatDuration(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}:${String(m).padStart(2, "0")} שע'` : `${h} שע'`;
}

export default function GuideDashboard() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    const res = await fetch("/api/guide/trips");
    const data = await res.json();
    if (data.trips) {
      const now = new Date();
      const upcoming = data.trips.filter((t: Trip) => new Date(t.date) >= now);
      const past = data.trips.filter((t: Trip) => new Date(t.date) < now);
      setTrips([...upcoming, ...past]);
      setGuide(data.guide);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/guide/trips/${id}`, { method: "DELETE" });
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
    setConfirmId(null);
  }

  const now = new Date();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5] p-4 flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col gap-3">

        {/* Header */}
        <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/trips" className="text-[#1A6B4A] text-sm font-medium flex items-center gap-1 hover:underline">
              🧭 גלה טיולים
            </Link>
            {guide && (
              <span className="text-xs text-gray-400">
                ★{guide.rating > 0 ? guide.rating.toFixed(1) : "—"} · {guide.reviewCount} ביקורות
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/guide/trips/new"
              className="bg-[#1A6B4A] text-white text-sm rounded-full px-4 py-2 font-medium hover:bg-[#155a3e] transition-colors"
            >
              + טיול חדש
            </Link>
          </div>
        </div>

        <h1 className="text-base font-semibold text-gray-700 px-1">הטיולים שלי</h1>

        {loading && (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 text-sm shadow-sm">טוען...</div>
        )}

        {!loading && trips.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">🥾</div>
            <p className="text-gray-500 text-sm mb-4">עוד לא יצרת טיולים</p>
            <Link
              href="/guide/trips/new"
              className="bg-[#1A6B4A] text-white text-sm rounded-full px-6 py-2.5 font-medium hover:bg-[#155a3e] transition-colors"
            >
              צור טיול ראשון
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
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
                className={`bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm ${isPast ? "opacity-60" : ""}`}
              >
                {/* Image */}
                <div
                  className="relative cursor-pointer"
                  style={{ height: 150 }}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                >
                  {trip.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={trip.images[0]} alt={trip.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: "linear-gradient(160deg, #2d6b4a, #0f3d2e)" }} />
                  )}

                  <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                      {statusBadge.label}
                    </span>
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
                  <div className="bg-red-50 border-b border-red-100 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-red-700">בטוח? הפעולה לא הפיכה</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="text-xs text-gray-500 px-3 py-1 border border-gray-200 rounded-full hover:bg-gray-50"
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
                    <span className="text-[11px] text-gray-500">📅 {formatDate(trip.date)}</span>
                    <span className="text-[11px] text-gray-500">🕐 {trip.startTime}</span>
                    {trip.distanceKm > 0 && <span className="text-[11px] text-gray-500">📍 {trip.distanceKm} ק"מ</span>}
                    {trip.durationMin > 0 && <span className="text-[11px] text-gray-500">⏱ {formatDuration(trip.durationMin)}</span>}
                  </div>

                  <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden mb-2.5">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(occupancy * 100, 100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      ₪{trip.price.toLocaleString("he-IL")}
                      <span className="text-xs font-normal text-gray-400 mr-1">לאדם</span>
                    </span>
                    <span className="text-xs text-gray-400">{trip.spotsBooked}/{trip.maxSpots} מקומות</span>
                  </div>

                  {/* Submit for review — shown only for DRAFT or REJECTED */}
                  {(trip.status === "DRAFT" || trip.status === "REJECTED") && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await fetch(`/api/guide/trips/${trip.id}/submit`, { method: "POST" });
                        setTrips((prev) => prev.map((t) => t.id === trip.id ? { ...t, status: "PENDING_REVIEW" } : t));
                      }}
                      className="w-full mt-2 py-1.5 text-xs font-semibold rounded-full border-2 border-dashed border-[#1A6B4A] text-[#1A6B4A] hover:bg-[#D6EDE3] transition-colors"
                    >
                      {trip.status === "REJECTED" ? "שלח לאישור מחדש ↑" : "שלח לאישור ↑"}
                    </button>
                  )}
                  {trip.status === "PENDING_REVIEW" && (
                    <div className="w-full mt-2 py-1.5 text-xs text-center text-amber-700 bg-amber-50 rounded-full border border-amber-200">
                      ⏳ ממתין לאישור מנהל
                    </div>
                  )}
                  {trip.status === "REJECTED" && trip.approvalNote && (
                    <div className="mt-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
                      סיבת דחייה: {trip.approvalNote}
                    </div>
                  )}

                  {/* Communication links */}
                  <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-50">
                    <Link
                      href={`/guide/trips/${trip.id}/qa`}
                      className="flex-1 text-center text-[11px] text-[#1A6B4A] border border-[#1A6B4A]/25 bg-[#F0FAF5] rounded-lg py-1.5 hover:bg-[#D6EDE3] transition-colors"
                    >
                      💬 שאלות
                    </Link>
                    <Link
                      href={`/guide/trips/${trip.id}/chat`}
                      className="flex-1 text-center text-[11px] text-[#185FA5] border border-[#185FA5]/25 bg-[#EEF5FC] rounded-lg py-1.5 hover:bg-[#D4E4F0] transition-colors"
                    >
                      ✉️ הודעות
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

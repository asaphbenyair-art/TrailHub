"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";

const TripDetailMap = dynamic(() => import("@/components/TripDetailMap"), { ssr: false });

const DIFF_LABEL: Record<string, string> = {
  EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני",
};
const DIFF_COLOR: Record<string, { bg: string; color: string }> = {
  EASY: { bg: "#EAF3DE", color: "#27500A" },
  MEDIUM: { bg: "#FAEEDA", color: "#633806" },
  HARD: { bg: "#FADBD8", color: "#791F1F" },
  EXTREME: { bg: "#E8D0D0", color: "#4A0F0F" },
};

const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];
function avatarColor(name: string | null) {
  if (!name) return "#999";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}
function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long",
  });
}
function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("he-IL", {
    weekday: "short", day: "numeric", month: "short",
  });
}
function formatDuration(min: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}:${String(m).padStart(2, "0")}` : `${h}`;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  user: { name: string | null };
}

interface Waypoint {
  lat: number;
  lng: number;
  label: string;
}

interface Trip {
  id: string;
  title: string;
  description: string | null;
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
  meetingPoint: string | null;
  waypoints: string | null;
  whatToBring: string | null;
  cancellationPolicy: string | null;
  guide: {
    rating: number;
    reviewCount: number;
    yearsActive: number | null;
    user: { name: string | null; image: string | null };
  };
  reviews: Review[];
}

const REG_STATUS_UI: Record<string, { bg: string; color: string; icon: string; text: string }> = {
  CONFIRMED: { bg: "#D6EDE3", color: "#0F5038", icon: "✓", text: "רשום לטיול" },
  WAITLIST:  { bg: "#D4E4F0", color: "#185FA5", icon: "⏰", text: "ברשימת המתנה" },
  PENDING:   { bg: "#f5f5f5", color: "#555",    icon: "👀", text: "מתעניין" },
  CANCELLED: { bg: "#f5f5f5", color: "#999",    icon: "✕", text: "הרשמה בוטלה" },
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [myRegStatus, setMyRegStatus] = useState<string | null>(null);

  interface Question {
    id: string;
    body: string;
    answer: string | null;
    answeredAt: string | null;
    createdAt: string;
    user: { name: string | null; image: string | null };
  }
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qaBody, setQaBody] = useState("");
  const [qaLoading, setQaLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); } else { setTrip(d); }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/my-trips")
      .then((r) => r.json())
      .then((regs: Array<{ status: string; trip: { id: string } }>) => {
        if (!Array.isArray(regs)) return;
        const found = regs.find((r) => r.trip.id === id);
        if (found) setMyRegStatus(found.status);
      })
      .catch(() => {});
  }, [session, id]);

  useEffect(() => {
    fetch(`/api/trips/${id}/questions`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setQuestions(data); })
      .catch(() => {});
  }, [id]);

  async function submitQuestion() {
    if (!qaBody.trim() || qaLoading) return;
    setQaLoading(true);
    try {
      const res = await fetch(`/api/trips/${id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: qaBody }),
      });
      if (res.ok) {
        const q = await res.json();
        setQuestions((prev) => [...prev, q]);
        setQaBody("");
      }
    } finally {
      setQaLoading(false);
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-gray-400 text-sm">טוען...</div>
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center gap-4">
        <div className="text-gray-500">הטיול לא נמצא</div>
        <button type="button" onClick={() => router.push("/trips")} className="text-[#1A6B4A] text-sm">
          ← חזרה לגלה טיולים
        </button>
      </div>
    );
  }

  const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 0);
  const occupancy = trip.maxSpots > 0 ? trip.spotsBooked / trip.maxSpots : 0;
  const isFull = trip.status === "FULL" || occupancy >= 1;
  const guideName = trip.guide?.user?.name ?? "מדריך";
  const diffBadge = DIFF_COLOR[trip.difficulty];
  const guideStars = Math.round(trip.guide?.rating || 0);

  const equipment = trip.whatToBring
    ? trip.whatToBring.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let parsedWaypoints: Waypoint[] = [];
  if (trip.waypoints) {
    try { parsedWaypoints = JSON.parse(trip.waypoints); } catch { /* ignore */ }
  }

  const cancellationLines = trip.cancellationPolicy
    ? trip.cancellationPolicy.split("\n").filter(Boolean)
    : [];

  return (
    <div dir="rtl" className="min-h-screen bg-white flex justify-center pb-24">
      <div className="w-full max-w-[480px]">

        {/* ── Hero ── */}
        <div className="relative" style={{ height: 220 }}>
          {trip.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.images[0]} alt={trip.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(160deg, #3d6b35, #0f2a0d)" }} />
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className="absolute top-3 right-3 bg-black/45 text-white rounded-full px-3 py-1.5 text-xs backdrop-blur-sm"
          >
            → חזרה
          </button>

          <div className="absolute top-3 left-3 flex gap-2 items-center">
            <div className="bg-black/45 backdrop-blur-sm rounded-full">
              {session && <NotificationBell />}
            </div>
            <button type="button" className="bg-black/45 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm backdrop-blur-sm">♡</button>
            <button type="button" className="bg-black/45 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm backdrop-blur-sm">⬆</button>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-3"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent)" }}
          >
            <h1 className="text-lg font-medium text-white leading-snug mb-2">{trip.title}</h1>
            <div className="flex gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.92)", color: "#27500A" }}>
                📍 {trip.region}
              </span>
              {diffBadge && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: diffBadge.bg, color: diffBadge.color }}>
                  {DIFF_LABEL[trip.difficulty]}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-5">

          {/* ── Guide ── */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
              style={{ background: avatarColor(guideName) }}
            >
              {initials(guideName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">{guideName}</div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                {guideStars > 0 && (
                  <span className="text-amber-500">{"★".repeat(guideStars)}</span>
                )}
                {trip.guide?.rating > 0 && <span>{trip.guide.rating.toFixed(1)}</span>}
                {trip.guide?.reviewCount > 0 && <span>· {trip.guide.reviewCount} ביקורות</span>}
                {trip.guide?.yearsActive && <span>· {trip.guide.yearsActive} שנות ניסיון</span>}
              </div>
            </div>
            <button type="button" className="text-xs text-[#1A6B4A] border border-[#1A6B4A] rounded-full px-3 py-1.5 hover:bg-[#D6EDE3] transition-colors">
              פרופיל
            </button>
          </div>

          {/* ── Stats grid ── */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-sm font-semibold text-gray-900">
                {trip.distanceKm > 0 ? trip.distanceKm : "—"}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">ק"מ</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-sm font-semibold text-gray-900">
                {trip.durationMin > 0 ? formatDuration(trip.durationMin) : "—"}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">שעות</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-sm font-semibold text-gray-900">{trip.startTime || "—"}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">יציאה</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-sm font-semibold text-gray-900">{spotsLeft > 0 ? spotsLeft : "מלא"}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">מקומות</div>
            </div>
          </div>

          {/* ── Occupancy bar ── */}
          <div className="-mt-2">
            <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(occupancy * 100, 100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{trip.spotsBooked} מתוך {trip.maxSpots} רשומים</span>
              <span className={isFull ? "text-red-500" : "text-[#1A6B4A]"}>
                {isFull ? "אין מקום" : `${spotsLeft} מקומות נותרו`}
              </span>
            </div>
          </div>

          {/* ── Description ── */}
          {trip.description && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">📄 על הטיול</div>
              <p className="text-sm text-gray-600 leading-relaxed">{trip.description}</p>
            </div>
          )}

          {/* ── Route / map section ── */}
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">🗺 מסלול ונקודת מפגש</div>

            <TripDetailMap
              region={trip.region}
              meetingPoint={trip.meetingPoint}
              waypoints={parsedWaypoints}
              height={180}
            />

            {/* Route stats */}
            {(trip.distanceKm > 0 || trip.durationMin > 0) && (
              <div className="flex gap-4 mt-2.5 px-1">
                {trip.distanceKm > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="text-gray-400">📍</span>
                    <span>{trip.distanceKm} ק"מ</span>
                  </div>
                )}
                {trip.durationMin > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="text-gray-400">⏱</span>
                    <span>{formatDuration(trip.durationMin)} שעות</span>
                  </div>
                )}
              </div>
            )}

            {/* Meeting point detail */}
            {trip.meetingPoint && (
              <div className="mt-2.5 bg-gray-50 rounded-xl p-3">
                <div className="text-[11px] text-gray-400 mb-1">נקודת מפגש</div>
                <div className="text-sm text-gray-800 font-medium">{trip.meetingPoint}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  📅 {formatDateLong(trip.date)} · {trip.startTime}
                </div>
              </div>
            )}

            {/* Waypoints list */}
            {parsedWaypoints.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-col">
                  {parsedWaypoints.map((wp, i) => {
                    const isFirst = i === 0;
                    const isLast = i === parsedWaypoints.length - 1;
                    const dotBg = isFirst ? "#2C5F8A" : isLast ? "#C0392B" : "#1A6B4A";
                    const dotLabel = isFirst ? "פ" : isLast ? "ס" : String(i);
                    return (
                      <div key={i} className="flex gap-3 py-2 border-b border-gray-50 last:border-b-0">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white"
                            style={{ background: dotBg }}>
                            {dotLabel}
                          </div>
                          {!isLast && <div className="w-[1.5px] flex-1 bg-gray-100 mt-1" style={{ minHeight: 12 }} />}
                        </div>
                        <div className="pb-1">
                          <div className="text-sm font-medium text-gray-900">{wp.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Equipment ── */}
          {equipment.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">🎒 ציוד נדרש</div>
              <div className="flex flex-wrap gap-1.5">
                {equipment.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-600"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Cancellation policy ── */}
          {cancellationLines.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">🧾 מדיניות ביטולים</div>
              <div className="bg-[#FDF3DC] rounded-xl p-3 flex flex-col gap-1.5">
                {cancellationLines.map((line, i) => {
                  const dashIdx = line.indexOf("—");
                  const left = dashIdx >= 0 ? line.slice(0, dashIdx).trim() : line;
                  const right = dashIdx >= 0 ? line.slice(dashIdx + 1).trim() : "";
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-amber-700">{left}</span>
                      {right && <span className="text-amber-900 font-medium">{right}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Q&A ── */}
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-3">💬 שאלות ותשובות</div>
            {questions.length === 0 && (
              <p className="text-xs text-gray-400 mb-3">אין שאלות עדיין. שאל את המדריך!</p>
            )}
            {questions.length > 0 && (
              <div className="flex flex-col gap-3 mb-3">
                {questions.map((q) => (
                  <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                        style={{ background: avatarColor(q.user.name) }}
                      >
                        {initials(q.user.name)}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{q.user.name ?? "מטייל"}</span>
                      <span className="text-[10px] text-gray-400 mr-auto">
                        {new Date(q.createdAt).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 mb-1">{q.body}</p>
                    {q.answer && (
                      <div className="mt-2 pr-3 border-r-2 border-[#1A6B4A]">
                        <div className="text-[10px] text-[#1A6B4A] font-medium mb-0.5">תשובת המדריך</div>
                        <p className="text-xs text-gray-700">{q.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {session ? (
              <div className="flex gap-2">
                <textarea
                  value={qaBody}
                  onChange={(e) => setQaBody(e.target.value)}
                  placeholder="שאל שאלה..."
                  rows={2}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1A6B4A]"
                />
                <button
                  type="button"
                  onClick={submitQuestion}
                  disabled={!qaBody.trim() || qaLoading}
                  className="px-3 py-2 bg-[#1A6B4A] text-white text-xs rounded-xl disabled:opacity-50 self-end"
                >
                  {qaLoading ? "..." : "שלח"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                <button type="button" onClick={() => router.push("/auth/login")} className="text-[#1A6B4A] underline">התחבר</button> כדי לשאול שאלה
              </p>
            )}
          </div>

          {/* ── Reviews ── */}
          {trip.reviews.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">
                ⭐ ביקורות
                <span className="text-xs font-normal text-gray-400 mr-2">({trip.reviews.length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {trip.reviews.map((rev) => (
                  <div key={rev.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                        style={{ background: avatarColor(rev.user.name) }}
                      >
                        {initials(rev.user.name)}
                      </div>
                      <span className="text-xs font-medium text-gray-900">{rev.user.name}</span>
                      <span className="text-amber-500 text-xs mr-auto">
                        {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-gray-600 leading-relaxed">{rev.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed footer ── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100"
        dir="rtl"
        style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.06)" }}
      >
        {/* Chat with guide button — shown to registered/interested users */}
        {session && myRegStatus && myRegStatus !== "CANCELLED" && (
          <div className="px-4 pt-2 pb-0">
            <button
              type="button"
              onClick={() => router.push(`/trips/${trip.id}/chat`)}
              className="w-full py-2 text-xs text-[#185FA5] border border-[#185FA5]/30 bg-[#E8F2FB] rounded-full flex items-center justify-center gap-1.5 hover:bg-[#D4E9F7] transition-colors"
            >
              ✉️ שלח הודעה למדריך
            </button>
          </div>
        )}

        {/* Registration status banner */}
        {myRegStatus && REG_STATUS_UI[myRegStatus] && myRegStatus !== "CANCELLED" && (
          <div
            className="px-4 py-2 flex items-center justify-between text-xs"
            style={{ background: REG_STATUS_UI[myRegStatus].bg, color: REG_STATUS_UI[myRegStatus].color }}
          >
            <span className="font-medium">
              {REG_STATUS_UI[myRegStatus].icon} {REG_STATUS_UI[myRegStatus].text}
            </span>
            <button
              type="button"
              onClick={() => router.push("/my-trips")}
              className="underline text-[11px]"
            >
              הטיולים שלי →
            </button>
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              ₪{trip.price.toLocaleString("he-IL")}
              <span className="text-xs font-normal text-gray-400 mr-1">לאדם</span>
            </div>
            <div className="text-xs text-gray-400">{formatDateShort(trip.date)}</div>
          </div>
          <div className="flex gap-2">
            {myRegStatus === "CONFIRMED" ? (
              <button
                type="button"
                onClick={() => router.push("/my-trips")}
                className="px-5 py-2 text-sm bg-[#D6EDE3] text-[#0F5038] rounded-full font-medium border border-[#1A6B4A]"
              >
                ✓ רשום — הטיולים שלי
              </button>
            ) : myRegStatus === "WAITLIST" ? (
              <button
                type="button"
                onClick={() => router.push("/my-trips")}
                className="px-5 py-2 text-sm bg-[#D4E4F0] text-[#185FA5] rounded-full font-medium"
              >
                ⏰ ברשימת המתנה
              </button>
            ) : myRegStatus === "PENDING" ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/my-trips")}
                  className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-full hover:bg-gray-50 transition-colors"
                >
                  👀 מתעניין
                </button>
                <button
                  type="button"
                  onClick={() => router.push(isFull ? `/trips/${trip.id}/register?flow=waitlist` : `/trips/${trip.id}/register`)}
                  className={`px-5 py-2 text-sm rounded-full text-white font-medium transition-colors ${
                    isFull ? "bg-[#C0392B] hover:bg-[#a93226]" : "bg-[#1A6B4A] hover:bg-[#155a3e]"
                  }`}
                >
                  {isFull ? "רשימת המתנה" : "להרשמה ←"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/trips/${trip.id}/register?flow=interest`)}
                  className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-full hover:bg-gray-50 transition-colors"
                >
                  מתעניין
                </button>
                <button
                  type="button"
                  onClick={() => router.push(isFull ? `/trips/${trip.id}/register?flow=waitlist` : `/trips/${trip.id}/register`)}
                  className={`px-5 py-2 text-sm rounded-full text-white font-medium transition-colors ${
                    isFull ? "bg-[#C0392B] hover:bg-[#a93226]" : "bg-[#1A6B4A] hover:bg-[#155a3e]"
                  }`}
                >
                  {isFull ? "רשימת המתנה" : "להרשמה ←"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

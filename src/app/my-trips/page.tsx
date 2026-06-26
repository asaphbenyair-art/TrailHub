"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };

interface RegistrationTrip {
  id: string;
  title: string;
  region: string;
  difficulty: string;
  date: string;
  startTime: string;
  price: number;
  maxSpots: number;
  spotsBooked: number;
  images: string[];
  meetingPoint: string | null;
  guide: { user: { name: string | null } };
}

interface Registration {
  id: string;
  status: "PENDING" | "CONFIRMED" | "WAITLIST" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "REFUNDED";
  totalPrice: number;
  participantCount: number;
  waitlistPosition: number | null;
  notes: string | null;
  createdAt: string;
  trip: RegistrationTrip;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
}
function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED: { bg: "#D6EDE3", color: "#0F5038", label: "✓ רשום" },
  WAITLIST:  { bg: "#D4E4F0", color: "#185FA5", label: "⏰ רשימת המתנה" },
  PENDING:   { bg: "#f5f5f5", color: "#666", label: "מתעניין" },
  CANCELLED: { bg: "#FADBD8", color: "#791F1F", label: "✕ בוטל" },
};

const now = new Date();

function TripCard({
  reg,
  onCancel,
}: {
  reg: Registration;
  onCancel: (id: string) => void;
}) {
  const { trip, status } = reg;
  const router = useRouter();
  const isPast = new Date(trip.date) < now;
  const isConfirmed = status === "CONFIRMED";
  const isWaitlist = status === "WAITLIST";
  const isPending = status === "PENDING";
  const isCancelled = status === "CANCELLED";

  const badge = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  const guideName = trip.guide?.user?.name ?? "מדריך";

  const daysUntil = Math.ceil((new Date(trip.date).getTime() - now.getTime()) / 86400000);
  const showAlert = isConfirmed && !isPast && daysUntil <= 3 && daysUntil > 0;

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function doCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
      if (res.ok) onCancel(reg.id);
    } finally { setCancelling(false); setConfirmCancel(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ opacity: isCancelled ? 0.7 : 1 }}>
      <div className="flex">
        {/* Image */}
        <div className="w-24 flex-shrink-0" style={{ minHeight: 90 }}>
          {trip.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.images[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(160deg,#3d6b35,#1a3d16)", minHeight: 90 }} />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-3 min-w-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-1.5"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </div>
          <div className="text-sm font-medium text-gray-900 leading-snug mb-1 truncate">{trip.title}</div>
          <div className="flex flex-col gap-0.5 text-xs text-gray-500">
            <span>📅 {isPast ? formatDateLong(trip.date) : formatDate(trip.date)} · {trip.startTime}</span>
            <span>👤 {guideName}</span>
            {trip.meetingPoint && <span>📍 {trip.meetingPoint}</span>}
          </div>
          {isWaitlist && reg.waitlistPosition && (
            <div className="inline-flex items-center gap-1 text-[11px] text-[#185FA5] bg-[#E6F1FB] rounded-full px-2 py-0.5 mt-1.5">
              👥 מקום {reg.waitlistPosition} ברשימה
            </div>
          )}
          {isPending && reg.notes && (
            <div className="text-[11px] text-gray-400 mt-1 truncate">⚙ {reg.notes}</div>
          )}
        </div>
      </div>

      {/* Alert strip for upcoming paid trips close to non-refundable */}
      {showAlert && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#FDF3DC] border-t border-[#EF9F27]">
          <span className="text-xs text-[#633806] flex-1">
            ⏰ החיוב יתבצע ב-{formatDate(trip.date)} — עוד {daysUntil} ימים
          </span>
          <button type="button" onClick={() => setConfirmCancel(true)}
            className="text-[11px] text-[#854F0B] font-medium underline">
            בטל עכשיו להחזר מלא
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-50 bg-gray-50/60">
        <span className="text-xs font-medium text-gray-800">
          {isCancelled
            ? `₪${reg.totalPrice.toLocaleString()} · הוחזר`
            : isConfirmed
            ? `₪${(reg.totalPrice + Math.round(reg.totalPrice * 0.075)).toLocaleString()} · ${reg.paymentStatus === "PAID" ? "שולם" : "אושר, טרם חויב"}`
            : `₪${reg.totalPrice.toLocaleString()}`}
        </span>
        <div className="flex gap-1.5">
          {isPast && !isCancelled && (
            <>
              <button type="button" className="px-2.5 py-1 border border-gray-200 rounded-full text-[11px] text-gray-600">
                כתוב ביקורת
              </button>
              <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)}
                className="px-2.5 py-1 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">
                הרשם שוב
              </button>
            </>
          )}
          {isPending && !isPast && (
            <>
              <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)}
                className="px-2.5 py-1 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">
                להרשמה
              </button>
              <button type="button" onClick={() => setConfirmCancel(true)}
                className="px-2.5 py-1 border border-[#C0392B] text-[#C0392B] rounded-full text-[11px]">
                הסר
              </button>
            </>
          )}
          {isWaitlist && !isPast && (
            <button type="button" onClick={() => setConfirmCancel(true)}
              className="px-2.5 py-1 border border-[#C0392B] text-[#C0392B] rounded-full text-[11px]">
              הסר מהמתנה
            </button>
          )}
          {isConfirmed && !isPast && (
            <>
              <button type="button" className="px-2.5 py-1 border border-gray-200 rounded-full text-[11px] text-gray-600">
                שאלה למדריך
              </button>
              <button type="button" onClick={() => setConfirmCancel(true)}
                className="px-2.5 py-1 border border-[#C0392B] text-[#C0392B] rounded-full text-[11px]">
                ביטול
              </button>
            </>
          )}
          {isCancelled && (
            <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)}
              className="px-2.5 py-1 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">
              הרשם שוב
            </button>
          )}
        </div>
      </div>

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="px-3 py-2.5 bg-[#FADBD8] border-t border-[#C0392B]/20">
          <div className="text-xs text-[#791F1F] mb-2">
            {isConfirmed
              ? "לבטל את ההרשמה? יתכן שהחזר חלקי בלבד."
              : "להסיר מהרשימה?"}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmCancel(false)}
              className="px-3 py-1.5 border border-gray-200 rounded-full text-xs text-gray-500 bg-white">
              לא
            </button>
            <button type="button" onClick={doCancel} disabled={cancelling}
              className="px-3 py-1.5 bg-[#C0392B] text-white rounded-full text-xs disabled:opacity-60">
              {cancelling ? "מבטל..." : "כן, בטל"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyTripsPage() {
  const router = useRouter();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "interested" | "past">("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my-trips");
      if (res.status === 401) { router.push("/auth/login"); return; }
      const data: Registration[] = await res.json();
      setRegs(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function removeReg(id: string) {
    setRegs((prev) => prev.filter((r) => r.id !== id));
  }

  const upcoming = regs.filter((r) =>
    (r.status === "CONFIRMED" || r.status === "WAITLIST") && new Date(r.trip.date) >= now
  );
  const interested = regs.filter((r) => r.status === "PENDING" && new Date(r.trip.date) >= now);
  const past = regs.filter((r) =>
    new Date(r.trip.date) < now || r.status === "CANCELLED"
  );

  const tabs = [
    { key: "upcoming" as const, label: "קרובים", count: upcoming.length },
    { key: "interested" as const, label: "מתעניין", count: interested.length },
    { key: "past" as const, label: "היסטוריה", count: past.length },
  ];

  const currentList = activeTab === "upcoming" ? upcoming : activeTab === "interested" ? interested : past;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-[480px] mx-auto px-3 py-3 pb-8">

        {/* Top bar */}
        <div className="bg-white rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2">
          <Link href="/trips" className="text-[15px] font-semibold text-[#1A6B4A] flex-shrink-0">🧭 TrailHub</Link>
          <span className="text-sm font-medium text-gray-900 flex-1 text-center">הטיולים שלי</span>
          <Link href="/trips" className="text-xs text-[#1A6B4A] flex-shrink-0">גלה טיולים</Link>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl mb-2 overflow-hidden flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-xs text-center border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#1A6B4A] text-[#1A6B4A] font-medium"
                  : "border-transparent text-gray-500"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`mr-1 text-[10px] ${activeTab === tab.key ? "text-[#1A6B4A]" : "text-gray-400"}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">טוען...</div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">
              {activeTab === "upcoming" ? "🏕" : activeTab === "interested" ? "👀" : "📋"}
            </div>
            <div className="text-gray-500 text-sm">
              {activeTab === "upcoming" ? "אין טיולים קרובים" :
               activeTab === "interested" ? "לא מתעניין באף טיול כרגע" :
               "אין היסטוריה עדיין"}
            </div>
            <Link href="/trips"
              className="inline-block mt-3 text-[#1A6B4A] text-sm border border-[#1A6B4A] rounded-full px-4 py-1.5">
              גלה טיולים
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentList.map((reg) => (
              <TripCard key={reg.id} reg={reg} onCancel={removeReg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

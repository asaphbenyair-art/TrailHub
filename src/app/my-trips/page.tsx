"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { googleCalendarUrl } from "@/lib/calendar";
import { coverImages } from "@/lib/tripImage";
import AvatarMenu from "@/components/AvatarMenu";
import Brand from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import ModeIndicator from "@/components/ModeIndicator";
import QAModal from "@/components/QAModal";
import TripCardVisual, { TripCardTrip } from "@/components/TripCard";
import { useDateFmt, useCalendarMode } from "@/components/CalendarModeProvider";
import { useTranslations } from "next-intl";
import { useDir } from "@/components/useLabels";
import { formatDualDate } from "@/lib/hebrewDate";

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
  cancellationPolicy: string | null;
  guide: { user: { name: string | null } };
  qaCount?: number;
  qaOpen?: number;
}

// Compute the refund the hiker would get if they cancel right now, based on the
// trip's cancellation-policy tiers vs. the current time (spec: intermediate
// screen shows the exact refund amount before cancellation completes).
function computeRefund(policy: string | null, tripDate: string, totalPrice: number) {
  const hoursUntil = (new Date(tripDate).getTime() - Date.now()) / 3_600_000;
  const lines = (policy ?? "").split("\n").filter(Boolean);
  const tiers: { hours: number; pct: number }[] = [];
  for (const line of lines) {
    const hMatch = line.match(/(\d+)\s*שעות/);
    const noRefund = /ללא\s*החזר/.test(line);
    const pMatch = line.match(/(\d+)\s*%/);
    if (!hMatch) continue;
    const hours = parseInt(hMatch[1], 10);
    const pct = noRefund ? 0 : pMatch ? parseInt(pMatch[1], 10) : 0;
    // "פחות מ-X שעות" describes the window BELOW the threshold.
    if (/פחות/.test(line)) continue;
    tiers.push({ hours, pct });
  }
  // Most generous tier the hiker still qualifies for.
  let pct = 0;
  for (const t of tiers) if (hoursUntil >= t.hours) pct = Math.max(pct, t.pct);
  return { pct, amount: Math.round((totalPrice * pct) / 100) };
}

interface Registration {
  id: string;
  status: "PENDING" | "CONFIRMED" | "WAITLIST" | "CANCELLED";
  paymentStatus: "PENDING" | "AUTHORIZED" | "PAID" | "REFUNDED";
  totalPrice: number;
  participantCount: number;
  waitlistPosition: number | null;
  notes: string | null;
  conditions: string[] | null;
  interestThreshold: number | null;
  autoRegister: boolean;
  createdAt: string;
  trip: RegistrationTrip;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED: { bg: "#D6EDE3", color: "#0F5038", label: "✓ רשום" },
  WAITLIST:  { bg: "#D4E4F0", color: "#185FA5", label: "⏰ רשימת המתנה" },
  PENDING:   { bg: "#FBF0DA", color: "#7A5010", label: "★ מתעניין" },
  CANCELLED: { bg: "#FADBD8", color: "#791F1F", label: "✕ בוטל" },
};

const now = new Date();

// Self-guided review form (opened from the עצמאיים tab only, not the trip page).
function SelfGuidedReviewModal({ tripId, tripTitle, onClose }: { tripId: string; tripTitle: string; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  async function submit() {
    if (!rating) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.ok) setDone(true);
    } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[400px] bg-surface rounded-2xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-sm font-semibold text-fg mb-3">תודה! הביקורת נשמרה.</div>
            <button type="button" onClick={onClose} className="px-5 py-2 bg-[#1A6B4A] text-white rounded-full text-sm font-medium">סגור</button>
          </div>
        ) : (
          <>
            <div className="text-sm font-semibold text-fg mb-1">כתיבת ביקורת</div>
            <div className="text-[11px] text-fg-faint mb-3 truncate">{tripTitle}</div>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="text-2xl" style={{ color: n <= rating ? "#e0b64a" : "var(--fg-faint)" }}>★</button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="ספר על החוויה (אופציונלי)"
              className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-3 bg-surface border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-[#1A6B4A]" />
            <div className="flex gap-2">
              <button type="button" onClick={submit} disabled={!rating || saving}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50" style={{ background: "#1A6B4A" }}>
                {saving ? "שומר…" : "שלח ביקורת"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-sm font-medium border border-border text-fg-muted">ביטול</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TripCard({
  reg,
  onCancel,
  onOpenQa,
  qaRefresh,
}: {
  reg: Registration;
  onCancel: (id: string) => void;
  onOpenQa: (id: string, title: string) => void;
  qaRefresh?: number;
}) {
  const dfmt = useDateFmt();
  const { mode } = useCalendarMode();
  const { trip, status } = reg;
  const router = useRouter();
  const isPast = new Date(trip.date) < now;
  const isConfirmed = status === "CONFIRMED";
  const isWaitlist = status === "WAITLIST";
  const isPending = status === "PENDING";
  const isCancelled = status === "CANCELLED";

  const badge = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;

  const daysUntil = Math.ceil((new Date(trip.date).getTime() - now.getTime()) / 86400000);
  const isFree = reg.totalPrice === 0;
  // Refund-window alert only applies to PAID trips (free trips have no charge/refund).
  const showAlert = isConfirmed && !isPast && daysUntil <= 3 && daysUntil > 0 && !isFree;

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Q&A indicator: amber+count for unread answers, grey+count for open questions.
  const qaTotal = trip.qaCount ?? 0;
  const qaOpen = trip.qaOpen ?? 0;
  const qaAnswered = Math.max(qaTotal - qaOpen, 0);
  const [qaSeenAns, setQaSeenAns] = useState(0);
  useEffect(() => {
    try { setQaSeenAns(parseInt(window.localStorage.getItem(`qa-ans-seen-${trip.id}`) ?? "0") || 0); } catch {}
  }, [trip.id, qaRefresh]);
  const qaUnread = Math.max(qaAnswered - qaSeenAns, 0);
  const qaState = qaUnread > 0 ? "unread" : qaOpen > 0 ? "open" : "read";
  const qaColor = qaState === "unread" ? "#C8893A" : "#9ca3af";
  const showQa = qaTotal > 0 && !isCancelled && !isPast;

  async function doCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
      if (res.ok) onCancel(reg.id);
    } finally { setCancelling(false); setConfirmCancel(false); }
  }
  async function doPartialCancel() {
    const res = await fetch(`/api/registrations/${reg.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reduceBy: 1 }),
    });
    if (res.ok) window.location.reload();
  }

  // Status-specific info + refund alert, shown at the top of the card footer.
  const statusInfo = (
    <>
      {isWaitlist && reg.waitlistPosition && (
        <div className="inline-flex items-center gap-1 text-[11px] text-[#185FA5] bg-[#E6F1FB] rounded-full px-2 py-0.5 mb-1.5">
          👥 מקום {reg.waitlistPosition} ברשימה
        </div>
      )}
      {isPending && reg.conditions && reg.conditions.length > 0 && (
        <div className="text-[11px] text-[#7A5010] bg-[#FDF3DC] rounded-lg px-2 py-1 mb-1.5">
          ⚙ {reg.autoRegister ? "אירשם אוטומטית אם" : "התראה אם"}: {reg.conditions.join(" וגם ")}
        </div>
      )}
      {isPending && reg.interestThreshold && (
        <div className="text-[11px] text-[#185FA5] bg-[#EEF5FC] rounded-lg px-2 py-1 mb-1.5">
          🔔 התראה כשנותרו {reg.interestThreshold} מקומות
        </div>
      )}
      {isPending && !reg.conditions?.length && !reg.interestThreshold && reg.notes && (
        <div className="text-[11px] text-fg-faint mb-1 truncate">⚙ {reg.notes}</div>
      )}
      {showAlert && (
        <div className="flex items-center gap-2 px-2 py-2 mb-2 bg-[#FDF3DC] rounded-lg border border-[#EF9F27]">
          <span className="text-xs text-[#633806] flex-1">
            ⏰ החיוב יתבצע ב-{dfmt(trip.date, { greg: { weekday: "short", day: "numeric", month: "short" } })} — עוד {daysUntil} ימים
          </span>
          <button type="button" onClick={() => setConfirmCancel(true)}
            className="text-[11px] text-[#854F0B] font-medium underline">
            בטל עכשיו להחזר מלא
          </button>
        </div>
      )}
    </>
  );

  return (
    <TripCardVisual
      trip={trip as unknown as TripCardTrip}
      href={`/trips/${trip.id}`}
      dateLabelOverride={`${formatDualDate(trip.date, mode)}${trip.startTime ? ` · ${trip.startTime}` : ""}`}
      topStrip={
        <div className="px-3 py-1.5 text-xs font-medium" style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </div>
      }
      footer={
        <>
          {statusInfo}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
        {reg.totalPrice === 0 ? (
          // Free trips: show "חינם" in green, no payment status.
          <span className="text-xs font-bold" style={{ color: "#1A6B4A" }}>חינם</span>
        ) : (
          <span className="text-xs font-medium text-fg">
            {isCancelled
              ? `₪${reg.totalPrice.toLocaleString()} · הוחזר`
              : isConfirmed
              ? `₪${reg.totalPrice.toLocaleString()} · ${reg.paymentStatus === "PAID" ? "שולם" : "אושר, טרם חויב"}`
              : `₪${reg.totalPrice.toLocaleString()}`}
          </span>
        )}
        <div className="flex gap-1.5 items-center flex-wrap">
          {showQa && (
            <button type="button"
              onClick={() => onOpenQa(trip.id, trip.title)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1"
              style={{ color: qaColor, border: `1px solid ${qaColor}55` }}
              title="שאלות ותשובות">
              💬 שו״ת{qaState === "unread" ? ` ${qaUnread}` : qaState === "open" ? ` ${qaOpen}` : ""}
            </button>
          )}
          {isPast && !isCancelled && (
            <button type="button" onClick={() => router.push(`/trips/${trip.id}?scroll=reviews`)}
              className="px-2.5 py-1 border border-border rounded-full text-[11px] text-fg-muted">
              כתוב ביקורת
            </button>
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
              <a href={googleCalendarUrl({ title: trip.title, dateISO: trip.date, startTime: trip.startTime, location: trip.meetingPoint })}
                target="_blank" rel="noreferrer"
                className="px-2.5 py-1 border border-[#185FA5]/30 text-[#185FA5] rounded-full text-[11px]">📅 ליומן</a>
              {reg.participantCount > 1 && (
                <button type="button" onClick={doPartialCancel}
                  className="px-2.5 py-1 border border-[#E8A020] text-[#7A5010] rounded-full text-[11px]">
                  בטל 1 מ-{reg.participantCount}
                </button>
              )}
              {/* Free trips: simple cancel here (no refund window/alert). Paid trips
                  cancel via the refund-window alert above (or the trip page). */}
              {isFree && (
                <button type="button" onClick={() => setConfirmCancel(true)}
                  className="px-2.5 py-1 border border-[#C0392B] text-[#C0392B] rounded-full text-[11px]">
                  בטל הרשמה
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cancel confirmation — intermediate screen with exact refund + timing */}
      {confirmCancel && (() => {
        const refund = isConfirmed && !isFree ? computeRefund(trip.cancellationPolicy, trip.date, reg.totalPrice) : null;
        return (
          <div className="px-3 py-3 bg-[#FDF6F5] border-t border-[#C0392B]/20">
            {isFree ? (
              // Free trips: simple cancellation, no refund logic.
              <div className="text-xs text-[#791F1F] mb-2">לבטל את ההרשמה לטיול?</div>
            ) : isConfirmed ? (
              <>
                <div className="text-xs text-[#791F1F] mb-1.5">ביטול ההרשמה — לפי מדיניות הביטולים, בעת ביטול כעת:</div>
                <div className="bg-surface rounded-lg border border-[#C0392B]/15 p-2.5 mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">החזר כספי</span>
                    <span className="font-semibold text-[#0F5038]">
                      ₪{refund!.amount.toLocaleString()} <span className="text-fg-faint font-normal">({refund!.pct}%)</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-fg-faint mt-1.5 leading-relaxed">
                    ההחזר יבוצע מיידית דרך Stripe. הזיכוי בחשבון — בדרך כלל 3-5 ימי עסקים, תלוי בבנק.
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-[#791F1F] mb-2">להסיר מהרשימה?</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmCancel(false)}
                className="px-3 py-1.5 border border-border rounded-full text-xs text-fg-muted bg-surface">
                חזרה
              </button>
              <button type="button" onClick={doCancel} disabled={cancelling}
                className="px-3 py-1.5 bg-[#C0392B] text-white rounded-full text-xs disabled:opacity-60">
                {cancelling ? "מבטל..." : isConfirmed ? "אשר ביטול" : "כן, הסר"}
              </button>
            </div>
          </div>
        );
      })()}
        </>
      }
    />
  );
}

export default function MyTripsPage() {
  const router = useRouter();
  const tm = useTranslations("myTrips");
  const dir = useDir();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"registered" | "waitlist" | "interested" | "selfguided" | "history" | "cancelled">("registered");
  const [purchases, setPurchases] = useState<Array<{ id: string; accessExpiresAt: string | null; purchasedAt: string; trip: { id: string; title: string; region: string; images: string[]; price?: number; durationMin?: number } }>>([]);
  const [qaModal, setQaModal] = useState<{ id: string; title: string } | null>(null);
  const [qaRefresh, setQaRefresh] = useState(0);
  const [reviewFor, setReviewFor] = useState<{ id: string; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Lazily capture any authorized payments whose no-refund window has opened
      await fetch("/api/registrations/capture", { method: "POST" }).catch(() => {});
      const res = await fetch("/api/my-trips");
      if (res.status === 401) { router.push("/auth/login"); return; }
      const data: Registration[] = await res.json();
      setRegs(Array.isArray(data) ? data : []);
      fetch("/api/my-purchases").then((r) => r.ok ? r.json() : []).then((p) => setPurchases(Array.isArray(p) ? p : [])).catch(() => {});
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function removeReg(id: string) {
    setRegs((prev) => prev.filter((r) => r.id !== id));
  }

  const registered = regs.filter((r) => r.status === "CONFIRMED" && new Date(r.trip.date) >= now);
  const waitlist = regs.filter((r) => r.status === "WAITLIST" && new Date(r.trip.date) >= now);
  const interested = regs.filter((r) => r.status === "PENDING" && new Date(r.trip.date) >= now);
  const history = regs.filter((r) => r.status !== "CANCELLED" && new Date(r.trip.date) < now);
  const cancelled = regs.filter((r) => r.status === "CANCELLED");

  const tabs = [
    { key: "registered" as const, label: tm("registered"), count: registered.length },
    { key: "waitlist" as const, label: tm("waitlist"), count: waitlist.length },
    { key: "interested" as const, label: tm("interested"), count: interested.length },
    { key: "selfguided" as const, label: tm("selfGuided"), count: purchases.length },
    { key: "history" as const, label: tm("history"), count: history.length },
    { key: "cancelled" as const, label: tm("cancelled"), count: cancelled.length },
  ];

  const currentList =
    activeTab === "registered" ? registered
    : activeTab === "waitlist" ? waitlist
    : activeTab === "interested" ? interested
    : activeTab === "cancelled" ? cancelled
    : history;

  return (
    <div dir={dir} className="min-h-screen bg-bg">
      <div className="max-w-[480px] mx-auto px-3 py-3 pb-24">

        {/* Top bar */}
        <div className="bg-surface rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2">
          <Brand variant="word" href="/trips" />
          <ThemeToggle className="flex-shrink-0" />
            <LanguageToggle />
          <span className="text-sm font-medium text-fg flex-1 text-center">{tm("title")}</span>
          <ModeIndicator mode="hiker" />
          <AvatarMenu />
        </div>

        {/* Tabs */}
        <div className="bg-surface rounded-xl mb-2 overflow-hidden flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-xs text-center border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#1A6B4A] text-[#1A6B4A] font-medium"
                  : "border-transparent text-fg-muted"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`mr-1 text-[10px] ${activeTab === tab.key ? "text-[#1A6B4A]" : "text-fg-faint"}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-fg-faint text-sm">טוען...</div>
        ) : activeTab === "selfguided" ? (
          purchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">🎒</div>
              <div className="text-fg-muted text-sm">{tm("emptySelfGuided")}</div>
              <Link href="/trips" className="inline-block mt-3 text-[#1A6B4A] text-sm border border-[#1A6B4A] rounded-full px-4 py-1.5">גלה טיולים עצמאיים</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {purchases.map((p) => {
                const isFree = p.trip.price === 0;
                const expired = !isFree && p.accessExpiresAt ? new Date(p.accessExpiresAt) < new Date() : false;
                return (
                  <TripCardVisual
                    key={p.id}
                    trip={{
                      id: p.trip.id, title: p.trip.title, region: p.trip.region, difficulty: "",
                      date: p.purchasedAt, images: p.trip.images, tripType: "SELF_GUIDED", price: p.trip.price,
                    }}
                    href={`/trips/${p.trip.id}`}
                    isPurchased
                    accessExpiresAt={p.accessExpiresAt}
                    footer={
                      expired ? (
                        <button type="button" onClick={() => router.push(`/trips/${p.trip.id}`)}
                          className="mt-1 px-3 py-1.5 rounded-full text-[11px] font-medium border border-[#C0392B] text-[#C0392B]">פג תוקף — רכוש מחדש</button>
                      ) : (
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <button type="button" onClick={() => router.push(`/trips/${p.trip.id}/start?mode=field`)}
                            className="px-3 py-1.5 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">▶ התחל / המשך</button>
                          <button type="button" onClick={() => router.push(`/trips/${p.trip.id}/start?mode=browse`)}
                            className="px-3 py-1.5 border border-[#1A6B4A]/40 text-[#1A6B4A] rounded-full text-[11px] font-medium">📖 למד על הטיול</button>
                          {(() => {
                            // Review unlocks (durationHours − 2) after purchase; ≤2h trips unlock at once.
                            const durH = (p.trip.durationMin ?? 0) / 60;
                            const unlockMs = new Date(p.purchasedAt).getTime() + Math.max(durH - 2, 0) * 3_600_000;
                            const hoursLeft = Math.ceil((unlockMs - Date.now()) / 3_600_000);
                            return hoursLeft <= 0 ? (
                              <button type="button" onClick={() => setReviewFor({ id: p.trip.id, title: p.trip.title })}
                                className="px-3 py-1.5 border border-[#E8A020] text-[#7A5010] rounded-full text-[11px] font-medium">⭐ כתוב ביקורת</button>
                            ) : (
                              <span className="px-3 py-1.5 text-[11px] text-fg-faint">🔒 ביקורת תתאפשר בעוד {hoursLeft} שעות</span>
                            );
                          })()}
                        </div>
                      )
                    }
                  />
                );
              })}
            </div>
          )
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">
              {activeTab === "registered" ? "🏕" : activeTab === "waitlist" ? "⏳" : activeTab === "interested" ? "👀" : activeTab === "cancelled" ? "🚫" : "📋"}
            </div>
            <div className="text-fg-muted text-sm">
              {activeTab === "registered" ? tm("emptyRegistered") :
               activeTab === "waitlist" ? tm("emptyWaitlist") :
               activeTab === "interested" ? tm("emptyInterested") :
               activeTab === "cancelled" ? tm("emptyCancelled") :
               tm("emptyHistory")}
            </div>
            <Link href="/trips"
              className="inline-block mt-3 text-[#1A6B4A] text-sm border border-[#1A6B4A] rounded-full px-4 py-1.5">
              גלה טיולים
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentList.map((reg) => (
              <TripCard key={reg.id} reg={reg} onCancel={removeReg} qaRefresh={qaRefresh} onOpenQa={(id, title) => setQaModal({ id, title })} />
            ))}
          </div>
        )}
      </div>

      {qaModal && (
        <QAModal tripId={qaModal.id} tripTitle={qaModal.title} onClose={() => { setQaModal(null); setQaRefresh((x) => x + 1); }} />
      )}

      {reviewFor && (
        <SelfGuidedReviewModal tripId={reviewFor.id} tripTitle={reviewFor.title} onClose={() => setReviewFor(null)} />
      )}
    </div>
  );
}

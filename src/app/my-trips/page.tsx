"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { googleCalendarUrl } from "@/lib/calendar";
import { coverImages } from "@/lib/tripImage";
import AvatarMenu from "@/components/AvatarMenu";
import Brand from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import ModeIndicator from "@/components/ModeIndicator";
import { useDateFmt } from "@/components/CalendarModeProvider";

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

// Remaining access time for a purchased self-guided trip (green >7d, amber 2-7d, red <2d, muted expired).
function accessRemaining(iso: string | null | undefined): { text: string; color: string } {
  if (!iso) return { text: "🔓 גישה פעילה", color: "#1A6B4A" };
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: "⏳ פג תוקף", color: "#9ca3af" };
  if (days < 2) return { text: "⏳ פג תוקף בעוד יומיים", color: "#C0392B" };
  const color = days > 7 ? "#1A6B4A" : "#B45309";
  return { text: `⏳ זמין עוד ${days} ימים`, color };
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
  const dfmt = useDateFmt();
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
  async function doPartialCancel() {
    const res = await fetch(`/api/registrations/${reg.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reduceBy: 1 }),
    });
    if (res.ok) window.location.reload();
  }

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden" style={{ opacity: isCancelled ? 0.7 : 1 }}>
      <div className="flex">
        {/* Image */}
        <div className="w-24 flex-shrink-0" style={{ minHeight: 90 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImages(trip.images, trip.id, { region: trip.region, title: trip.title })[0]} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Body */}
        <div className="flex-1 p-3 min-w-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-1.5"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </div>
          <div className="text-sm font-medium text-fg leading-snug mb-1 truncate">{trip.title}</div>
          <div className="flex flex-col gap-0.5 text-xs text-fg-muted">
            <span>📅 {isPast ? dfmt(trip.date, { long: true, weekday: true, greg: { weekday: "long", day: "numeric", month: "long" } }) : dfmt(trip.date, { greg: { weekday: "short", day: "numeric", month: "short" } })} · {trip.startTime}</span>
            <span>👤 {guideName}</span>
            {trip.meetingPoint && <span>📍 {trip.meetingPoint}</span>}
          </div>
          {isWaitlist && reg.waitlistPosition && (
            <div className="inline-flex items-center gap-1 text-[11px] text-[#185FA5] bg-[#E6F1FB] rounded-full px-2 py-0.5 mt-1.5">
              👥 מקום {reg.waitlistPosition} ברשימה
            </div>
          )}
          {isPending && reg.conditions && reg.conditions.length > 0 && (
            <div className="text-[11px] text-[#7A5010] bg-[#FDF3DC] rounded-lg px-2 py-1 mt-1.5">
              ⚙ {reg.autoRegister ? "אירשם אוטומטית אם" : "התראה אם"}: {reg.conditions.join(" וגם ")}
            </div>
          )}
          {isPending && reg.interestThreshold && (
            <div className="text-[11px] text-[#185FA5] bg-[#EEF5FC] rounded-lg px-2 py-1 mt-1.5">
              🔔 התראה כשנותרו {reg.interestThreshold} מקומות
            </div>
          )}
          {isPending && !reg.conditions?.length && !reg.interestThreshold && reg.notes && (
            <div className="text-[11px] text-fg-faint mt-1 truncate">⚙ {reg.notes}</div>
          )}
        </div>
      </div>

      {/* Alert strip for upcoming paid trips close to non-refundable */}
      {showAlert && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#FDF3DC] border-t border-[#EF9F27]">
          <span className="text-xs text-[#633806] flex-1">
            ⏰ החיוב יתבצע ב-{dfmt(trip.date, { greg: { weekday: "short", day: "numeric", month: "short" } })} — עוד {daysUntil} ימים
          </span>
          <button type="button" onClick={() => setConfirmCancel(true)}
            className="text-[11px] text-[#854F0B] font-medium underline">
            בטל עכשיו להחזר מלא
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-2/60">
        <span className="text-xs font-medium text-fg">
          {isCancelled
            ? `₪${reg.totalPrice.toLocaleString()} · הוחזר`
            : isConfirmed
            ? `₪${reg.totalPrice.toLocaleString()} · ${reg.paymentStatus === "PAID" ? "שולם" : "אושר, טרם חויב"}`
            : `₪${reg.totalPrice.toLocaleString()}`}
        </span>
        <div className="flex gap-1.5">
          {isPast && !isCancelled && (
            <>
              <button type="button" onClick={() => router.push(`/trips/${trip.id}`)}
                className="px-2.5 py-1 border border-border rounded-full text-[11px] text-fg-muted">
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
              <a href={googleCalendarUrl({ title: trip.title, dateISO: trip.date, startTime: trip.startTime, location: trip.meetingPoint })}
                target="_blank" rel="noreferrer"
                className="px-2.5 py-1 border border-[#185FA5]/30 text-[#185FA5] rounded-full text-[11px]">📅 ליומן</a>
              <button type="button" onClick={() => router.push(`/trips/${trip.id}`)}
                className="px-2.5 py-1 border border-border rounded-full text-[11px] text-fg-muted">
                שאלה למדריך
              </button>
              {reg.participantCount > 1 && (
                <button type="button" onClick={doPartialCancel}
                  className="px-2.5 py-1 border border-[#E8A020] text-[#7A5010] rounded-full text-[11px]">
                  בטל 1 מ-{reg.participantCount}
                </button>
              )}
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

      {/* Cancel confirmation — intermediate screen with exact refund + timing */}
      {confirmCancel && (() => {
        const refund = isConfirmed ? computeRefund(trip.cancellationPolicy, trip.date, reg.totalPrice) : null;
        return (
          <div className="px-3 py-3 bg-[#FDF6F5] border-t border-[#C0392B]/20">
            {isConfirmed ? (
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
    </div>
  );
}

export default function MyTripsPage() {
  const router = useRouter();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "interested" | "past" | "selfguided">("upcoming");
  const [purchases, setPurchases] = useState<Array<{ id: string; accessExpiresAt: string | null; trip: { id: string; title: string; region: string; images: string[] } }>>([]);

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
    { key: "selfguided" as const, label: "עצמאיים", count: purchases.length },
  ];

  const currentList = activeTab === "upcoming" ? upcoming : activeTab === "interested" ? interested : past;

  return (
    <div dir="rtl" className="min-h-screen bg-bg">
      <div className="max-w-[480px] mx-auto px-3 py-3 pb-24">

        {/* Top bar */}
        <div className="bg-surface rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2">
          <Brand href="/trips" />
          <ThemeToggle className="flex-shrink-0" />
          <span className="text-sm font-medium text-fg flex-1 text-center">הטיולים שלי</span>
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
              <div className="text-fg-muted text-sm">עוד לא רכשת טיולים עצמאיים</div>
              <Link href="/trips" className="inline-block mt-3 text-[#1A6B4A] text-sm border border-[#1A6B4A] rounded-full px-4 py-1.5">גלה טיולים עצמאיים</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {purchases.map((p) => {
                const expired = p.accessExpiresAt ? new Date(p.accessExpiresAt) < new Date() : false;
                return (
                  <div key={p.id} className="bg-surface rounded-2xl border border-border overflow-hidden flex">
                    <div className="w-24 flex-shrink-0" style={{ minHeight: 90 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverImages(p.trip.images, p.trip.id, { region: p.trip.region, title: p.trip.title })[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="text-sm font-medium text-fg truncate">{p.trip.title}</div>
                        <div className="text-xs text-fg-faint mt-0.5">📍 {p.trip.region}</div>
                        {(() => { const r = accessRemaining(p.accessExpiresAt); return (
                          <div className="text-[11px] mt-1 font-semibold" style={{ color: r.color }}>{r.text}</div>
                        ); })()}
                      </div>
                      {!expired && (
                        <button type="button" onClick={() => router.push(`/trips/${p.trip.id}/start`)}
                          className="self-start mt-2 px-3 py-1.5 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">▶ התחל / המשך</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">
              {activeTab === "upcoming" ? "🏕" : activeTab === "interested" ? "👀" : "📋"}
            </div>
            <div className="text-fg-muted text-sm">
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

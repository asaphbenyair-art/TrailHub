"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLabels } from "@/components/useLabels";
import { useDateFmt } from "@/components/CalendarModeProvider";
import { coverImages } from "@/lib/tripImage";

// ── Shared trip-card visual — single source of truth for every surface ──
// (search results, My Trips, guide dashboard, guides directory). The hero,
// tags, title/guide overlay, meta stats and capacity bar are identical
// everywhere; surface-specific pieces (status strip, indicators, action row)
// are passed in as slots.

const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:    { bg: "#EAF3DE", color: "#27500A" },
  MEDIUM:  { bg: "#FAEEDA", color: "#633806" },
  HARD:    { bg: "#FADBD8", color: "#791F1F" },
  EXTREME: { bg: "#E8D0D0", color: "#4A0F0F" },
};
const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];

export function avatarColor(name: string | null) {
  if (!name) return "#999";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}
// Remaining access time for a purchased self-guided trip.
export function accessRemaining(iso: string | null | undefined): { text: string; color: string } {
  if (!iso) return { text: "🔓 גישה פעילה", color: "#1A6B4A" };
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: "⏳ פג תוקף", color: "#9ca3af" };
  if (days < 2) return { text: "⏳ פג תוקף בעוד יומיים", color: "#C0392B" };
  const color = days > 7 ? "#1A6B4A" : "#B45309";
  return { text: `⏳ זמין עוד ${days} ימים`, color };
}

export interface TripCardTrip {
  id: string; title: string; region: string; difficulty: string; status?: string;
  date: string; startTime?: string; durationMin?: number; distanceKm?: number;
  price?: number; maxSpots?: number; spotsBooked?: number; images: string[];
  tripType?: string; endDate?: string | null; _count?: { days: number }; accessWindowDays?: number | null;
  cardLogo?: string | null; genderRestriction?: string;
  guide?: { rating?: number; user?: { name: string | null } } | null;
  guides?: { role: string; guide: { user: { name: string | null } } }[];
}

export function tripDayCount(t: TripCardTrip): number {
  if (t._count?.days) return t._count.days;
  if (t.endDate) {
    const days = Math.round((new Date(t.endDate).getTime() - new Date(t.date).getTime()) / 86400000) + 1;
    return Math.max(days, 2);
  }
  return 0;
}

// Sliding image hero with staggered cross-fade.
function TripCardHero({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5500);
    return () => clearInterval(t);
  }, [images.length]);
  if (images.length === 0) {
    return <div className="w-full h-full" style={{ background: "linear-gradient(160deg,#3d6b35,#1a3d16)" }} />;
  }
  return (
    <>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: i === idx ? 1 : 0, transition: "opacity 1400ms ease-in-out", willChange: "opacity" }} />
      ))}
    </>
  );
}

interface TripCardProps {
  trip: TripCardTrip;
  href?: string;                     // whole-card navigation (default /trips/[id])
  onCardClick?: () => void;          // overrides href navigation
  favorite?: boolean;
  onToggleFav?: () => void;          // heart hidden if omitted
  isPurchased?: boolean;             // self-guided: purchased
  accessExpiresAt?: string | null;   // self-guided: remaining-access meta
  topStrip?: ReactNode;              // banner above the hero (status)
  heroActions?: ReactNode;           // corner actions on the hero (e.g. guide edit/delete)
  indicators?: ReactNode;            // Q&A + rideshare cluster in the stats row
  onOpenParticipants?: () => void;   // capacity "participant list" link
  footer?: ReactNode;                // price/action row under the capacity bar
  dateLabelOverride?: string;        // e.g. My Trips dual dates
}

export default function TripCard({
  trip, href, onCardClick, favorite, onToggleFav, isPurchased, accessExpiresAt,
  topStrip, heroActions, indicators, onOpenParticipants, footer, dateLabelOverride,
}: TripCardProps) {
  const router = useRouter();
  const tcard = useTranslations("card");
  const L = useLabels();
  const dfmt = useDateFmt();

  const isSG = trip.tripType === "SELF_GUIDED";
  const isJourney = !!trip.tripType && trip.tripType !== "DAY_HIKE" && !isSG;
  const maxSpots = trip.maxSpots ?? 0;
  const spotsBooked = trip.spotsBooked ?? 0;
  const spotsLeft = Math.max(maxSpots - spotsBooked, 0);
  const occupancy = maxSpots > 0 ? spotsBooked / maxSpots : 0;
  const isFull = trip.status === "FULL" || occupancy >= 1;
  const guideName = trip.guide?.user?.name ?? null;
  const diff = DIFF_STYLE[trip.difficulty];
  const nDays = tripDayCount(trip);

  const dateMeta = dateLabelOverride
    ? `📅 ${dateLabelOverride}`
    : `📅 ${dfmt(trip.date, { greg: { weekday: "short", day: "numeric", month: "short" } })}`;

  const meta: { t: string; color?: string }[] = isSG
    ? [
        { t: `🎒 ${tcard("selfGuided")}` },
        ...(trip.price === 0
          ? [{ t: `♾ ${tcard("freeAccess")}` }]
          : [isPurchased
              ? (() => { const r = accessRemaining(accessExpiresAt); return { t: r.text, color: r.color }; })()
              : { t: `🔓 ${tcard("accessDays", { n: trip.accessWindowDays ?? 30 })}` }]),
        ...((trip.distanceKm ?? 0) > 0 ? [{ t: `📍 ${trip.distanceKm} ${tcard("km")}` }] : []),
      ]
    : isJourney
    ? [
        { t: `${dateMeta}${trip.endDate ? `–${dfmt(trip.endDate, { greg: { day: "numeric", month: "short" } })}` : ""}` },
        ...(nDays > 1 ? [{ t: `🌙 ${tcard("nights", { n: nDays - 1 })}` }] : []),
        ...((trip.distanceKm ?? 0) > 0 ? [{ t: `📍 ${trip.distanceKm} ${tcard("kmTotal")}` }] : []),
      ]
    : [
        { t: dateMeta },
        ...(trip.startTime ? [{ t: `🕖 ${trip.startTime}` }] : []),
        ...((trip.distanceKm ?? 0) > 0 ? [{ t: `📍 ${trip.distanceKm} ${tcard("km")}` }] : []),
        ...((trip.durationMin ?? 0) > 0 ? [{ t: `⏱ ${Math.round((trip.durationMin ?? 0) / 60)} ${tcard("hrs")}` }] : []),
      ];
  const gender = trip.genderRestriction && trip.genderRestriction !== "ALL"
    ? [{ t: trip.genderRestriction === "MEN" ? tcard("menOnly") : tcard("womenOnly"), color: "#7A5010" }]
    : [];

  const secName = trip.guides?.find((g) => g.role === "SECONDARY")?.guide?.user?.name ?? null;

  function navigate() {
    if (onCardClick) onCardClick();
    else router.push(href ?? `/trips/${trip.id}`);
  }

  return (
    <div className="bg-surface rounded-2xl overflow-hidden border border-border cursor-pointer" onClick={navigate}>
      {topStrip}

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        <TripCardHero images={coverImages(trip.images, trip.id, { region: trip.region, title: trip.title })} title={trip.title} />

        <div className={`absolute top-2.5 ${L.en ? "left-2.5" : "right-2.5"} flex gap-1.5 z-10`} dir={L.dir}>
          {trip.tripType && trip.tripType !== "DAY_HIKE" && !isSG && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "#2C5F8A", color: "#fff" }}>
              {tcard("journeyDays", { n: nDays || 0 })}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.92)", color: "#27500A" }}>
            📍 {L.region(trip.region)}
          </span>
          {diff && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={diff}>
              {L.difficulty(trip.difficulty)}
            </span>
          )}
        </div>

        {trip.images?.length > 1 && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1 z-10">
            {trip.images.map((_, i) => (<div key={i} className="w-1 h-1 rounded-full bg-surface/60" />))}
          </div>
        )}

        {onToggleFav && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            className={`absolute top-2.5 ${L.en ? "right-2.5" : "left-2.5"} bg-black/40 rounded-full w-7 h-7 flex items-center justify-center text-sm z-10`}
            style={{ color: favorite ? "#ff6b81" : "#fff" }}>
            {favorite ? "♥" : "♡"}
          </button>
        )}
        {heroActions && (
          <div className={`absolute top-2.5 ${L.en ? "right-2.5" : "left-2.5"} flex gap-1.5 z-10`} onClick={(e) => e.stopPropagation()}>
            {heroActions}
          </div>
        )}
        {trip.cardLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.cardLogo} alt="" className={`absolute bottom-2.5 ${L.en ? "right-2.5" : "left-2.5"} w-10 h-10 rounded-lg bg-white object-contain p-1 shadow-md z-20`} />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 z-10" dir="rtl"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.68),transparent)" }}>
          <div className="text-[13px] font-medium text-white leading-snug mb-1.5 text-right">{trip.title}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/85">
            <div className="flex flex-shrink-0">
              <div className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[8px] font-medium text-white border border-white/40"
                style={{ background: avatarColor(guideName) }}>
                {initials(guideName)}
              </div>
              {secName && (
                <div className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[8px] font-medium text-white border border-white/40"
                  style={{ background: avatarColor(secName), marginRight: -6 }}>
                  {initials(secName)}
                </div>
              )}
            </div>
            {secName ? `${guideName || "מדריך"} ו${secName}` : (guideName || "מדריך")}
            {(trip.guide?.rating ?? 0) > 0 ? ` · ★${trip.guide!.rating!.toFixed(1)}` : ""}
          </div>
        </div>
      </div>

      {/* Meta + capacity + footer */}
      <div className="px-3 pt-2 pb-2.5">
        <div className="flex items-end justify-between gap-2 mb-2">
          <div className="flex flex-wrap" style={{ gap: 0 }}>
            {[...gender, ...meta].map((m, i, arr) => (
              <span key={i} className="text-[11px] text-fg-muted"
                style={{ paddingLeft: i < arr.length - 1 ? 8 : 0, marginLeft: i < arr.length - 1 ? 8 : 0, borderLeft: i < arr.length - 1 ? "1px solid #eee" : "none", ...(m.color ? { color: m.color, fontWeight: 600 } : {}) }}>
                {m.t}
              </span>
            ))}
          </div>
          {indicators && <div className="flex items-start gap-3 shrink-0">{indicators}</div>}
        </div>
        {!isSG && maxSpots > 0 && (
          <div className="mb-2">
            <div className="h-[3px] bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(occupancy * 100, 100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }} />
            </div>
            <div className="flex justify-between text-[10px] text-fg-faint mt-1">
              <span>
                {tcard("registeredOf", { booked: spotsBooked, max: maxSpots })}
                {onOpenParticipants && (
                  <>
                    {" · "}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onOpenParticipants(); }}
                      className="text-[#185FA5] underline underline-offset-2 hover:text-[#134e73] cursor-pointer">
                      {tcard("participantList")}
                    </button>
                  </>
                )}
              </span>
              <span style={{ color: isFull ? "#C0392B" : "#1A6B4A", fontWeight: 500 }}>
                {isFull ? tcard("full") : tcard("spotsRemaining", { n: spotsLeft })}
              </span>
            </div>
          </div>
        )}
        {footer && <div onClick={(e) => e.stopPropagation()}>{footer}</div>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Heart, Star, Mountain, Clock, Calendar, MapPin } from "lucide-react";
import { coverImages } from "@/lib/tripImage";
import { useDateFmt } from "@/components/CalendarModeProvider";

export interface TripCardData {
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
  tripType?: string;
  dayCount?: number;
  accessWindowDays?: number | null;
  guideName: string | null;
  guideRating?: number;
}

const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };
const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];

function avatarColor(name: string | null) {
  if (!name) return "#777";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}
/** Staggered cross-fade cover — never a hard swap. */
function Cover({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5500);
    return () => clearInterval(t);
  }, [images.length]);
  if (images.length === 0) {
    return <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#2f5330,#0f2210)" }} />;
  }
  return (
    <>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out"
          style={{ opacity: i === idx ? 1 : 0, transitionDuration: "1100ms" }} />
      ))}
    </>
  );
}

/**
 * Editorial trip card (Design System): large full-width photo (~60% height),
 * dark gradient overlay, Playfair title over the image, minimal guide row on
 * the photo, stats row + capacity bar below.
 */
export default function TripCard({
  trip,
  onClick,
  favorite,
  onToggleFavorite,
}: {
  trip: TripCardData;
  onClick?: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const dfmt = useDateFmt();
  const isSelfGuided = trip.tripType === "SELF_GUIDED";
  const isJourney = (trip.dayCount ?? 0) > 1;
  const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 0);
  const occ = trip.maxSpots > 0 ? trip.spotsBooked / trip.maxSpots : 0;
  const isFull = !isSelfGuided && (trip.status === "FULL" || occ >= 1);
  const guideName = trip.guideName ?? "מדריך";
  const hours = trip.durationMin ? Math.round(trip.durationMin / 60) : 0;

  return (
    <article
      onClick={onClick}
      className="rounded-3xl overflow-hidden bg-surface border border-border cursor-pointer"
      style={{ opacity: isFull ? 0.85 : 1 }}
    >
      {/* Cover ~ 60% of the card */}
      <div className="relative w-full" style={{ height: 220 }}>
        <Cover images={coverImages(trip.images, trip.id, { region: trip.region, title: trip.title })} title={trip.title} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 4%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.15))" }} />

        {/* Top row: badges + favorite */}
        <div className="absolute top-3 inset-x-3 flex items-start justify-between">
          <div className="flex gap-1.5">
            {isJourney && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white backdrop-blur-sm" style={{ background: "rgba(200,137,58,0.92)" }}>
                מסע · {trip.dayCount} ימים
              </span>
            )}
            {isSelfGuided && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white backdrop-blur-sm" style={{ background: "rgba(61,143,95,0.92)" }}>
                טיול עצמאי
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white/95 backdrop-blur-sm bg-black/35">
              {DIFF_LABEL[trip.difficulty] ?? trip.difficulty}
            </span>
          </div>
          {onToggleFavorite && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
              <Heart size={16} className="text-white" fill={favorite ? "#fff" : "none"} />
            </button>
          )}
        </div>

        {isFull && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white bg-danger">
            מלא
          </span>
        )}

        {/* Bottom of image: title + guide */}
        <div className="absolute bottom-0 inset-x-0 p-4">
          <div className="flex items-center gap-1 text-white/85 text-[11px] mb-1">
            <MapPin size={11} /> {trip.region}
          </div>
          <h3 className="font-display text-white text-xl leading-tight mb-2">{trip.title}</h3>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ background: avatarColor(guideName) }}>
              {initials(guideName)}
            </span>
            <span className="text-white/90 text-xs">{guideName}</span>
            {trip.guideRating != null && trip.guideRating > 0 && (
              <span className="flex items-center gap-0.5 text-white/90 text-xs">
                <Star size={11} fill="#e8b84a" color="#e8b84a" /> {trip.guideRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row + capacity */}
      <div className="p-3.5">
        <div className="flex items-center justify-between text-fg-muted text-xs">
          <div className="flex items-center gap-3">
            {trip.distanceKm > 0 && (
              <span className="flex items-center gap-1"><Mountain size={13} /> {trip.distanceKm} ק״מ</span>
            )}
            {hours > 0 && (
              <span className="flex items-center gap-1"><Clock size={13} /> {hours} שע׳</span>
            )}
            {!isSelfGuided && (
              <span className="flex items-center gap-1"><Calendar size={13} /> {dfmt(trip.date, { greg: { weekday: "short", day: "numeric", month: "short" } })}</span>
            )}
          </div>
          <span className="text-fg font-semibold text-sm">
            ₪{trip.price.toLocaleString("he-IL")}
          </span>
        </div>

        {!isSelfGuided ? (
          <div className="mt-3">
            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(occ * 100, 100)}%`, background: isFull ? "var(--danger)" : "var(--accent)" }} />
            </div>
            <div className="flex justify-between text-[10px] text-fg-faint mt-1">
              <span>{trip.spotsBooked}/{trip.maxSpots} רשומים</span>
              <span style={{ color: isFull ? "var(--danger)" : "var(--accent)" }}>
                {isFull ? "רשימת המתנה" : `${spotsLeft} מקומות`}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-[10px] text-fg-faint">
            זמין תמיד · גישה ל-{trip.accessWindowDays ?? 30} ימים
          </div>
        )}
      </div>
    </article>
  );
}

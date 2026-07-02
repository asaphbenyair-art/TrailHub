"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import RideshareBoard from "@/components/RideshareBoard";
import { TAG_LABEL } from "@/lib/tripTags";
import { googleCalendarUrl } from "@/lib/calendar";
import { coverImages } from "@/lib/tripImage";
import {
  ArrowRight, Heart, Share2, Bell, Star, UserPlus, Check, MapPin, Navigation,
  Clock, Mountain, Users, Calendar, Backpack, Copy, BookOpen, MessageCircle,
  FileText, Link2, ChevronDown, X, Play, PauseCircle, ExternalLink, TrendingUp,
} from "lucide-react";

const TripDetailMap = dynamic(() => import("@/components/TripDetailMap"), { ssr: false });

const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };
const ROUTE_TYPE_LABEL: Record<string, string> = {
  "one-way": "חד-כיווני", "circular-nature": "מעגלי — שטח", "circular-urban": "מעגלי — עירוני",
};
const FITNESS_LABEL: Record<string, string> = { low: "נמוך", medium: "בינוני", high: "גבוה", excellent: "מצוין" };

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
function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}
function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
}
function formatDuration(min: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}:${String(m).padStart(2, "0")}` : `${h}`;
}

interface Review { id: string; rating: number; comment: string | null; user: { name: string | null } }
interface SourceMaterial { type: "pdf" | "link"; url: string; title: string; description?: string }
interface Waypoint { lat: number; lng: number; label: string; description?: string; sources?: SourceMaterial[] }

// ── Section heading (Playfair) ──
function Heading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} style={{ color: "var(--accent)" }} strokeWidth={2} />
      <h2 className="font-display text-lg text-fg">{children}</h2>
    </div>
  );
}

function SourceList({ items }: { items: SourceMaterial[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((m, i) => (
        <div key={i}>
          <a href={m.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-accent">
            {m.type === "pdf" ? <FileText size={14} /> : <Link2 size={14} />}{m.title}
            <ExternalLink size={11} className="opacity-60" />
          </a>
          {m.description && <div className="text-xs text-fg-faint pr-5 mt-0.5">{m.description}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Staggered cross-fade hero ──
function HeroSlideshow({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5500);
    return () => clearInterval(t);
  }, [images.length]);
  if (images.length === 0) {
    return <div className="w-full h-full" style={{ background: "linear-gradient(160deg,#2f5330,#0f2210)" }} />;
  }
  return (
    <>
      {/* Stacked images — each fades independently (staggered cross-fade, one at
          a time), never a synchronized swap. */}
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: i === idx ? 1 : 0, transition: "opacity 1400ms ease-in-out", willChange: "opacity" }} />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1 z-10">
          {images.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ background: i === idx ? "#fff" : "rgba(255,255,255,0.45)" }} />
          ))}
        </div>
      )}
    </>
  );
}

// ── Elevation profile from GPX ──
function parseElevations(gpx: string | null | undefined): number[] {
  if (!gpx) return [];
  const eles: number[] = [];
  const re = /<ele>\s*(-?[\d.]+)\s*<\/ele>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(gpx)) !== null) {
    const v = parseFloat(m[1]);
    if (!Number.isNaN(v)) eles.push(v);
  }
  return eles;
}

function ElevationChart({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const W = 320, H = 90, pad = 4;
  const N = Math.min(points.length, 90);
  const stride = points.length / N;
  const sampled = Array.from({ length: N }, (_, i) => points[Math.floor(i * stride)]);
  const min = Math.min(...sampled), max = Math.max(...sampled);
  const range = max - min || 1;
  const xs = (i: number) => pad + (i / (N - 1)) * (W - 2 * pad);
  const ys = (v: number) => pad + (1 - (v - min) / range) * (H - 2 * pad);
  const line = sampled.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
  let gain = 0;
  for (let i = 1; i < points.length; i++) { const d = points[i] - points[i - 1]; if (d > 0) gain += d; }
  return (
    <div className="rounded-2xl p-3.5 border border-border bg-surface">
      <div className="flex justify-between text-[11px] text-fg-faint mb-1">
        <span className="flex items-center gap-1"><TrendingUp size={12} /> פרופיל גובה</span>
        <span>{Math.round(min)}–{Math.round(max)} מ׳ · טיפוס {Math.round(gain)} מ׳</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
        <polygon points={area} fill="var(--accent)" opacity={0.18} />
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

interface TripDay {
  id: string; dayNumber: number; title: string | null; description: string | null;
  distanceKm: number | null; durationMin: number | null; startPoint: string | null;
  endPoint: string | null; date: string | null; startTime: string | null;
  isRestDay: boolean; equipment: string | null;
}

function JourneyTimeline({ days }: { days: TripDay[] }) {
  const [open, setOpen] = useState<number | null>(days[0]?.dayNumber ?? null);
  return (
    <div>
      <Heading icon={MapPin}>מסלול המסע — {days.length} ימים</Heading>
      <div className="flex flex-col gap-2">
        {days.map((d) => {
          const isOpen = open === d.dayNumber;
          return (
            <div key={d.id} className="border border-border rounded-2xl overflow-hidden bg-surface">
              <button type="button" onClick={() => setOpen(isOpen ? null : d.dayNumber)}
                className="w-full flex items-center gap-3 px-3 py-3 text-right">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                  {d.dayNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-fg truncate">
                    {d.isRestDay ? "🛖 " : ""}{d.title || `יום ${d.dayNumber}`}
                  </div>
                  <div className="text-[11px] text-fg-faint">
                    {d.date ? new Date(d.date).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" }) : ""}
                    {d.startTime ? ` · ${d.startTime}` : ""}
                    {!d.isRestDay && d.distanceKm ? ` · ${d.distanceKm} ק״מ` : ""}
                  </div>
                </div>
                <ChevronDown size={16} className={`text-fg-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 text-xs text-fg-muted flex flex-col gap-1.5 border-t border-border">
                  {d.isRestDay && <div className="text-amber">יום מנוחה — ללא מסלול</div>}
                  {d.description && <p className="leading-relaxed">{d.description}</p>}
                  {!d.isRestDay && (d.startPoint || d.endPoint) && (
                    <div>📍 {d.startPoint || "—"} ← {d.endPoint || "—"}</div>
                  )}
                  {!d.isRestDay && d.durationMin ? <div>⏱ {Math.round(d.durationMin / 60)} שעות</div> : null}
                  {d.equipment && <div>🎒 {d.equipment}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Trip {
  id: string; title: string; description: string | null; region: string; difficulty: string;
  status: string; date: string; startTime: string; durationMin: number; distanceKm: number;
  price: number; maxSpots: number; spotsBooked: number; images: string[]; meetingPoint: string | null;
  waypoints: string | null;
  waypointsJson: { lat?: number; lng?: number; name?: string; description?: string }[] | null;
  routeGpx: string | null; whatToBring: string | null; cancellationPolicy: string | null;
  routeType: string | null; minAge: number | null; maxAge: number | null; fitnessLevel: string | null;
  attributeTags: string[] | null;
  registrationFields: { id: string; label: string; type: string; required: boolean; options: string[] }[] | null;
  sourceMaterials: SourceMaterial[] | null; sourceMaterialsVisibility: string | null;
  postponeCategory?: string | null; postponeReason?: string | null;
  guide: { id: string; rating: number; reviewCount: number; yearsActive: number | null; user: { name: string | null; image: string | null } };
  guides?: { role: string; guide: { id?: string; rating?: number; reviewCount?: number; user: { name: string | null; image?: string | null } } }[];
  tripType?: string; endDate?: string | null; registrationMode?: string; accessWindowDays?: number | null;
  days?: TripDay[]; reviews: Review[];
}

const REG_STATUS_UI: Record<string, { bg: string; color: string; text: string }> = {
  CONFIRMED: { bg: "rgba(61,143,95,0.18)", color: "#7fd4a3", text: "✓ רשום לטיול" },
  WAITLIST:  { bg: "rgba(44,95,138,0.22)", color: "#8fc0e8", text: "⏰ ברשימת המתנה" },
  PENDING:   { bg: "var(--surface-2)", color: "var(--fg-muted)", text: "👀 מתעניין" },
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [myRegStatus, setMyRegStatus] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [fav, setFav] = useState(false);
  const [purchase, setPurchase] = useState<{ purchased: boolean; expired?: boolean } | null>(null);
  const [showLoc, setShowLoc] = useState(false);
  const [focusWp, setFocusWp] = useState<number | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false); // closed by default (spec)
  const [copied, setCopied] = useState(false);
  const [drawer, setDrawer] = useState<Waypoint | null>(null);

  async function requestRefund() {
    const reason = window.prompt("סיבת בקשת ההחזר (פגם בתוכן / רכישה בטעות / אחר):");
    if (!reason?.trim()) return;
    const res = await fetch("/api/complaints", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: id, category: "refund_request", body: reason }),
    });
    window.alert(res.ok ? "הבקשה נשלחה למנהלי הפלטפורמה ולמדריך. תיבדק בהקדם." : "שגיאה");
  }

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDone, setReviewDone] = useState(false);

  async function submitReview() {
    if (!reviewRating) return;
    const res = await fetch(`/api/trips/${id}/reviews`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
    });
    if (res.ok) setReviewDone(true);
  }

  const isSelfGuided = trip?.tripType === "SELF_GUIDED";
  useEffect(() => {
    if (!isSelfGuided || !id) return;
    fetch(`/api/trips/${id}/purchase`).then((r) => r.json()).then(setPurchase).catch(() => {});
  }, [isSelfGuided, id]);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = trip?.title ?? "TrailHub";
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
  }

  const guideId = trip?.guide?.id;
  useEffect(() => {
    if (!session || !guideId) return;
    fetch(`/api/guides/${guideId}/follow`).then((r) => r.json())
      .then((d) => setFollowing(!!d.following)).catch(() => {});
  }, [session, guideId]);

  async function toggleFollow() {
    if (!session) { router.push("/auth/login"); return; }
    if (!guideId) return;
    const next = !following;
    setFollowing(next);
    await fetch(`/api/guides/${guideId}/follow`, { method: next ? "POST" : "DELETE" }).catch(() => setFollowing(!next));
  }

  interface Question {
    id: string; body: string; answer: string | null; answeredAt: string | null;
    createdAt: string; official?: boolean; user: { name: string | null; image: string | null };
  }
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qaBody, setQaBody] = useState("");
  const [qaLoading, setQaLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${id}`).then((r) => r.json())
      .then((d) => { if (d.error) setNotFound(true); else setTrip(d); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/my-trips").then((r) => r.json())
      .then((regs: Array<{ status: string; trip: { id: string } }>) => {
        if (!Array.isArray(regs)) return;
        const found = regs.find((r) => r.trip.id === id);
        if (found) setMyRegStatus(found.status);
      }).catch(() => {});
  }, [session, id]);

  useEffect(() => {
    fetch(`/api/trips/${id}/questions`).then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setQuestions(data); }).catch(() => {});
  }, [id]);

  async function submitQuestion() {
    if (!qaBody.trim() || qaLoading) return;
    setQaLoading(true);
    try {
      const res = await fetch(`/api/trips/${id}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: qaBody }),
      });
      if (res.ok) { const q = await res.json(); setQuestions((prev) => [...prev, q]); setQaBody(""); }
    } finally { setQaLoading(false); }
  }

  if (loading) {
    return <div dir="rtl" className="min-h-screen bg-bg flex items-center justify-center"><div className="text-fg-faint text-sm">טוען…</div></div>;
  }
  if (notFound || !trip) {
    return (
      <div dir="rtl" className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <div className="text-fg-muted">הטיול לא נמצא</div>
        <button type="button" onClick={() => router.push("/trips")} className="text-accent text-sm">← חזרה לגלה טיולים</button>
      </div>
    );
  }

  const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 0);
  const occupancy = trip.maxSpots > 0 ? trip.spotsBooked / trip.maxSpots : 0;
  const isFull = trip.status === "FULL" || occupancy >= 1;
  const guideName = trip.guide?.user?.name ?? "מדריך";
  const guideStars = Math.round(trip.guide?.rating || 0);

  const equipment = trip.whatToBring ? trip.whatToBring.split(",").map((s) => s.trim()).filter(Boolean) : [];

  let parsedWaypoints: Waypoint[] = [];
  if (Array.isArray(trip.waypointsJson) && trip.waypointsJson.length > 0) {
    parsedWaypoints = trip.waypointsJson.map((w) => ({
      lat: Number(w.lat ?? 0), lng: Number(w.lng ?? 0), label: w.name ?? "", description: w.description ?? "",
      sources: Array.isArray((w as { sources?: SourceMaterial[] }).sources) ? (w as { sources?: SourceMaterial[] }).sources : undefined,
    }));
  } else if (trip.waypoints) {
    try { parsedWaypoints = JSON.parse(trip.waypoints); } catch { /* ignore */ }
  }

  const cancellationLines = trip.cancellationPolicy ? trip.cancellationPolicy.split("\n").filter(Boolean) : [];
  const elevations = parseElevations(trip.routeGpx);

  // All guides, shown equally (no primary/secondary distinction — finalized spec)
  const allGuides: { id?: string; name: string | null; image?: string | null; rating?: number; reviewCount?: number }[] = [
    { id: trip.guide.id, name: guideName, image: trip.guide.user.image, rating: trip.guide.rating, reviewCount: trip.guide.reviewCount },
    ...((trip.guides ?? [])
      .filter((g) => g.guide?.id && g.guide.id !== trip.guide.id)
      .map((g) => ({ id: g.guide.id, name: g.guide.user.name, image: g.guide.user.image, rating: g.guide.rating, reviewCount: g.guide.reviewCount }))),
  ];

  const sourcesVisible = trip.sourceMaterialsVisibility === "preview" || !!myRegStatus || purchase?.purchased;

  async function copyEquipment() {
    try { await navigator.clipboard.writeText(equipment.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ }
  }

  // Q&A: official-answer questions first, then chronological
  const sortedQuestions = [...questions].sort((a, b) => {
    const ao = a.official ? 1 : 0, bo = b.official ? 1 : 0;
    if (ao !== bo) return bo - ao;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div dir="rtl" className="min-h-screen bg-bg flex justify-center pb-28">
      <div className="w-full max-w-[480px]">

        {/* ── 1. Photos + 2. Name ── */}
        <div className="relative overflow-hidden" style={{ height: 340 }}>
          <HeroSlideshow images={coverImages(trip.images, trip.id, { region: trip.region, tags: trip.attributeTags, title: trip.title })} title={trip.title} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 6%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.35))" }} />

          <button type="button" onClick={() => router.back()}
            className="absolute top-4 right-4 w-9 h-9 bg-black/45 text-white rounded-full flex items-center justify-center backdrop-blur-sm">
            <ArrowRight size={18} />
          </button>
          <div className="absolute top-4 left-4 flex gap-2">
            <button type="button" onClick={() => setFav((v) => !v)}
              className="w-9 h-9 bg-black/45 text-white rounded-full flex items-center justify-center backdrop-blur-sm">
              <Heart size={17} fill={fav ? "#fff" : "none"} />
            </button>
            <button type="button" onClick={handleShare}
              className="w-9 h-9 bg-black/45 text-white rounded-full flex items-center justify-center backdrop-blur-sm">
              <Share2 size={16} />
            </button>
          </div>

          <div className="absolute bottom-0 inset-x-0 px-5 pb-6">
            <div className="flex items-center gap-1.5 text-white/85 text-xs mb-2">
              <MapPin size={12} /> {trip.region}
            </div>
            <h1 className="font-display text-white text-[30px] leading-[1.12]">{trip.title}</h1>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-7">

          {trip.status === "POSTPONED" && (
            <div className="rounded-2xl p-3.5 border" style={{ background: "rgba(200,137,58,0.12)", borderColor: "rgba(200,137,58,0.4)" }}>
              <div className="text-sm font-semibold text-amber mb-0.5 flex items-center gap-1.5"><PauseCircle size={15} /> הטיול נדחה</div>
              <div className="text-xs text-fg-muted">
                {trip.postponeCategory ? `סיבה: ${trip.postponeCategory}. ` : ""}{trip.postponeReason ?? ""}{" "}
                רשומים יכולים להמתין לתאריך חדש או לבטל לקבלת החזר מלא.
              </div>
            </div>
          )}

          {/* ── 3. Guides (equal) + rating + follow ── */}
          <div className="flex items-center gap-3 pb-6 border-b border-border">
            <button type="button" onClick={() => guideId && router.push(`/guides/${guideId}`)} className="flex -space-x-2 space-x-reverse shrink-0">
              {allGuides.slice(0, 2).map((g, i) => (
                <span key={i} className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white border-2"
                  style={{ background: avatarColor(g.name), borderColor: "var(--bg)" }}>
                  {g.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : initials(g.name)}
                </span>
              ))}
            </button>
            <button type="button" onClick={() => guideId && router.push(`/guides/${guideId}`)} className="flex-1 min-w-0 text-right">
              <div className="text-sm font-semibold text-fg">
                {allGuides.map((g) => g.name).join(" · ")}
              </div>
              <div className="text-xs text-fg-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                {guideStars > 0 && (
                  <span className="flex items-center gap-0.5" style={{ color: "#e0b64a" }}>
                    <Star size={12} fill="#e0b64a" color="#e0b64a" /> {trip.guide.rating.toFixed(1)}
                  </span>
                )}
                {trip.guide?.reviewCount > 0 && <span>· {trip.guide.reviewCount} ביקורות</span>}
                {trip.guide?.yearsActive ? <span>· {trip.guide.yearsActive} שנות ניסיון</span> : null}
                {guideStars === 0 && <span className="text-amber">מדריך חדש</span>}
              </div>
            </button>
            <button type="button" onClick={toggleFollow}
              className="text-xs rounded-full px-3.5 py-2 flex items-center gap-1 shrink-0"
              style={following
                ? { background: "var(--accent)", color: "var(--accent-ink)" }
                : { border: "1px solid var(--accent)", color: "var(--accent)" }}>
              {following ? <><Check size={13} /> עוקב</> : <><UserPlus size={13} /> עקוב</>}
            </button>
          </div>

          {/* ── 4. Tags (difficulty, region, attribute tags) ── */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
              {DIFF_LABEL[trip.difficulty] ?? trip.difficulty}
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}>
              {trip.region}
            </span>
            {trip.routeType && ROUTE_TYPE_LABEL[trip.routeType] && (
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}>
                {ROUTE_TYPE_LABEL[trip.routeType]}
              </span>
            )}
            {(trip.attributeTags ?? []).map((t) => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}>
                {TAG_LABEL[t] ?? t}
              </span>
            ))}
          </div>

          {/* ── 5. Quick stats (km / hours / min age) ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Mountain, val: trip.distanceKm > 0 ? trip.distanceKm : "—", label: "ק״מ" },
              { icon: Clock, val: isSelfGuided ? parsedWaypoints.length : (trip.durationMin > 0 ? formatDuration(trip.durationMin) : "—"), label: isSelfGuided ? "תחנות" : "שעות" },
              { icon: Users, val: trip.minAge != null ? `${trip.minAge}+` : "כל גיל", label: "גיל מינ׳" },
            ].map(({ icon: Icon, val, label }, i) => (
              <div key={i} className="rounded-2xl p-3.5 border border-border bg-surface text-center">
                <Icon size={16} className="mx-auto mb-1.5" style={{ color: "var(--fg-faint)" }} />
                <div className="text-base font-semibold text-fg">{val}</div>
                <div className="text-[10px] text-fg-faint mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* ── 6. Capacity bar (prominent, upper section) ── */}
          {!isSelfGuided ? (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-fg-muted">{trip.spotsBooked} מתוך {trip.maxSpots} רשומים</span>
                <span style={{ color: isFull ? "var(--danger)" : "var(--accent)" }} className="font-medium">
                  {isFull ? "הטיול מלא" : `${spotsLeft} מקומות נותרו`}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(occupancy * 100, 100)}%`, background: isFull ? "var(--danger)" : "var(--accent)" }} />
              </div>
              {isFull && (
                <div className="mt-2.5 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5"
                  style={{ background: "rgba(200,137,58,0.12)", color: "var(--amber)" }}>
                  <Clock size={13} /> הטיול מלא — רשימת המתנה פתוחה
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-3.5 border border-border bg-surface text-xs text-fg-muted flex items-center gap-2">
              <Users size={15} style={{ color: "var(--accent)" }} /> ללא הגבלת משתתפים · זמין תמיד · גישה ל-{trip.accessWindowDays ?? 30} ימים מרגע הרכישה
            </div>
          )}

          {/* ── 7. Date & departure time (guided) ── */}
          {!isSelfGuided && (
            <div className="flex items-center gap-3 rounded-2xl p-3.5 border border-border bg-surface">
              <Calendar size={18} style={{ color: "var(--accent)" }} />
              <div>
                <div className="text-sm font-medium text-fg">{formatDateLong(trip.date)}</div>
                <div className="text-xs text-fg-faint mt-0.5">יציאה בשעה {trip.startTime}</div>
              </div>
            </div>
          )}

          {/* ── 8. Meeting point + navigation (guided) ── */}
          {!isSelfGuided && trip.meetingPoint && (
            <div className="rounded-2xl p-3.5 border border-border bg-surface">
              <div className="text-[11px] text-fg-faint mb-1">נקודת מפגש</div>
              <div className="text-sm text-fg font-medium mb-3">{trip.meetingPoint}</div>
              <div className="flex gap-2">
                <a href={`https://waze.com/ul?q=${encodeURIComponent(trip.meetingPoint)}&navigate=yes`} target="_blank" rel="noreferrer"
                  className="flex-1 text-center text-xs rounded-full py-2 flex items-center justify-center gap-1.5"
                  style={{ border: "1px solid var(--border)", color: "var(--fg)" }}>
                  <Navigation size={13} /> נווט ב-Waze
                </a>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.meetingPoint)}`} target="_blank" rel="noreferrer"
                  className="flex-1 text-center text-xs rounded-full py-2 flex items-center justify-center gap-1.5"
                  style={{ border: "1px solid var(--border)", color: "var(--fg)" }}>
                  <MapPin size={13} /> Google Maps
                </a>
              </div>
              <a href={googleCalendarUrl({ title: trip.title, dateISO: trip.date, startTime: trip.startTime, durationMin: trip.durationMin, endDateISO: trip.endDate, location: trip.meetingPoint || trip.region })}
                target="_blank" rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent">
                <Calendar size={13} /> הוסף ליומן Google
              </a>
            </div>
          )}

          {/* ── 9. Description ── */}
          {trip.description && (
            <div>
              <Heading icon={FileText}>על הטיול</Heading>
              <p className="text-sm text-fg-muted leading-relaxed">{trip.description}</p>
            </div>
          )}

          {/* Self-guided pre-purchase note */}
          {isSelfGuided && !purchase?.purchased && (
            <div className="rounded-2xl p-3.5 text-xs text-amber border" style={{ background: "rgba(200,137,58,0.1)", borderColor: "rgba(200,137,58,0.35)" }}>
              🔒 זוהי תצוגה מקדימה. לאחר רכישה ייפתח התוכן המלא: ניווט צעד-אחר-צעד, חומרי הדרכה והקראה בכל תחנה, ואזהרות בטיחות.
            </div>
          )}

          {/* ── 10. Map + waypoints (tap row → pan map; details → drawer) ── */}
          <div>
            <Heading icon={MapPin}>{isSelfGuided ? "מסלול" : "מסלול ותחנות"}</Heading>
            <div ref={mapWrapRef} className="rounded-2xl overflow-hidden border border-border">
              <TripDetailMap region={trip.region} meetingPoint={trip.meetingPoint} waypoints={parsedWaypoints} height={190} liveLocation={showLoc} focusWaypoint={focusWp} />
            </div>
            <button type="button" onClick={() => setShowLoc((v) => !v)}
              className="mt-2 text-xs rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"
              style={showLoc ? { background: "var(--accent)", color: "var(--accent-ink)" } : { border: "1px solid var(--border)", color: "var(--fg-muted)" }}>
              <Navigation size={12} /> {showLoc ? "המיקום שלי פעיל" : "הצג את המיקום שלי"}
            </button>

            {parsedWaypoints.length > 0 && (
              <div className="mt-4 flex flex-col">
                {parsedWaypoints.map((wp, i) => {
                  const isFirst = i === 0, isLast = i === parsedWaypoints.length - 1;
                  const dotBg = isFirst ? "#2C5F8A" : isLast ? "#C0392B" : "var(--accent)";
                  const hasMore = !!(wp.description || (wp.sources && wp.sources.length));
                  const canFocus = Number.isFinite(wp.lat) && (wp.lat !== 0 || wp.lng !== 0);
                  function onRow() {
                    if (canFocus) {
                      setFocusWp(i);
                      mapWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    } else {
                      setDrawer(wp);
                    }
                  }
                  return (
                    <div key={i} className="flex gap-3 py-2.5 border-b border-border last:border-b-0">
                      <button type="button" onClick={onRow} className="flex gap-3 flex-1 min-w-0 text-right items-start">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white" style={{ background: dotBg }}>{i + 1}</div>
                          {!isLast && <div className="w-[1.5px] flex-1 mt-1" style={{ background: "var(--border)", minHeight: 14 }} />}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="text-sm font-medium text-fg flex items-center gap-1.5">
                            {wp.label || `נקודה ${i + 1}`}
                            {wp.sources && wp.sources.length > 0 && <BookOpen size={12} style={{ color: "var(--accent)" }} />}
                          </div>
                          {wp.description && <div className="text-xs text-fg-faint mt-0.5 line-clamp-1">{wp.description}</div>}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 self-center shrink-0">
                        {canFocus && (
                          <button type="button" onClick={onRow} aria-label="הצג במפה"
                            className="text-[11px] rounded-full px-2 py-1 inline-flex items-center gap-1"
                            style={{ border: "1px solid var(--border)", color: "var(--accent)" }}>
                            <MapPin size={11} /> במפה
                          </button>
                        )}
                        {hasMore && (
                          <button type="button" onClick={() => setDrawer(wp)} aria-label="פרטים" className="text-fg-faint p-1">
                            <ChevronDown size={15} className="-rotate-90" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 11. Elevation chart ── */}
          {elevations.length >= 2 && <ElevationChart points={elevations} />}

          {/* ── 12. Equipment + copy list ── */}
          {equipment.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Backpack size={16} style={{ color: "var(--accent)" }} strokeWidth={2} />
                  <h2 className="font-display text-lg text-fg">ציוד נדרש</h2>
                </div>
                <button type="button" onClick={copyEquipment}
                  className="text-xs flex items-center gap-1" style={{ color: copied ? "var(--accent)" : "var(--fg-muted)" }}>
                  {copied ? <><Check size={13} /> הועתק</> : <><Copy size={13} /> העתק רשימה</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {equipment.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-fg-muted border border-border">
                    <Check size={11} style={{ color: "var(--accent)" }} /> {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── 13. Source materials (closed by default) ── */}
          {Array.isArray(trip.sourceMaterials) && trip.sourceMaterials.length > 0 && (
            sourcesVisible ? (
              <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                <button type="button" onClick={() => setSourcesOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5">
                  <span className="flex items-center gap-2 font-display text-lg text-fg"><BookOpen size={16} style={{ color: "var(--accent)" }} /> חומרי מקור</span>
                  <ChevronDown size={17} className={`text-fg-faint transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
                </button>
                {sourcesOpen && <div className="px-4 pb-4 pt-1 border-t border-border"><SourceList items={trip.sourceMaterials} /></div>}
              </div>
            ) : (
              <div className="rounded-2xl p-3.5 border border-border bg-surface text-xs text-fg-faint flex items-center gap-2">
                <BookOpen size={14} /> חומרי מקור ייחשפו במהלך הטיול
              </div>
            )
          )}

          {/* ── Journey timeline (if multi-day) ── */}
          {trip.days && trip.days.length > 0 && <JourneyTimeline days={trip.days} />}

          {/* ── 14. Q&A (official first) ── */}
          {!isSelfGuided && (
            <div>
              <Heading icon={MessageCircle}>שאלות ותשובות</Heading>
              {sortedQuestions.length === 0 && <p className="text-xs text-fg-faint mb-3">אין שאלות עדיין. שאל את המדריך!</p>}
              {sortedQuestions.length > 0 && (
                <div className="flex flex-col gap-3 mb-3">
                  {sortedQuestions.map((q) => (
                    <div key={q.id} className="rounded-2xl p-3.5 border border-border bg-surface">
                      {q.official && <div className="text-[10px] font-semibold text-amber mb-1.5">★ תשובה רשמית</div>}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white" style={{ background: avatarColor(q.user.name) }}>{initials(q.user.name)}</div>
                        <span className="text-xs font-medium text-fg">{q.user.name ?? "מטייל"}</span>
                        <span className="text-[10px] text-fg-faint mr-auto">{new Date(q.createdAt).toLocaleDateString("he-IL")}</span>
                      </div>
                      <p className="text-sm text-fg mb-1">{q.body}</p>
                      {q.answer && (
                        <div className="mt-2 pr-3 border-r-2" style={{ borderColor: "var(--accent)" }}>
                          <div className="text-[10px] text-accent font-medium mb-0.5">תשובת המדריך</div>
                          <p className="text-xs text-fg-muted">{q.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {session ? (
                <div className="flex gap-2">
                  <textarea value={qaBody} onChange={(e) => setQaBody(e.target.value)} placeholder="שאל שאלה…" rows={2}
                    className="flex-1 rounded-xl px-3 py-2 text-sm resize-none bg-surface border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent" />
                  <button type="button" onClick={submitQuestion} disabled={!qaBody.trim() || qaLoading}
                    className="px-3 py-2 text-xs rounded-xl self-end font-medium disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
                    {qaLoading ? "…" : "שלח"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-fg-faint">
                  <button type="button" onClick={() => router.push("/auth/login")} className="text-accent underline">התחבר</button> כדי לשאול שאלה
                </p>
              )}
            </div>
          )}

          {/* Write a review (eligible) */}
          {session && (!!myRegStatus || purchase?.purchased) && (
            <div className="rounded-2xl p-3.5 border" style={{ background: "rgba(61,143,95,0.08)", borderColor: "rgba(61,143,95,0.25)" }}>
              {reviewDone ? (
                <div className="text-xs text-accent">תודה! הביקורת נשמרה.</div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-fg mb-1.5">כתוב ביקורת</div>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setReviewRating(n)}>
                        <Star size={22} fill={n <= reviewRating ? "#e0b64a" : "none"} color={n <= reviewRating ? "#e0b64a" : "var(--fg-faint)"} />
                      </button>
                    ))}
                  </div>
                  <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={2} placeholder="ספר על החוויה (אופציונלי)"
                    className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-2 bg-surface border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent" />
                  <button type="button" onClick={submitReview} disabled={!reviewRating}
                    className="px-4 py-1.5 rounded-full text-xs font-medium disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>שלח ביקורת</button>
                </>
              )}
            </div>
          )}

          {/* ── 15. Reviews (all, no pagination) ── */}
          {trip.reviews.length > 0 && (
            <div>
              <Heading icon={Star}>ביקורות ({trip.reviews.length})</Heading>
              <div className="flex flex-col gap-2">
                {trip.reviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl p-3.5 border border-border bg-surface">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0" style={{ background: avatarColor(rev.user.name) }}>{initials(rev.user.name)}</div>
                      <span className="text-xs font-medium text-fg">{rev.user.name}</span>
                      <span className="flex items-center gap-0.5 mr-auto">
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} fill={n <= rev.rating ? "#e0b64a" : "none"} color={n <= rev.rating ? "#e0b64a" : "var(--fg-faint)"} />)}
                      </span>
                    </div>
                    {rev.comment && <p className="text-xs text-fg-muted leading-relaxed">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 16. Rideshare board ── */}
          {session && !isSelfGuided && <RideshareBoard tripId={trip.id} />}

          {/* ── 17. Cancellation policy ── */}
          {cancellationLines.length > 0 && (
            <div>
              <Heading icon={FileText}>מדיניות ביטולים</Heading>
              <div className="rounded-2xl p-3.5 border border-border bg-surface flex flex-col gap-1.5">
                {cancellationLines.map((line, i) => {
                  const dashIdx = line.indexOf("—");
                  const left = dashIdx >= 0 ? line.slice(0, dashIdx).trim() : line;
                  const right = dashIdx >= 0 ? line.slice(dashIdx + 1).trim() : "";
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-fg-muted">{left}</span>
                      {right && <span className="text-fg font-medium">{right}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Waypoint drawer ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setDrawer(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div dir="rtl" className="relative w-full max-w-[480px] bg-surface rounded-t-3xl p-5 pb-8 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display text-xl text-fg flex items-center gap-2"><MapPin size={16} style={{ color: "var(--accent)" }} /> {drawer.label || "תחנה"}</h3>
              <button type="button" onClick={() => setDrawer(null)} className="text-fg-faint"><X size={20} /></button>
            </div>
            {drawer.description && <p className="text-sm text-fg-muted leading-relaxed mb-4">{drawer.description}</p>}
            <div className="text-[11px] text-fg-faint mb-4">{drawer.lat.toFixed(5)}, {drawer.lng.toFixed(5)}</div>
            {drawer.sources && drawer.sources.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-fg mb-2 flex items-center gap-1.5"><BookOpen size={13} style={{ color: "var(--accent)" }} /> חומרי מקור לתחנה</div>
                <SourceList items={drawer.sources} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating registration bar ── */}
      <div className="fixed bottom-0 inset-x-0 flex justify-center z-40" dir="rtl">
        <div className="w-full max-w-[480px] bg-surface/95 backdrop-blur-xl border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {session && myRegStatus && myRegStatus !== "CANCELLED" && (
            <button type="button" onClick={() => router.push(`/trips/${trip.id}/chat`)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs border-b border-border" style={{ color: "var(--accent)" }}>
              <MessageCircle size={13} /> שלח הודעה למדריך
            </button>
          )}
          {myRegStatus && REG_STATUS_UI[myRegStatus] && myRegStatus !== "CANCELLED" && (
            <div className="px-5 py-2 flex items-center justify-between text-xs" style={{ background: REG_STATUS_UI[myRegStatus].bg, color: REG_STATUS_UI[myRegStatus].color }}>
              <span className="font-medium">{REG_STATUS_UI[myRegStatus].text}</span>
              <button type="button" onClick={() => router.push("/my-trips")} className="underline text-[11px]">הטיולים שלי →</button>
            </div>
          )}

          <div className="px-5 py-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-fg">
                ₪{trip.price.toLocaleString("he-IL")}
                <span className="text-xs font-normal text-fg-faint mr-1">{isSelfGuided ? "רכישה חד-פעמית" : "לאדם"}</span>
              </div>
              <div className="text-xs text-fg-faint">{isSelfGuided ? `גישה ל-${trip.accessWindowDays ?? 30} ימים` : formatDateShort(trip.date)}</div>
            </div>
            <div className="flex gap-2">
              {isSelfGuided ? (
                purchase?.purchased && !purchase?.expired ? (
                  <>
                    <button type="button" onClick={requestRefund} className="px-3 py-2.5 text-xs rounded-full" style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}>בקשה להחזר</button>
                    <button type="button" onClick={() => router.push(`/trips/${trip.id}/start`)} className="px-5 py-2.5 text-sm rounded-full font-semibold flex items-center gap-1" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Play size={14} /> התחל טיול</button>
                  </>
                ) : (
                  <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)} className="px-6 py-2.5 text-sm rounded-full font-semibold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>רכוש טיול עצמאי ←</button>
                )
              ) : myRegStatus === "CONFIRMED" ? (
                <button type="button" onClick={() => router.push("/my-trips")} className="px-5 py-2.5 text-sm rounded-full font-medium" style={{ background: "rgba(61,143,95,0.18)", color: "#7fd4a3", border: "1px solid var(--accent)" }}>✓ רשום</button>
              ) : myRegStatus === "WAITLIST" ? (
                <button type="button" onClick={() => router.push("/my-trips")} className="px-5 py-2.5 text-sm rounded-full font-medium" style={{ background: "rgba(44,95,138,0.22)", color: "#8fc0e8" }}>⏰ ברשימת המתנה</button>
              ) : (
                <>
                  <button type="button" onClick={() => router.push(`/trips/${trip.id}/register?flow=interest`)} className="px-4 py-2.5 text-sm rounded-full" style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}>מתעניין</button>
                  <button type="button" onClick={() => router.push(isFull ? `/trips/${trip.id}/register?flow=waitlist` : `/trips/${trip.id}/register`)}
                    className="px-5 py-2.5 text-sm rounded-full text-white font-semibold" style={{ background: isFull ? "var(--danger)" : "var(--accent)" }}>
                    {isFull ? "רשימת המתנה" : "להרשמה ←"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

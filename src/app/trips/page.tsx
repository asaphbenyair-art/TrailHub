"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import CalendarView from "@/components/CalendarView";
import AvatarMenu from "@/components/AvatarMenu";
import { TRIP_TAGS } from "@/lib/tripTags";
import { coverImages } from "@/lib/tripImage";
import RideshareModal from "@/components/RideshareModal";
import { Car, Lock, UserSearch } from "lucide-react";

const REGIONS = ["גליל עליון","גליל תחתון","כרמל","ירושלים","שפלה","נגב","ערבה","גולן","עמק יזרעאל"];
const DIFFICULTIES = [
  { value: "EASY",    label: "קל" },
  { value: "MEDIUM",  label: "בינוני" },
  { value: "HARD",    label: "קשה" },
  { value: "EXTREME", label: "קיצוני" },
];
const SORT_OPTIONS = [
  { value: "date",       label: "תאריך" },
  { value: "price_asc",  label: "מחיר ↑" },
  { value: "price_desc", label: "מחיר ↓" },
  { value: "distance",   label: "מרחק" },
];
const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:    { bg: "#EAF3DE", color: "#27500A" },
  MEDIUM:  { bg: "#FAEEDA", color: "#633806" },
  HARD:    { bg: "#FADBD8", color: "#791F1F" },
  EXTREME: { bg: "#E8D0D0", color: "#4A0F0F" },
};
const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };
const AVATAR_COLORS = ["#854F0B","#3B6D11","#185FA5","#6B3B87","#1A6B4A"];

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
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
// Remaining access time for a purchased self-guided trip (spec: green >7d,
// amber 2-7d, red <2d, muted if expired).
function accessRemaining(iso: string | null | undefined): { text: string; color: string } {
  if (!iso) return { text: "🔓 גישה פעילה", color: "#1A6B4A" };
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: "⏳ הגישה הסתיימה", color: "#9ca3af" };
  const text = days === 1 ? "⏳ זמין עוד יום אחד" : `⏳ זמין עוד ${days} ימים`;
  const color = days > 7 ? "#1A6B4A" : days >= 2 ? "#B45309" : "#C0392B";
  return { text, color };
}

interface GuideCard {
  id: string; name: string | null; image: string | null; headline: string | null;
  specialtyRegions: string[]; rating: number; reviewCount: number;
  upcomingTrips: number; specialties: string[];
}

interface Trip {
  id: string; title: string; region: string; difficulty: string; status: string;
  date: string; startTime: string; durationMin: number; distanceKm: number;
  price: number; maxSpots: number; spotsBooked: number; images: string[];
  tripType?: string; endDate?: string | null; _count?: { days: number }; accessWindowDays?: number | null;
  rideSpots?: number; rideSeekers?: number;
  guide: { rating: number; user: { name: string | null } };
  guides?: { role: string; guide: { user: { name: string | null } } }[];
}

// Rideshare indicator for the trip-card stats row — 5 states (CLAUDE.md spec).
function RideshareIndicator({ trip, hasAccess, onOpen }: { trip: Trip; hasAccess: boolean; onOpen: () => void }) {
  const spots = trip.rideSpots ?? 0;
  const seekers = trip.rideSeekers ?? 0;
  const MUTED = "#9ca3af", BLUE = "#185FA5", GREEN = "#1A6B4A";

  // State 1 — no access (not registered/interested): locked, not clickable
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-end shrink-0" title="הירשם לטיול כדי לגשת ללוח הטרמפים">
        <span className="text-[9px] leading-none mb-1" style={{ color: MUTED }}>טרמפים</span>
        <span className="flex items-center gap-0.5" style={{ color: MUTED, opacity: 0.5 }}>
          <Car size={14} /><Lock size={10} />
        </span>
      </div>
    );
  }

  const labelColor = spots > 0 ? GREEN : seekers > 0 ? BLUE : MUTED;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex flex-col items-end shrink-0">
      <span className="text-[9px] leading-none mb-1" style={{ color: labelColor }}>טרמפים</span>
      {spots > 0 && seekers > 0 ? (
        // State 5 — both rides and seekers
        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: GREEN }}><Car size={13} />{spots}</span>
          <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: BLUE }}><UserSearch size={13} />{seekers}</span>
        </span>
      ) : spots > 0 ? (
        // State 4 — rides available
        <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: GREEN }}><Car size={13} />{spots} מקומות</span>
      ) : seekers > 0 ? (
        // State 3 — only seekers
        <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: BLUE }}><UserSearch size={13} />{seekers} מחפשים</span>
      ) : (
        // State 2 — registered, no rides yet
        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: MUTED }}><Car size={13} />אין עדיין</span>
      )}
    </button>
  );
}

function tripDayCount(t: Trip): number {
  if (t._count?.days) return t._count.days;
  if (t.endDate) {
    const days = Math.round((new Date(t.endDate).getTime() - new Date(t.date).getTime()) / 86400000) + 1;
    return Math.max(days, 2);
  }
  return 0;
}
interface Filters {
  q: string; regions: string[]; difficulties: string[]; dateFrom: string;
  priceMax: string; priceMin: string; ageMin: string; favoriteGuides: boolean; sort: string;
  category: "guided" | "self_guided" | "guides"; tags: string[];
}
function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}
const EMPTY_FILTERS: Filters = { q: "", regions: [], difficulties: [], dateFrom: "", priceMax: "", priceMin: "", ageMin: "", favoriteGuides: false, sort: "date", category: "guided", tags: [] };
const AGE_OPTIONS = [
  { value: "", label: "כל הגילאים" },
  { value: "6", label: "מתאים לעד 6" },
  { value: "8", label: "מתאים לעד 8" },
  { value: "12", label: "מתאים לעד 12" },
];

// ── Sliding image hero for cards with multiple images ─────────────
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
  // Stacked images, each with its own independent opacity fade (staggered
  // cross-fade — one fades out while the next fades in, not a hard swap).
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

export default function TripsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [myRegMap, setMyRegMap] = useState<Record<string, string>>({});
  const [myTripsOnly, setMyTripsOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [myRegIdMap, setMyRegIdMap] = useState<Record<string, string>>({});
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [purchaseExpiry, setPurchaseExpiry] = useState<Record<string, string | null>>({});
  const [purchasesOnly, setPurchasesOnly] = useState(false);
  const [rideDrawer, setRideDrawer] = useState<string | null>(null);
  const [guides, setGuides] = useState<GuideCard[]>([]);
  const [guidesLoaded, setGuidesLoaded] = useState(false);
  const [guideRegion, setGuideRegion] = useState<string | null>(null);
  const [guideSpecialty, setGuideSpecialty] = useState<string | null>(null);

  const loadGuides = useCallback(async () => {
    try {
      const res = await fetch("/api/guides", { cache: "no-store" });
      const data = await res.json();
      setGuides(Array.isArray(data) ? data : []);
    } catch { setGuides([]); }
    finally { setGuidesLoaded(true); }
  }, []);

  async function toggleFav(tripId: string) {
    if (!session) { router.push("/auth/login"); return; }
    const has = favIds.has(tripId);
    setFavIds((prev) => { const n = new Set(prev); if (has) n.delete(tripId); else n.add(tripId); return n; });
    await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId }) }).catch(() => {});
  }
  const [range, setRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [mobileCalOpen, setMobileCalOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showIntent, setShowIntent] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search intent flow — ask once, remember choice
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("trailhub_intent")) setShowIntent(true);
  }, []);

  // Remember that the user is in hiker mode + remember avatar for the login screen
  useEffect(() => {
    if (!session) return;
    fetch("/api/me/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "hiker" }) }).catch(() => {});
    try {
      localStorage.setItem("trailhub_last_user", JSON.stringify({ name: session.user?.name ?? null, image: session.user?.image ?? null }));
    } catch { /* noop */ }
    fetch("/api/favorites").then((r) => r.json()).then((d) => setFavIds(new Set(d.ids ?? []))).catch(() => {});
    fetch("/api/my-purchases").then((r) => r.ok ? r.json() : []).then((d: Array<{ accessExpiresAt: string | null; trip: { id: string } }>) => {
      if (!Array.isArray(d)) return;
      setPurchasedIds(new Set(d.map((p) => p.trip.id)));
      const exp: Record<string, string | null> = {};
      d.forEach((p) => { exp[p.trip.id] = p.accessExpiresAt; });
      setPurchaseExpiry(exp);
    }).catch(() => {});
  }, [session]);

  function chooseIntent(opt: "when" | "kind" | "soon" | "browse") {
    if (typeof window !== "undefined") localStorage.setItem("trailhub_intent", opt);
    setShowIntent(false);
    if (opt === "when") {
      setView("calendar");
    } else if (opt === "kind") {
      setView("list"); setPanelOpen(true);
    } else if (opt === "soon") {
      setView("list");
      const next = { ...filters, sort: "date" }; setFilters(next); fetchTrips(next);
    } else {
      // browse — preferences already seed filters; just show the list
      setView("list");
    }
  }

  const fetchTrips = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (f.q) p.set("q", f.q);
      if (f.regions.length) p.set("regions", f.regions.join(","));
      if (f.difficulties.length) p.set("difficulties", f.difficulties.join(","));
      if (f.dateFrom) p.set("dateFrom", f.dateFrom);
      if (f.priceMax) p.set("priceMax", f.priceMax);
      if (f.priceMin) p.set("priceMin", f.priceMin);
      if (f.ageMin) p.set("ageMin", f.ageMin);
      if (f.favoriteGuides) p.set("favoriteGuides", "1");
      if (f.category) p.set("category", f.category);
      if (f.tags.length) p.set("tags", f.tags.join(","));
      const res = await fetch(`/api/trips?${p.toString()}`, { cache: "no-store" });
      let data: Trip[] = await res.json();
      if (!Array.isArray(data)) data = [];
      if (f.sort === "price_asc") data = [...data].sort((a, b) => a.price - b.price);
      if (f.sort === "price_desc") data = [...data].sort((a, b) => b.price - a.price);
      if (f.sort === "distance") data = [...data].sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      setTrips(data);
    } catch { setTrips([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTrips(EMPTY_FILTERS); }, [fetchTrips]);
  useEffect(() => {
    if (!session) return;
    fetch("/api/my-trips", { cache: "no-store" })
      .then((r) => r.json())
      .then((regs: Array<{ id: string; status: string; trip: { id: string } }>) => {
        if (!Array.isArray(regs)) return;
        const map: Record<string, string> = {};
        const idMap: Record<string, string> = {};
        regs.forEach((r) => { if (r.status !== "CANCELLED") { map[r.trip.id] = r.status; idMap[r.trip.id] = r.id; } });
        setMyRegMap(map);
        setMyRegIdMap(idMap);
      })
      .catch(() => {});
  }, [session]);

  // Cancel/remove a registration or interest directly from the search card.
  async function cancelReg(tripId: string) {
    const regId = myRegIdMap[tripId];
    if (!regId) return;
    if (!window.confirm("לבטל את ההרשמה לטיול?")) return;
    const res = await fetch(`/api/registrations/${regId}`, { method: "DELETE" });
    if (res.ok) {
      setMyRegMap((m) => { const n = { ...m }; delete n[tripId]; return n; });
      setMyRegIdMap((m) => { const n = { ...m }; delete n[tripId]; return n; });
    }
  }

  // Seed search filters from the user's saved preferences (once, on first load)
  const prefsApplied = useRef(false);
  useEffect(() => {
    if (!session || prefsApplied.current) return;
    prefsApplied.current = true;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: { preferredRegions?: string[]; preferredDifficulties?: string[] }) => {
        const regions = p.preferredRegions ?? [];
        const difficulties = p.preferredDifficulties ?? [];
        if (regions.length === 0 && difficulties.length === 0) return;
        setFilters((f) => {
          // Don't override if the user already started filtering
          if (f.regions.length || f.difficulties.length) return f;
          const next = { ...f, regions, difficulties };
          fetchTrips(next);
          return next;
        });
      })
      .catch(() => {});
  }, [session, fetchTrips]);

  // Instant-apply: patch the live filters, refetch immediately (or debounced for text inputs)
  function updateFilters(patch: Partial<Filters>, debounce = false) {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (debounce) searchTimeout.current = setTimeout(() => fetchTrips(next), 380);
    else fetchTrips(next);
  }
  function clearAllFilters() {
    updateFilters({ regions: [], difficulties: [], dateFrom: "", priceMax: "", priceMin: "", ageMin: "", favoriteGuides: false, tags: [] });
  }
  function clearFilter(key: keyof Filters, val?: string) {
    if (key === "regions" && val) updateFilters({ regions: filters.regions.filter((r) => r !== val) });
    else if (key === "difficulties" && val) updateFilters({ difficulties: filters.difficulties.filter((d) => d !== val) });
    else if (key === "dateFrom") updateFilters({ dateFrom: "" });
    else if (key === "priceMax") updateFilters({ priceMax: "" });
    else if (key === "priceMin") updateFilters({ priceMin: "" });
    else if (key === "ageMin") updateFilters({ ageMin: "" });
  }
  function handleSearch(value: string) {
    updateFilters({ q: value }, true);
  }
  function handleRangeChange(r: { start: Date | null; end: Date | null }) {
    setRange(r);
    // Close the mobile panel only once a full selection is made (or cleared)
    if (!r.start || (r.start && r.end)) setMobileCalOpen(false);
  }

  // Client-side date filter — single day (start only) or inclusive range (start..end)
  const displayedTrips = (() => {
    let list = trips;
    if (purchasesOnly && filters.category === "self_guided") list = list.filter((t) => purchasedIds.has(t.id));
    if (myTripsOnly && filters.category === "guided") list = list.filter((t) => myRegMap[t.id]);
    if (favoritesOnly) list = list.filter((t) => favIds.has(t.id));
    if (!range.start) return list;
    const startMs = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate()).getTime();
    const endRef = range.end ?? range.start;
    const endMs = new Date(endRef.getFullYear(), endRef.getMonth(), endRef.getDate(), 23, 59, 59).getTime();
    return list.filter((t) => {
      const ms = new Date(t.date).getTime();
      return ms >= startMs && ms <= endMs;
    });
  })();

  function rangeLabel(opts: Intl.DateTimeFormatOptions) {
    if (!range.start) return "";
    const s = range.start.toLocaleDateString("he-IL", opts);
    if (!range.end || sameDay(range.start, range.end)) return s;
    return `${s} – ${range.end.toLocaleDateString("he-IL", opts)}`;
  }

  const activeCount = filters.regions.length + filters.difficulties.length +
    (filters.dateFrom ? 1 : 0) + (filters.priceMax ? 1 : 0) + (filters.priceMin ? 1 : 0) +
    (filters.ageMin ? 1 : 0) + (filters.favoriteGuides ? 1 : 0);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5]">
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Search intent flow */}
      {showIntent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4" onClick={() => setShowIntent(false)}>
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold text-gray-900 mb-1">מה אתה מחפש?</div>
            <div className="text-xs text-gray-500 mb-4">נתאים לך את החיפוש</div>
            <div className="flex flex-col gap-2">
              {([
                ["when", "🗓 אני יודע מתי אני פנוי", "אבחר תאריך ואראה מה יוצא"],
                ["kind", "🎯 מחפש סוג טיול מסוים", "אסנן לפי קושי, איזור ומאפיינים"],
                ["soon", "⏱ מה קורה בקרוב", "הקרובים ביותר, ללא סינון"],
                ["browse", "✨ סתם מדפדף, הפתע אותי", "מותאם להעדפות שלי"],
              ] as const).map(([key, title, sub]) => (
                <button key={key} type="button" onClick={() => chooseIntent(key)}
                  className="text-right border border-gray-200 rounded-xl p-3 hover:border-[#1A6B4A] hover:bg-[#F0FAF5] transition-colors">
                  <div className="text-sm font-medium text-gray-900">{title}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="px-3 py-3">
        <div className="max-w-5xl mx-auto bg-white rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <Link href="/" className="text-[15px] font-semibold text-[#1A6B4A] flex-shrink-0">🧭 TrailHub</Link>
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
            <span className="text-gray-400 text-sm">🔍</span>
            <input
              type="text" value={filters.q}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="חפש טיול, מדריך, איזור..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400"
            />
            {filters.q && (
              <button type="button" onClick={() => handleSearch("")} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
          {session ? (
            <div className="flex items-center gap-1.5">
              <NotificationBell />
              <AvatarMenu />
            </div>
          ) : (
            <Link href="/auth/login" className="text-xs text-[#1A6B4A] border border-[#1A6B4A] rounded-full px-2.5 py-1 flex-shrink-0 whitespace-nowrap">כניסה</Link>
          )}
        </div>
      </div>

      {/* Category: guided vs self-guided */}
      <div className="max-w-5xl mx-auto px-3 mb-2 flex items-center gap-2 justify-center md:justify-start">
        <button type="button" onClick={() => setShowIntent(true)}
          className="text-[11px] text-gray-400 hover:text-[#1A6B4A] underline shrink-0">שנה מה אני מחפש</button>
        <div className="inline-flex bg-white rounded-full border border-gray-200 p-0.5">
          {([["guided", "🧭 טיולים מודרכים"], ["self_guided", "🎒 טיולים עצמאיים"], ["guides", "🧑‍🏫 מדריכים"]] as const).map(([v, label]) => (
            <button key={v} type="button"
              onClick={() => {
                const next = { ...filters, category: v };
                setFilters(next); setPurchasesOnly(false); setMyTripsOnly(false); setFavoritesOnly(false);
                if (v === "guides") { if (!guidesLoaded) loadGuides(); }
                else { setTrips([]); fetchTrips(next); }
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.category === v ? "bg-[#1A6B4A] text-white" : "text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Guides directory (מדריכים tab) ── */}
      {filters.category === "guides" && (() => {
        const allSpecialties = [...new Set(guides.flatMap((g) => g.specialties))];
        const shown = guides.filter((g) =>
          (!guideRegion || g.specialtyRegions.includes(guideRegion)) &&
          (!guideSpecialty || g.specialties.includes(guideSpecialty))
        );
        return (
          <div className="max-w-5xl mx-auto px-3 pb-24">
            {/* Instant filters */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button type="button" onClick={() => setGuideRegion(null)}
                  className={`shrink-0 text-[11px] rounded-full px-3 py-1.5 border ${!guideRegion ? "bg-[#1A6B4A] text-white border-[#1A6B4A]" : "bg-white text-gray-500 border-gray-200"}`}>כל האזורים</button>
                {REGIONS.map((r) => (
                  <button key={r} type="button" onClick={() => setGuideRegion(guideRegion === r ? null : r)}
                    className={`shrink-0 text-[11px] rounded-full px-3 py-1.5 border ${guideRegion === r ? "bg-[#1A6B4A] text-white border-[#1A6B4A]" : "bg-white text-gray-500 border-gray-200"}`}>{r}</button>
                ))}
              </div>
              {allSpecialties.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button type="button" onClick={() => setGuideSpecialty(null)}
                    className={`shrink-0 text-[11px] rounded-full px-3 py-1.5 border ${!guideSpecialty ? "bg-[#185FA5] text-white border-[#185FA5]" : "bg-white text-gray-500 border-gray-200"}`}>כל ההתמחויות</button>
                  {allSpecialties.map((s) => (
                    <button key={s} type="button" onClick={() => setGuideSpecialty(guideSpecialty === s ? null : s)}
                      className={`shrink-0 text-[11px] rounded-full px-3 py-1.5 border ${guideSpecialty === s ? "bg-[#185FA5] text-white border-[#185FA5]" : "bg-white text-gray-500 border-gray-200"}`}>{s}</button>
                  ))}
                </div>
              )}
            </div>

            {!guidesLoaded ? (
              <div className="text-center py-12 text-gray-400 text-sm">טוען מדריכים…</div>
            ) : shown.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">לא נמצאו מדריכים</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {shown.map((g) => (
                  <div key={g.id} onClick={() => router.push(`/guides/${g.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center text-center cursor-pointer hover:border-[#1A6B4A]/40 transition-colors">
                    {g.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.image} alt="" className="w-16 h-16 rounded-full object-cover mb-2" />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold text-white mb-2"
                        style={{ background: avatarColor(g.name) }}>{initials(g.name)}</div>
                    )}
                    <div className="text-sm font-semibold text-gray-900 truncate w-full">{g.name ?? "מדריך"}</div>
                    {g.headline && <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{g.headline}</div>}
                    <div className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                      {g.rating > 0 ? <span className="text-amber-500">★ {g.rating.toFixed(1)}</span> : <span className="text-[#1A6B4A]">מדריך חדש</span>}
                      {g.reviewCount > 0 && <span>· {g.reviewCount} ביקורות</span>}
                    </div>
                    <div className="text-[11px] text-[#0F5038] bg-[#D6EDE3] rounded-full px-2 py-0.5 mt-1.5">
                      {g.upcomingTrips} טיולים קרובים
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* List / Calendar view toggle */}
      <div className={`max-w-5xl mx-auto px-3 mb-2 flex justify-center md:justify-start ${filters.category === "self_guided" || filters.category === "guides" ? "hidden" : ""}`}>
        <div className="inline-flex bg-white rounded-full border border-gray-200 p-0.5">
          {([["list", "📋 רשימה"], ["calendar", "📅 יומן"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                view === v ? "bg-[#1A6B4A] text-white" : "text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar full view */}
      {view === "calendar" && filters.category !== "guides" && (
        <div className="max-w-5xl mx-auto px-3 pb-8">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <CalendarView trips={trips} regStatus={myRegMap} />
          </div>
        </div>
      )}

      {/* Body (list view) */}
      <div className={`max-w-5xl mx-auto px-3 pb-24 ${view === "calendar" || filters.category === "guides" ? "hidden" : "md:flex md:gap-4"}`}>

        {/* ── Calendar side panel (desktop, RIGHT side in RTL) ── */}
        <aside className="hidden md:block w-[290px] shrink-0 self-start sticky top-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-3 pt-3 pb-1 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">📅 יומן טיולים</span>
              {range.start && (
                <button type="button" onClick={() => setRange({ start: null, end: null })}
                  className="float-left text-[10px] text-gray-400 hover:text-[#1A6B4A] mt-0.5">נקה</button>
              )}
            </div>
            <CalendarView
              compact
              trips={trips}
              range={range}
              onRangeChange={handleRangeChange}
            />
          </div>
        </aside>

        {/* ── List panel (LEFT side in RTL) ── */}
        <main className="flex-1 min-w-0 md:max-w-none max-w-[480px] mx-auto md:mx-0">

          {/* Mobile calendar toggle */}
          <div className="md:hidden mb-2">
            <button
              type="button"
              onClick={() => setMobileCalOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                mobileCalOpen || range.start
                  ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              📅 {range.start
                ? rangeLabel({ day: "numeric", month: "short" })
                : "סנן לפי תאריך"}
              {range.start && (
                <span onClick={(e) => { e.stopPropagation(); setRange({ start: null, end: null }); }} className="font-bold">✕</span>
              )}
            </button>
          </div>

          {/* Mobile calendar panel */}
          {mobileCalOpen && (
            <div className="md:hidden bg-white rounded-2xl overflow-hidden mb-2 shadow-sm">
              <CalendarView
                compact
                trips={trips}
                range={range}
                onRangeChange={handleRangeChange}
              />
            </div>
          )}

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-1.5" style={{ scrollbarWidth: "none" }}>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex-shrink-0 transition-colors ${
                panelOpen || activeCount > 0
                  ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              ⚙ פילטרים
              {activeCount > 0 && (
                <span className="bg-[#1A6B4A] text-white rounded-full min-w-[16px] h-4 px-1 text-[10px] leading-4 inline-flex items-center justify-center">{activeCount}</span>
              )}
            </button>
            {session && filters.category === "guided" && (
              <>
                <button type="button" onClick={() => setMyTripsOnly((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex-shrink-0 transition-colors ${
                    myTripsOnly ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "bg-white border-gray-200 text-gray-600"}`}>
                  🎒 הטיולים שלי
                </button>
                <button type="button" onClick={() => setFavoritesOnly((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex-shrink-0 transition-colors ${
                    favoritesOnly ? "bg-[#FDE8EC] border-[#E86A87] text-[#B0324D]" : "bg-white border-gray-200 text-gray-600"}`}>
                  ♥ מועדפים
                </button>
              </>
            )}
            {session && filters.category === "self_guided" && (
              <>
                <button type="button" onClick={() => setPurchasesOnly((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex-shrink-0 transition-colors ${
                    purchasesOnly ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "bg-white border-gray-200 text-gray-600"}`}>
                  🎒 הרכישות שלי
                </button>
                <button type="button" onClick={() => setFavoritesOnly((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex-shrink-0 transition-colors ${
                    favoritesOnly ? "bg-[#FDE8EC] border-[#E86A87] text-[#B0324D]" : "bg-white border-gray-200 text-gray-600"}`}>
                  ♥ מועדפים
                </button>
              </>
            )}
            {filters.regions.map((r) => (
              <button key={r} type="button" onClick={() => clearFilter("regions", r)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-[#D6EDE3] border border-[#1A6B4A] text-[#0F5038] flex-shrink-0">
                📍 {r} <span className="font-bold">✕</span>
              </button>
            ))}
            {filters.difficulties.map((d) => (
              <button key={d} type="button" onClick={() => clearFilter("difficulties", d)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-[#D6EDE3] border border-[#1A6B4A] text-[#0F5038] flex-shrink-0">
                🏔 {DIFF_LABEL[d]} <span className="font-bold">✕</span>
              </button>
            ))}
            {filters.dateFrom && (
              <button type="button" onClick={() => clearFilter("dateFrom")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-[#D6EDE3] border border-[#1A6B4A] text-[#0F5038] flex-shrink-0">
                📅 {new Date(filters.dateFrom).toLocaleDateString("he-IL",{day:"numeric",month:"short"})} <span className="font-bold">✕</span>
              </button>
            )}
            {filters.priceMax && (
              <button type="button" onClick={() => clearFilter("priceMax")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-[#D6EDE3] border border-[#1A6B4A] text-[#0F5038] flex-shrink-0">
                💰 עד ₪{filters.priceMax} <span className="font-bold">✕</span>
              </button>
            )}
            {activeCount > 0 && (
              <button type="button" onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-white border border-gray-200 text-gray-500 flex-shrink-0">
                נקה הכל <span className="font-bold">✕</span>
              </button>
            )}
          </div>

          {/* Filter panel */}
          {panelOpen && (
            <div className="bg-white rounded-xl p-4 mb-2">
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">תאריך מ-</div>
                <input type="date" value={filters.dateFrom}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value }, true)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">איזור בארץ</div>
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.map((r) => (
                    <button key={r} type="button"
                      onClick={() => updateFilters({ regions: toggle(filters.regions, r) })}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        filters.regions.includes(r) ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">רמת קושי</div>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button key={d.value} type="button"
                      onClick={() => updateFilters({ difficulties: toggle(filters.difficulties, d.value) })}
                      className={`flex-1 py-1.5 rounded-full text-xs border transition-colors ${
                        filters.difficulties.includes(d.value) ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">טווח מחירים (₪)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={filters.priceMin}
                    onChange={(e) => updateFilters({ priceMin: e.target.value }, true)}
                    placeholder="מינימום"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
                  <input type="number" value={filters.priceMax}
                    onChange={(e) => updateFilters({ priceMax: e.target.value }, true)}
                    placeholder="מקסימום"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
                </div>
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">מתאים לגיל</div>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_OPTIONS.map((a) => (
                    <button key={a.value} type="button"
                      onClick={() => updateFilters({ ageMin: a.value })}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        filters.ageMin === a.value ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <button type="button" onClick={() => updateFilters({ favoriteGuides: !filters.favoriteGuides })}
                  className="flex items-center gap-2 text-sm text-gray-700">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-[1.5px] transition-colors ${
                    filters.favoriteGuides ? "bg-[#1A6B4A] border-[#1A6B4A] text-white text-xs" : "border-gray-300"}`}>
                    {filters.favoriteGuides && "✓"}
                  </div>
                  ❤ רק מדריכים שאני עוקב אחריהם
                </button>
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">מאפיינים</div>
                <div className="flex flex-wrap gap-1.5">
                  {TRIP_TAGS.filter((t) => !t.selfGuidedOnly || filters.category === "self_guided").map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => updateFilters({ tags: toggle(filters.tags, t.value) })}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        filters.tags.includes(t.value) ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button type="button" onClick={clearAllFilters}
                  className="text-xs text-gray-400 hover:text-gray-600">נקה הכל</button>
                <button type="button" onClick={() => setPanelOpen(false)}
                  className="px-5 py-2 bg-[#1A6B4A] text-white rounded-full text-xs font-medium hover:bg-[#155a3e] transition-colors">
                  סגור
                </button>
              </div>
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-xs text-gray-500">
              {loading ? "טוען..." : range.start
                ? `${displayedTrips.length} טיולים ב-${rangeLabel({ day: "numeric", month: "short" })}`
                : `${trips.length} טיולים נמצאו`}
            </span>
            <select value={filters.sort}
              onChange={(e) => { const next = { ...filters, sort: e.target.value }; setFilters(next); fetchTrips(next); }}
              className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-600 focus:outline-none cursor-pointer appearance-none">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>↕ {o.label}</option>)}
            </select>
          </div>

          {/* Trip cards */}
          <div className="flex flex-col gap-3">
            {loading && <div className="text-center py-12 text-gray-400 text-sm">טוען טיולים...</div>}

            {/* Empty state when a date/range is selected but no trips */}
            {!loading && range.start && displayedTrips.length === 0 && (
              <div className="text-center py-14">
                <div className="text-3xl mb-3">📅</div>
                <div className="text-gray-600 text-sm font-medium">
                  {range.end && !sameDay(range.start, range.end)
                    ? `אין טיולים בין ${rangeLabel({ weekday: "short", day: "numeric", month: "long" })}`
                    : `אין טיולים ב-${range.start.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}`}
                </div>
                <div className="text-gray-400 text-xs mt-1">בחר תאריך אחר ביומן</div>
                <button type="button" onClick={() => setRange({ start: null, end: null })}
                  className="mt-4 px-4 py-2 text-xs text-[#1A6B4A] border border-[#1A6B4A] rounded-full hover:bg-[#D6EDE3] transition-colors">
                  הצג כל הטיולים
                </button>
              </div>
            )}

            {/* Empty state — no trips at all */}
            {!loading && !range.start && displayedTrips.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">🔍</div>
                <div className="text-gray-500 text-sm">לא נמצאו טיולים</div>
                <div className="text-gray-400 text-xs mt-1">נסה לשנות את הפילטרים</div>
              </div>
            )}

            {!loading && displayedTrips.map((trip) => {
              const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 0);
              const occupancy = trip.maxSpots > 0 ? trip.spotsBooked / trip.maxSpots : 0;
              const isFull = trip.status === "FULL" || occupancy >= 1;
              const guideName = trip.guide?.user?.name ?? null;
              const diff = DIFF_STYLE[trip.difficulty];
              const isSG = trip.tripType === "SELF_GUIDED";
              const isPurchased = purchasedIds.has(trip.id);
              const myStatus = isSG ? null : myRegMap[trip.id];

              return (
                <div key={trip.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer"
                  onClick={() => router.push(`/trips/${trip.id}`)}>
                  {myStatus && (
                    <div className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium ${
                      myStatus === "CONFIRMED" ? "bg-[#D6EDE3] text-[#0F5038]" :
                      myStatus === "WAITLIST"  ? "bg-[#D4E4F0] text-[#185FA5]" : "bg-gray-50 text-gray-500"
                    }`}>
                      {myStatus === "CONFIRMED" ? "✓ רשום לטיול" :
                       myStatus === "WAITLIST"  ? "⏰ ברשימת המתנה" : "👀 מתעניין"}
                    </div>
                  )}
                  {isSG && isPurchased && (
                    <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium bg-[#D6EDE3] text-[#0F5038]">✓ הטיול נרכש</div>
                  )}

                  {/* Hero with image slideshow */}
                  <div className="relative overflow-hidden" style={{ height: 160 }}>
                    <TripCardHero images={coverImages(trip.images, trip.id, { region: trip.region, title: trip.title })} title={trip.title} />

                    <div className="absolute top-2.5 right-2.5 flex gap-1.5 z-10">
                      {trip.tripType && trip.tripType !== "DAY_HIKE" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "#2C5F8A", color: "#fff" }}>
                          {trip.tripType === "MULTI_SITE" ? "מרובה אתרים" : `מסע · ${tripDayCount(trip) || ""} ימים`}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.92)", color: "#27500A" }}>
                        📍 {trip.region}
                      </span>
                      {diff && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={diff}>
                          {DIFF_LABEL[trip.difficulty]}
                        </span>
                      )}
                    </div>

                    {/* Image count dots */}
                    {trip.images?.length > 1 && (
                      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1 z-10">
                        {trip.images.map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-white/60" />
                        ))}
                      </div>
                    )}

                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleFav(trip.id); }}
                      className="absolute top-2.5 left-2.5 bg-black/40 rounded-full w-7 h-7 flex items-center justify-center text-sm z-10"
                      style={{ color: favIds.has(trip.id) ? "#ff6b81" : "#fff" }}>
                      {favIds.has(trip.id) ? "♥" : "♡"}
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 z-10"
                      style={{ background: "linear-gradient(to top,rgba(0,0,0,0.68),transparent)" }}>
                      <div className="text-[13px] font-medium text-white leading-snug mb-1.5">{trip.title}</div>
                      {(() => {
                        const secName = trip.guides?.find((g) => g.role === "SECONDARY")?.guide?.user?.name ?? null;
                        return (
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
                            {trip.guide?.rating > 0 ? ` · ★${trip.guide.rating.toFixed(1)}` : ""}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {isFull && (
                    <div className="mx-3 mt-2.5 px-3 py-1.5 bg-[#FDF3DC] rounded-lg flex items-center justify-between text-xs text-[#633806]">
                      <span>⏰ הטיול מלא — רשימת המתנה פתוחה</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/trips/${trip.id}/register?flow=waitlist`); }}
                        className="text-[#854F0B] font-medium mr-2">הצטרף</button>
                    </div>
                  )}

                  {(() => {
                    const isJourney = !!trip.tripType && trip.tripType !== "DAY_HIKE" && !isSG;
                    const nDays = tripDayCount(trip);
                    const meta: { t: string; color?: string }[] = isSG
                      ? [
                          { t: `🎒 טיול עצמאי` },
                          // Purchased → remaining access time (color-coded) where the date would be
                          isPurchased
                            ? (() => { const r = accessRemaining(purchaseExpiry[trip.id]); return { t: r.text, color: r.color }; })()
                            : { t: `🔓 גישה ל-${trip.accessWindowDays ?? 30} ימים` },
                          ...(trip.distanceKm > 0 ? [{ t: `📍 ${trip.distanceKm} ק"מ` }] : []),
                        ]
                      : isJourney
                      ? [
                          { t: `📅 ${formatDate(trip.date)}${trip.endDate ? `–${formatDate(trip.endDate)}` : ""}` },
                          ...(nDays > 1 ? [{ t: `🌙 ${nDays - 1} לילות` }] : []),
                          ...(trip.distanceKm > 0 ? [{ t: `📍 ${trip.distanceKm} ק"מ סה"כ` }] : []),
                        ]
                      : [
                          { t: `📅 ${formatDate(trip.date)}` },
                          { t: `🕖 ${trip.startTime}` },
                          ...(trip.distanceKm > 0 ? [{ t: `📍 ${trip.distanceKm} ק"מ` }] : []),
                          ...(trip.durationMin > 0 ? [{ t: `⏱ ${Math.round(trip.durationMin / 60)} שע'` }] : []),
                        ];
                    return (
                  <div className="px-3 pt-2 pb-2.5">
                    <div className="flex items-end justify-between gap-2 mb-2">
                      <div className="flex flex-wrap" style={{ gap: 0 }}>
                        {meta.map((m, i, arr) => (
                          <span key={i} className="text-[11px] text-gray-500"
                            style={{ paddingLeft: i < arr.length-1 ? 8 : 0, marginLeft: i < arr.length-1 ? 8 : 0, borderLeft: i < arr.length-1 ? "1px solid #eee" : "none", ...(m.color ? { color: m.color, fontWeight: 600 } : {}) }}>
                            {m.t}
                          </span>
                        ))}
                      </div>
                      {!isSG && (
                        <RideshareIndicator
                          trip={trip}
                          hasAccess={!!myStatus && myStatus !== "CANCELLED"}
                          onOpen={() => setRideDrawer(trip.id)}
                        />
                      )}
                    </div>
                    {!isSG && (
                    <div className="mb-2">
                      <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(occupancy*100,100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>{trip.spotsBooked} מתוך {trip.maxSpots} רשומים</span>
                        <span style={{ color: isFull ? "#C0392B" : "#1A6B4A", fontWeight: 500 }}>
                          {isFull ? "מלא" : `${spotsLeft} מקומות נותרו`}
                        </span>
                      </div>
                    </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div>
                        <span className="text-[17px] font-medium text-gray-900">₪{trip.price.toLocaleString("he-IL")}</span>
                        <span className="text-[11px] text-gray-400 mr-1">{isSG ? "לחבילה" : trip.tripType && trip.tripType !== "DAY_HIKE" ? "למסע" : "לאדם"}</span>
                      </div>
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isSG ? (
                          isPurchased ? (
                            <button type="button" onClick={() => router.push(`/trips/${trip.id}/start`)}
                              className="px-3.5 py-1.5 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">▶ התחל</button>
                          ) : (
                            <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)}
                              className="px-3.5 py-1.5 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">רכוש</button>
                          )
                        ) : myStatus === "CONFIRMED" ? (
                          <>
                            <span className="px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-[#D6EDE3] text-[#0F5038]">✓ רשום לטיול</span>
                            <button type="button" onClick={() => cancelReg(trip.id)}
                              className="px-3 py-1.5 border border-[#C0392B] text-[#C0392B] rounded-full text-[11px] font-medium">
                              בטל הרשמה
                            </button>
                          </>
                        ) : myStatus === "WAITLIST" ? (
                          <>
                            <span className="px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-[#D4E4F0] text-[#185FA5]">⏰ ברשימת המתנה</span>
                            <button type="button" onClick={() => cancelReg(trip.id)}
                              className="px-3 py-1.5 border border-[#C0392B] text-[#C0392B] rounded-full text-[11px] font-medium">
                              בטל
                            </button>
                          </>
                        ) : myStatus === "PENDING" ? (
                          <>
                            <span className="px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">👀 מתעניין</span>
                            {!isFull && (
                              <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)}
                                className="px-3.5 py-1.5 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">להרשמה</button>
                            )}
                            <button type="button" onClick={() => cancelReg(trip.id)}
                              className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-full text-[11px]">הסר</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => router.push(`/trips/${trip.id}/register?flow=interest`)}
                              className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full text-[11px]">
                              מתעניין
                            </button>
                            {!isFull && (
                              <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)}
                                className="px-3.5 py-1.5 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">
                                להרשמה
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                  })()}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Rideshare modal — tabs + cards + footer, in-context (not a new page) */}
      {rideDrawer && (() => {
        const rt = trips.find((t) => t.id === rideDrawer);
        return (
          <RideshareModal
            tripId={rideDrawer}
            tripTitle={rt?.title ?? "טיול"}
            tripDate={rt?.date ?? null}
            onClose={() => setRideDrawer(null)}
          />
        );
      })()}
    </div>
  );
}

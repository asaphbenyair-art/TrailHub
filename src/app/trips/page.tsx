"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import CalendarView from "@/components/CalendarView";
import ModeSwitch from "@/components/ModeSwitch";
import { TRIP_TAGS } from "@/lib/tripTags";

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

interface Trip {
  id: string; title: string; region: string; difficulty: string; status: string;
  date: string; startTime: string; durationMin: number; distanceKm: number;
  price: number; maxSpots: number; spotsBooked: number; images: string[];
  tripType?: string; endDate?: string | null; _count?: { days: number }; accessWindowDays?: number | null;
  guide: { rating: number; user: { name: string | null } };
  guides?: { role: string; guide: { user: { name: string | null } } }[];
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
  category: "guided" | "self_guided"; tags: string[];
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
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 3200);
    return () => clearInterval(t);
  }, [images.length]);

  return images[idx] ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={idx} src={images[idx]} alt={title} className="w-full h-full object-cover" style={{ animation: "fadeIn .35s ease" }} />
  ) : (
    <div className="w-full h-full" style={{ background: "linear-gradient(160deg,#3d6b35,#1a3d16)" }} />
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
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [purchasesOnly, setPurchasesOnly] = useState(false);

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
    fetch("/api/my-purchases").then((r) => r.ok ? r.json() : []).then((d) => {
      if (Array.isArray(d)) setPurchasedIds(new Set(d.map((p: { trip: { id: string } }) => p.trip.id)));
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
      const res = await fetch(`/api/trips?${p.toString()}`);
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
    fetch("/api/my-trips")
      .then((r) => r.json())
      .then((regs: Array<{ status: string; trip: { id: string } }>) => {
        if (!Array.isArray(regs)) return;
        const map: Record<string, string> = {};
        regs.forEach((r) => { if (r.status !== "CANCELLED") map[r.trip.id] = r.status; });
        setMyRegMap(map);
      })
      .catch(() => {});
  }, [session]);

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
  const userName = session?.user?.name ?? null;

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
              <ModeSwitch current="hiker" />
              <NotificationBell />
              <Link href="/profile">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                  style={{ background: avatarColor(userName) }}>
                  {initials(userName)}
                </div>
              </Link>
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
          {([["guided", "🧭 טיולים מודרכים"], ["self_guided", "🎒 טיולים עצמאיים"]] as const).map(([v, label]) => (
            <button key={v} type="button"
              onClick={() => { const next = { ...filters, category: v }; setFilters(next); setTrips([]); setPurchasesOnly(false); setMyTripsOnly(false); fetchTrips(next); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.category === v ? "bg-[#1A6B4A] text-white" : "text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
        {filters.category === "self_guided" && session && (
          <button type="button" onClick={() => setPurchasesOnly((v) => !v)}
            className={`text-[11px] rounded-full px-3 py-1.5 border transition-colors shrink-0 ${
              purchasesOnly ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-500"}`}>
            🎒 הרכישות שלי
          </button>
        )}
      </div>

      {/* List / Calendar view toggle */}
      <div className={`max-w-5xl mx-auto px-3 mb-2 flex justify-center md:justify-start ${filters.category === "self_guided" ? "hidden" : ""}`}>
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
      {view === "calendar" && (
        <div className="max-w-5xl mx-auto px-3 pb-8">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <CalendarView trips={trips} regStatus={myRegMap} />
          </div>
        </div>
      )}

      {/* Body (list view) */}
      <div className={`max-w-5xl mx-auto px-3 pb-24 md:flex md:gap-4 ${view === "calendar" ? "hidden" : ""}`}>

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
              <button type="button" onClick={() => setMyTripsOnly((v) => !v)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex-shrink-0 transition-colors ${
                  myTripsOnly ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "bg-white border-gray-200 text-gray-600"}`}>
                ❤ הטיולים שלי
              </button>
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
                    <TripCardHero images={trip.images ?? []} title={trip.title} />

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
                    const meta = isSG
                      ? [
                          { t: `🎒 טיול עצמאי` },
                          { t: `🔓 גישה ל-${trip.accessWindowDays ?? 30} ימים` },
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
                    <div className="flex flex-wrap mb-2" style={{ gap: 0 }}>
                      {meta.map((m, i, arr) => (
                        <span key={i} className="text-[11px] text-gray-500"
                          style={{ paddingLeft: i < arr.length-1 ? 8 : 0, marginLeft: i < arr.length-1 ? 8 : 0, borderLeft: i < arr.length-1 ? "1px solid #eee" : "none" }}>
                          {m.t}
                        </span>
                      ))}
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
    </div>
  );
}

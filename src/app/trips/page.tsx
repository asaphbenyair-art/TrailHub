"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import CalendarView from "@/components/CalendarView";

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
  guide: { rating: number; user: { name: string | null } };
}
interface Filters {
  q: string; regions: string[]; difficulties: string[]; dateFrom: string; priceMax: string; sort: string;
}
function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}
const EMPTY_FILTERS: Filters = { q: "", regions: [], difficulties: [], dateFrom: "", priceMax: "", sort: "date" };

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
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [myRegMap, setMyRegMap] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [mobileCalOpen, setMobileCalOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTrips = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (f.q) p.set("q", f.q);
      if (f.regions.length) p.set("regions", f.regions.join(","));
      if (f.difficulties.length) p.set("difficulties", f.difficulties.join(","));
      if (f.dateFrom) p.set("dateFrom", f.dateFrom);
      if (f.priceMax) p.set("priceMax", f.priceMax);
      const res = await fetch(`/api/trips?${p.toString()}`);
      let data: Trip[] = await res.json();
      if (!Array.isArray(data)) data = [];
      if (f.sort === "price_asc") data = [...data].sort((a, b) => a.price - b.price);
      if (f.sort === "price_desc") data = [...data].sort((a, b) => b.price - a.price);
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

  function applyDraft() {
    setFilters(draft); setPanelOpen(false); fetchTrips(draft);
  }
  function clearFilter(key: keyof Filters, val?: string) {
    const next = { ...filters };
    if (key === "regions" && val) next.regions = filters.regions.filter((r) => r !== val);
    else if (key === "difficulties" && val) next.difficulties = filters.difficulties.filter((d) => d !== val);
    else (next[key] as string) = "";
    setFilters(next); setDraft(next); fetchTrips(next);
  }
  function handleSearch(value: string) {
    const next = { ...filters, q: value };
    setFilters(next); setDraft(next);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchTrips(next), 380);
  }
  function handleDateSelect(d: Date | null) {
    setSelectedDate(d);
    setMobileCalOpen(false);
  }

  // Client-side date filter
  const displayedTrips = selectedDate
    ? trips.filter((t) => sameDay(new Date(t.date), selectedDate))
    : trips;

  const activeCount = filters.regions.length + filters.difficulties.length +
    (filters.dateFrom ? 1 : 0) + (filters.priceMax ? 1 : 0);
  const userName = session?.user?.name ?? null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5]">
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

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

      {/* Body */}
      <div className="max-w-5xl mx-auto px-3 pb-8 md:flex md:gap-4">

        {/* ── Calendar side panel (desktop, RIGHT side in RTL) ── */}
        <aside className="hidden md:block w-[290px] shrink-0 self-start sticky top-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-3 pt-3 pb-1 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">📅 יומן טיולים</span>
              {selectedDate && (
                <button type="button" onClick={() => setSelectedDate(null)}
                  className="float-left text-[10px] text-gray-400 hover:text-[#1A6B4A] mt-0.5">נקה</button>
              )}
            </div>
            <CalendarView
              compact
              trips={trips}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
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
                mobileCalOpen || selectedDate
                  ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              📅 {selectedDate
                ? selectedDate.toLocaleDateString("he-IL", { day: "numeric", month: "short" })
                : "סנן לפי תאריך"}
              {selectedDate && (
                <span onClick={(e) => { e.stopPropagation(); setSelectedDate(null); }} className="font-bold">✕</span>
              )}
            </button>
          </div>

          {/* Mobile calendar panel */}
          {mobileCalOpen && (
            <div className="md:hidden bg-white rounded-2xl overflow-hidden mb-2 shadow-sm">
              <CalendarView
                compact
                trips={trips}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </div>
          )}

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-1.5" style={{ scrollbarWidth: "none" }}>
            <button
              type="button"
              onClick={() => { if (!panelOpen) setDraft(filters); setPanelOpen((v) => !v); }}
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
          </div>

          {/* Filter panel */}
          {panelOpen && (
            <div className="bg-white rounded-xl p-4 mb-2">
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">תאריך מ-</div>
                <input type="date" value={draft.dateFrom}
                  onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">איזור בארץ</div>
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.map((r) => (
                    <button key={r} type="button"
                      onClick={() => setDraft((d) => ({ ...d, regions: toggle(d.regions, r) }))}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        draft.regions.includes(r) ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
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
                      onClick={() => setDraft((p) => ({ ...p, difficulties: toggle(p.difficulties, d.value) }))}
                      className={`flex-1 py-1.5 rounded-full text-xs border transition-colors ${
                        draft.difficulties.includes(d.value) ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-2">מחיר מקסימום (₪)</div>
                <input type="number" value={draft.priceMax}
                  onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value }))}
                  placeholder="כל המחירים"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
              </div>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setDraft((d) => ({ ...d, regions: [], difficulties: [], dateFrom: "", priceMax: "" }))}
                  className="text-xs text-gray-400 hover:text-gray-600">נקה הכל</button>
                <button type="button" onClick={applyDraft}
                  className="px-5 py-2 bg-[#1A6B4A] text-white rounded-full text-xs font-medium hover:bg-[#155a3e] transition-colors">
                  הצג תוצאות
                </button>
              </div>
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-xs text-gray-500">
              {loading ? "טוען..." : selectedDate
                ? `${displayedTrips.length} טיולים ב-${selectedDate.toLocaleDateString("he-IL",{day:"numeric",month:"short"})}`
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

            {/* Empty state when date selected but no trips */}
            {!loading && selectedDate && displayedTrips.length === 0 && (
              <div className="text-center py-14">
                <div className="text-3xl mb-3">📅</div>
                <div className="text-gray-600 text-sm font-medium">
                  אין טיולים ב-{selectedDate.toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                <div className="text-gray-400 text-xs mt-1">בחר תאריך אחר ביומן</div>
                <button type="button" onClick={() => setSelectedDate(null)}
                  className="mt-4 px-4 py-2 text-xs text-[#1A6B4A] border border-[#1A6B4A] rounded-full hover:bg-[#D6EDE3] transition-colors">
                  הצג כל הטיולים
                </button>
              </div>
            )}

            {/* Empty state — no trips at all */}
            {!loading && !selectedDate && displayedTrips.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">🔍</div>
                <div className="text-gray-500 text-sm">לא נמצאו טיולים</div>
                <div className="text-gray-400 text-xs mt-1">נסה לשנות את הפילטרים</div>
              </div>
            )}

            {displayedTrips.map((trip) => {
              const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 0);
              const occupancy = trip.maxSpots > 0 ? trip.spotsBooked / trip.maxSpots : 0;
              const isFull = trip.status === "FULL" || occupancy >= 1;
              const guideName = trip.guide?.user?.name ?? null;
              const diff = DIFF_STYLE[trip.difficulty];
              const myStatus = myRegMap[trip.id];

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

                  {/* Hero with image slideshow */}
                  <div className="relative overflow-hidden" style={{ height: 160 }}>
                    <TripCardHero images={trip.images ?? []} title={trip.title} />

                    <div className="absolute top-2.5 right-2.5 flex gap-1.5 z-10">
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

                    <button type="button" onClick={(e) => e.stopPropagation()}
                      className="absolute top-2.5 left-2.5 bg-black/40 rounded-full w-7 h-7 flex items-center justify-center text-white text-sm z-10">
                      ♡
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 z-10"
                      style={{ background: "linear-gradient(to top,rgba(0,0,0,0.68),transparent)" }}>
                      <div className="text-[13px] font-medium text-white leading-snug mb-1.5">{trip.title}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/85">
                        <div className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[8px] font-medium text-white flex-shrink-0"
                          style={{ background: avatarColor(guideName) }}>
                          {initials(guideName)}
                        </div>
                        {guideName || "מדריך"}{trip.guide?.rating > 0 ? ` · ★${trip.guide.rating.toFixed(1)}` : ""}
                      </div>
                    </div>
                  </div>

                  {isFull && (
                    <div className="mx-3 mt-2.5 px-3 py-1.5 bg-[#FDF3DC] rounded-lg flex items-center justify-between text-xs text-[#633806]">
                      <span>⏰ הטיול מלא — רשימת המתנה פתוחה</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/trips/${trip.id}/register?flow=waitlist`); }}
                        className="text-[#854F0B] font-medium mr-2">הצטרף</button>
                    </div>
                  )}

                  <div className="px-3 pt-2 pb-2.5">
                    <div className="flex flex-wrap mb-2" style={{ gap: 0 }}>
                      {[
                        { t: formatDate(trip.date) },
                        { t: trip.startTime },
                        ...(trip.distanceKm > 0 ? [{ t: `📍 ${trip.distanceKm} ק"מ` }] : []),
                        ...(trip.durationMin > 0 ? [{ t: `⏱ ${Math.round(trip.durationMin / 60)} שע'` }] : []),
                      ].map((m, i, arr) => (
                        <span key={i} className="text-[11px] text-gray-500"
                          style={{ paddingLeft: i < arr.length-1 ? 8 : 0, marginLeft: i < arr.length-1 ? 8 : 0, borderLeft: i < arr.length-1 ? "1px solid #eee" : "none" }}>
                          {i === 0 ? `📅 ${m.t}` : i === 1 ? `🕖 ${m.t}` : m.t}
                        </span>
                      ))}
                    </div>
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
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div>
                        <span className="text-[17px] font-medium text-gray-900">₪{trip.price.toLocaleString("he-IL")}</span>
                        <span className="text-[11px] text-gray-400 mr-1">לאדם</span>
                      </div>
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => router.push(`/trips/${trip.id}/register?flow=interest`)}
                          className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full text-[11px]">
                          מתעניין
                        </button>
                        {!isFull ? (
                          <button type="button" onClick={() => router.push(`/trips/${trip.id}/register`)}
                            className="px-3.5 py-1.5 bg-[#1A6B4A] text-white rounded-full text-[11px] font-medium">
                            להרשמה
                          </button>
                        ) : (
                          <button type="button" onClick={() => router.push(`/trips/${trip.id}/register?flow=waitlist`)}
                            className="px-3.5 py-1.5 bg-[#C0392B] text-white rounded-full text-[11px] font-medium">
                            המתנה
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

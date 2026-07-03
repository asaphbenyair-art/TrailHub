"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { hebrewDayNum, hebrewMonthYear, type CalendarMode } from "@/lib/hebrewDate";

const WEEKDAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

const DIFF_COLOR: Record<string, { bg: string; color: string; dot: string }> = {
  EASY:    { bg: "#EAF3DE", color: "#27500A", dot: "#27500A" },
  MEDIUM:  { bg: "#FAEEDA", color: "#633806", dot: "#633806" },
  HARD:    { bg: "#FADBD8", color: "#791F1F", dot: "#791F1F" },
  EXTREME: { bg: "#E8D0D0", color: "#4A0F0F", dot: "#4A0F0F" },
};
const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };

interface Trip {
  id: string; title: string; region: string; difficulty: string; status: string;
  date: string; startTime: string; durationMin: number; distanceKm: number;
  price: number; maxSpots: number; spotsBooked: number; images: string[];
  guide: { rating: number; user: { name: string | null } };
}

function formatDuration(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}:${String(m).padStart(2,"0")} שע׳` : `${h} שע׳`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Availability for a day's trips: the badge shows REMAINING SPOTS (not trip count).
// green = plenty, amber = almost full (<20% left), red + lock = completely full.
function dayBadgeStyle(dayTrips: Trip[]): { bg: string; text: string; remaining: number; full: boolean } | null {
  if (!dayTrips.length) return null;
  let remaining = 0, capacity = 0;
  for (const t of dayTrips) { remaining += Math.max(t.maxSpots - t.spotsBooked, 0); capacity += t.maxSpots; }
  const full = remaining === 0;
  const ratio = capacity > 0 ? remaining / capacity : 0;
  if (full) return { bg: "#FADBD8", text: "#791F1F", remaining, full };
  if (ratio < 0.2) return { bg: "#FAEEDA", text: "#633806", remaining, full };
  return { bg: "#D6EDE3", text: "#0F5038", remaining, full };
}

export interface DateRange { start: Date | null; end: Date | null }

// ── Compact Month Panel (side panel) ──────────────────────────────
function CompactMonthPanel({
  trips, range, onRangeChange, calMode = "gregorian",
}: {
  trips: Trip[];
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  calMode?: CalendarMode;
}) {
  const today = new Date();
  const anchor = range.start;
  const [viewYear, setViewYear] = useState(anchor?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor?.getMonth() ?? today.getMonth());
  const [jumpValue, setJumpValue] = useState("");

  // Drag-to-select a date range (mousedown → drag across days → mouseup)
  const [dragging, setDragging] = useState(false);
  const dragAnchor = useRef<Date | null>(null);
  const dragMoved = useRef(false);
  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  function startDrag(d: Date) { dragAnchor.current = d; dragMoved.current = false; setDragging(true); }
  function dragOver(d: Date) {
    if (!dragging || !dragAnchor.current) return;
    dragMoved.current = true;
    const a = dragAnchor.current;
    const [s, e] = d < a ? [d, a] : [a, d];
    onRangeChange({ start: s, end: e });
  }

  useEffect(() => {
    if (range.start) {
      setViewYear(range.start.getFullYear());
      setViewMonth(range.start.getMonth());
    }
  }, [range.start]);

  const tripsByDay = useMemo(() => {
    const map: Record<string, Trip[]> = {};
    trips.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [trips, viewYear, viewMonth]);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow = firstDay.getDay();
  const prevDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells: Array<{ day: number; curr: boolean }> = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, curr: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curr: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startDow + 2, curr: false });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function handleJump(e: React.ChangeEvent<HTMLInputElement>) {
    setJumpValue(e.target.value);
    if (!e.target.value) return;
    const d = new Date(e.target.value);
    if (!isNaN(d.getTime())) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }
  function handleDayClick(day: number) {
    const clicked = new Date(viewYear, viewMonth, day);
    const { start, end } = range;
    // No selection yet, or a complete range exists → start a fresh selection
    if (!start || (start && end)) {
      onRangeChange({ start: clicked, end: null });
    } else {
      // A start is set, no end yet
      if (sameDay(clicked, start)) {
        onRangeChange({ start: null, end: null }); // click same day → clear
      } else if (clicked < start) {
        onRangeChange({ start: clicked, end: null }); // earlier day → restart from it
      } else {
        onRangeChange({ start, end: clicked }); // later day → close the range
      }
    }
  }

  return (
    <div className="p-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth}
          className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-fg-muted hover:bg-surface-2 text-sm">‹</button>
        <span className="text-sm font-semibold text-fg">
          {calMode === "hebrew" ? hebrewMonthYear(new Date(viewYear, viewMonth, 1)) : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
        </span>
        <button type="button" onClick={nextMonth}
          className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-fg-muted hover:bg-surface-2 text-sm">›</button>
      </div>

      {/* Jump to date */}
      <div className="mb-3">
        <input
          type="date"
          value={jumpValue}
          onChange={handleJump}
          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A] bg-surface"
          placeholder="קפוץ לתאריך"
          dir="ltr"
        />
      </div>

      {/* Selected range summary / hint */}
      {(range.start || range.end) && (
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] bg-[#F2F9F5] rounded-lg px-2 py-1.5">
          <span className="text-[#0F5038] font-medium">
            {range.start && range.end
              ? `${range.start.toLocaleDateString("he-IL", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}`
              : range.start
                ? `${range.start.toLocaleDateString("he-IL", { day: "numeric", month: "short" })} · בחר תאריך סיום`
                : ""}
          </span>
          <button type="button" onClick={() => onRangeChange({ start: null, end: null })}
            className="text-fg-faint hover:text-[#1A6B4A] shrink-0">נקה</button>
        </div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_NAMES.map((n) => (
          <div key={n} className="text-center text-[9px] text-fg-faint font-semibold py-0.5">{n}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const cellDate = cell.curr ? new Date(viewYear, viewMonth, cell.day) : null;
          // Absolute date for this grid slot (works for spill-over cells too).
          const slotDate = new Date(viewYear, viewMonth, 1 - startDow + i);
          const dayLabel = calMode === "hebrew" ? hebrewDayNum(slotDate) : cell.day;
          const isToday = !!cellDate && sameDay(cellDate, today);
          const isStart = !!cellDate && !!range.start && sameDay(cellDate, range.start);
          const isEnd = !!cellDate && !!range.end && sameDay(cellDate, range.end);
          const isEndpoint = isStart || isEnd;
          const inRange = !!cellDate && !!range.start && !!range.end && cellDate > range.start && cellDate < range.end;
          const isSelected = isEndpoint; // endpoints render like the old single-selected day
          const dayTrips = cell.curr ? (tripsByDay[cell.day.toString()] ?? []) : [];
          const badge = dayBadgeStyle(dayTrips);
          const count = dayTrips.length;

          return (
            <button
              key={i}
              type="button"
              disabled={!cell.curr}
              onMouseDown={() => cellDate && startDrag(cellDate)}
              onMouseEnter={() => cellDate && dragOver(cellDate)}
              onClick={() => { if (!cell.curr) return; if (dragMoved.current) { dragMoved.current = false; return; } handleDayClick(cell.day); }}
              className={`flex flex-col items-center py-1 transition-colors select-none ${
                isEndpoint ? "bg-[#1A6B4A] rounded-lg" :
                inRange ? "bg-[#D6EDE3] rounded-none" :
                cell.curr ? "hover:bg-surface-2 cursor-pointer rounded-lg" : "cursor-default rounded-lg"
              }`}
            >
              <span className={`text-xs leading-none ${
                isEndpoint ? "text-white font-bold" :
                inRange ? "text-[#0F5038] font-semibold" :
                isToday ? "text-[#1A6B4A] font-bold" :
                cell.curr ? "text-fg" : "text-fg-faint"
              }`}>
                {dayLabel}
              </span>
              {count > 0 && badge && (
                <span
                  className="mt-0.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 leading-none"
                  style={isSelected
                    ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                    : { background: badge.bg, color: badge.text }}
                  title={badge.full ? "מלא" : `${badge.remaining} מקומות פנויים`}
                >
                  {badge.full ? "🔒" : badge.remaining > 99 ? "99+" : badge.remaining}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-border flex flex-col gap-1">
        <div className="text-[9px] text-fg-faint font-medium mb-0.5">מקומות פנויים ביום</div>
        {[
          { bg: "#D6EDE3", text: "#0F5038", label: "יש X מקומות פנויים", icon: "X" },
          { bg: "#FAEEDA", text: "#633806", label: "כמעט מלא — X מקומות", icon: "X" },
          { bg: "#FADBD8", text: "#791F1F", label: "מלא", icon: "🔒" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: item.bg, color: item.text }}>{item.icon}</span>
            <span className="text-[9px] text-fg-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Full Month View (mobile fullscreen) ───────────────────────────
function MonthView({ trips, year, month, onDayClick, selectedDay, calMode = "gregorian" }: {
  trips: Trip[]; year: number; month: number;
  onDayClick: (d: Date) => void; selectedDay: Date; calMode?: CalendarMode;
}) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();
  const prevDays = new Date(year, month, 0).getDate();
  const today = new Date();

  const tripsByDay = useMemo(() => {
    const map: Record<string, Trip[]> = {};
    trips.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [trips, year, month]);

  const cells: Array<{ day: number; curr: boolean }> = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, curr: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curr: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startDow + 2, curr: false });

  return (
    <div>
      <div className="grid grid-cols-7 px-3 mb-1">
        {WEEKDAY_NAMES.map((n) => (
          <div key={n} className="text-center text-[10px] text-fg-faint font-semibold py-1">{n}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-3 gap-y-0.5">
        {cells.map((cell, i) => {
          const isToday = cell.curr && sameDay(new Date(year, month, cell.day), today);
          const isSelected = cell.curr && sameDay(new Date(year, month, cell.day), selectedDay);
          const dayTrips = cell.curr ? (tripsByDay[cell.day.toString()] ?? []) : [];
          const badge = dayBadgeStyle(dayTrips);
          return (
            <button key={i} type="button" disabled={!cell.curr}
              onClick={() => cell.curr && onDayClick(new Date(year, month, cell.day))}
              className={`flex flex-col items-center pt-1 pb-1 rounded-lg transition-colors ${
                isSelected ? "bg-[#1A6B4A]" :
                cell.curr ? "hover:bg-surface-2 cursor-pointer" : "cursor-default"
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center text-xs rounded-full leading-none ${
                isSelected ? "text-white font-bold" :
                isToday ? "bg-[#1A6B4A] text-white font-semibold" :
                cell.curr ? "text-fg" : "text-fg-faint"
              } ${cell.curr && dayTrips.length ? "font-semibold" : ""}`}>
                {calMode === "hebrew" ? hebrewDayNum(new Date(year, month, 1 - startDow + i)) : cell.day}
              </span>
              {badge && (
                <div className="flex gap-[3px] mt-0.5">
                  {dayTrips.slice(0,3).map((t, j) => (
                    <div key={j} className="w-[5px] h-[5px] rounded-full"
                      style={{ background: isSelected ? "#fff" : (DIFF_COLOR[t.difficulty]?.dot ?? "#999") }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 px-4 pt-2 pb-1 flex-wrap">
        {Object.entries(DIFF_COLOR).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1 text-[10px] text-fg-muted">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.dot }} />
            {DIFF_LABEL[k]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────
function WeekView({ trips, weekStart, activeDay, setActiveDay }: {
  trips: Trip[]; weekStart: Date; activeDay: Date; setActiveDay: (d: Date) => void;
}) {
  const router = useRouter();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  });
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const dayTrips = useMemo(() => {
    const map: Record<string, Trip[]> = {};
    trips.forEach((t) => {
      const k = dayKey(new Date(t.date));
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [trips]);

  const activeDayTrips = dayTrips[dayKey(activeDay)] ?? [];
  return (
    <div>
      <div className="flex gap-1.5 px-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {days.map((d, i) => {
          const k = dayKey(d);
          const hasTr = (dayTrips[k]?.length ?? 0) > 0;
          const isActive = sameDay(d, activeDay);
          const isToday = sameDay(d, new Date());
          return (
            <button key={i} type="button" onClick={() => setActiveDay(d)}
              className="flex flex-col items-center px-3 py-2 rounded-xl shrink-0 transition-colors"
              style={{ background: isActive ? "#1A6B4A" : "#f5f5f5", color: isActive ? "#fff" : "#333" }}>
              <span className="text-[10px] opacity-70">{WEEKDAY_NAMES[d.getDay()]}</span>
              <span className={`text-sm font-semibold ${isToday && !isActive ? "text-[#1A6B4A]" : ""}`}>{d.getDate()}</span>
              {hasTr && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isActive ? "#fff" : "#1A6B4A" }} />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 px-3">
        {activeDayTrips.length === 0 && <div className="py-8 text-center text-sm text-fg-faint">אין טיולים ביום זה</div>}
        {activeDayTrips.map((t) => {
          const isFull = t.status === "FULL" || t.spotsBooked >= t.maxSpots;
          const occ = t.maxSpots > 0 ? t.spotsBooked / t.maxSpots : 0;
          const diff = DIFF_COLOR[t.difficulty];
          return (
            <button key={t.id} type="button" onClick={() => router.push(`/trips/${t.id}`)}
              className="flex gap-3 bg-surface rounded-xl p-3 border border-border text-right hover:bg-surface-2 transition-colors w-full">
              <div className="flex flex-col items-center shrink-0" style={{ minWidth: 42 }}>
                <span className="text-xs font-semibold text-[#1A6B4A]">{t.startTime}</span>
                <div className="flex-1 w-px bg-surface-2 my-1" style={{ minHeight: 20 }} />
                {t.durationMin > 0 && <span className="text-[10px] text-fg-faint">{formatDuration(t.durationMin)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg mb-1 text-right leading-snug">{t.title}</p>
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {diff && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>{DIFF_LABEL[t.difficulty]}</span>}
                  <span className="text-[10px] text-fg-muted">📍 {t.region}</span>
                </div>
                <div className="h-[3px] bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(occ*100,100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }} />
                </div>
                <p className="text-[10px] text-fg-faint mt-0.5">{t.spotsBooked}/{t.maxSpots} מקומות</p>
              </div>
              <div className="shrink-0 text-left">
                <p className="text-sm font-semibold text-fg">₪{t.price.toLocaleString("he-IL")}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────
function DayView({ trips, day, regStatus }: { trips: Trip[]; day: Date; regStatus?: Record<string, string> }) {
  const router = useRouter();
  const dayTrips = useMemo(() => trips.filter((t) => sameDay(new Date(t.date), day))
    .sort((a, b) => a.startTime.localeCompare(b.startTime)), [trips, day]);

  return (
    <div className="flex flex-col gap-3 px-3">
      {dayTrips.length === 0 && <div className="py-12 text-center text-sm text-fg-faint">אין טיולים ביום זה</div>}
      {dayTrips.map((t) => {
        const isFull = t.status === "FULL" || t.spotsBooked >= t.maxSpots;
        const occ = t.maxSpots > 0 ? t.spotsBooked / t.maxSpots : 0;
        const diff = DIFF_COLOR[t.difficulty];
        const spotsLeft = Math.max(t.maxSpots - t.spotsBooked, 0);
        const myStatus = regStatus?.[t.id];
        const isRegistered = myStatus === "CONFIRMED";
        const guideName = t.guide?.user?.name;
        return (
          <div key={t.id} className="bg-surface rounded-2xl overflow-hidden border-2" style={{ borderColor: isRegistered ? "#1A6B4A" : "#f0f0f0" }}>
            {isRegistered && <div className="text-center py-1 text-[10px] font-semibold text-[#0F5038] bg-[#D6EDE3]">✓ רשום לטיול זה</div>}
            <div className="relative cursor-pointer" style={{ height: 110 }} onClick={() => router.push(`/trips/${t.id}`)}>
              {isFull && !isRegistered && <div className="absolute top-0 left-0 right-0 z-10 text-center py-1 text-[10px] font-semibold text-white bg-[#C0392B]">מלא — אפשר רשימת המתנה</div>}
              {t.images?.[0]
                ? <img src={t.images[0]} alt={t.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#2C5F8A,#0f2a0d)" }} />}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 55%)" }} />
              <div className="absolute bottom-2 right-3 left-3">
                <p className="text-sm font-semibold text-white leading-snug">{t.title}</p>
              </div>
              <div className="absolute top-1.5 right-2.5 flex gap-1" style={{ top: isFull ? 28 : 8 }}>
                {diff && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>{DIFF_LABEL[t.difficulty]}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface/90 text-fg">📍 {t.region}</span>
              </div>
            </div>
            <div className="px-3 py-2.5">
              <div className="flex gap-3 text-[11px] text-fg-muted mb-2 flex-wrap">
                <span>🕐 {t.startTime}</span>
                {t.durationMin > 0 && <span>⏱ {formatDuration(t.durationMin)}</span>}
                {t.distanceKm > 0 && <span>📍 {t.distanceKm} ק"מ</span>}
              </div>
              <div className="h-[3px] bg-surface-2 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full" style={{ width: `${Math.min(occ*100,100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }} />
              </div>
              {guideName && <p className="text-[11px] text-fg-muted mb-1">{guideName}{t.guide?.rating > 0 ? ` · ★${t.guide.rating.toFixed(1)}` : ""}</p>}
              <div className="flex justify-between items-center mt-1.5">
                <div>
                  <p className="text-sm font-semibold text-fg">₪{t.price.toLocaleString("he-IL")} <span className="text-[10px] font-normal text-fg-faint">לאדם</span></p>
                  <p className="text-[10px] text-fg-faint mt-0.5">{t.spotsBooked} מתוך {t.maxSpots} מקומות{isFull ? " — מלא" : ` — נותרו ${spotsLeft}`}</p>
                </div>
                {isRegistered ? (
                  <button type="button" onClick={() => router.push("/my-trips")}
                    className="px-4 py-2 text-xs font-semibold rounded-full bg-[#D6EDE3] text-[#0F5038] hover:bg-[#c3e6d6] transition-colors">
                    הטיולים שלי
                  </button>
                ) : (
                  <button type="button"
                    onClick={() => router.push(isFull ? `/trips/${t.id}/register?flow=waitlist` : `/trips/${t.id}/register`)}
                    className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${isFull ? "bg-[#EEF5FC] text-[#185FA5] border border-[#185FA5]/30 hover:bg-[#dfeefb]" : "bg-[#1A6B4A] text-white hover:bg-[#155a3e]"}`}>
                    {isFull ? "רשימת המתנה" : "הרשמה ←"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main CalendarView ─────────────────────────────────────────────
type CalTab = "month" | "week" | "day";

interface CalendarViewProps {
  trips: Trip[];
  compact?: boolean;
  selectedDate?: Date | null;
  onDateSelect?: (d: Date | null) => void;
  range?: DateRange;
  onRangeChange?: (r: DateRange) => void;
  regStatus?: Record<string, string>;
  calMode?: CalendarMode;
}

export default function CalendarView({ trips, compact, onDateSelect, range, onRangeChange, regStatus, calMode = "gregorian" }: CalendarViewProps) {
  const today = new Date();
  const [calTab, setCalTab] = useState<CalTab>("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const weekStart = useMemo(() => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [selectedDay]);

  if (compact) {
    return (
      <CompactMonthPanel
        trips={trips}
        range={range ?? { start: null, end: null }}
        onRangeChange={onRangeChange ?? (() => {})}
        calMode={calMode}
      />
    );
  }

  // Full-screen mobile mode
  function prevPeriod() {
    if (calTab === "month") {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
      else setViewMonth(m => m - 1);
    } else if (calTab === "week") {
      const d = new Date(weekStart); d.setDate(d.getDate() - 7); setSelectedDay(d);
    } else {
      const d = new Date(selectedDay); d.setDate(d.getDate() - 1); setSelectedDay(d);
    }
  }
  function nextPeriod() {
    if (calTab === "month") {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
      else setViewMonth(m => m + 1);
    } else if (calTab === "week") {
      const d = new Date(weekStart); d.setDate(d.getDate() + 7); setSelectedDay(d);
    } else {
      const d = new Date(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(d);
    }
  }
  function periodLabel() {
    if (calTab === "month") return calMode === "hebrew" ? hebrewMonthYear(new Date(viewYear, viewMonth, 1)) : `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    if (calTab === "week") {
      const e = new Date(weekStart); e.setDate(weekStart.getDate() + 6);
      return `${weekStart.getDate()}–${e.getDate()} ${MONTH_NAMES[weekStart.getMonth()]}`;
    }
    return selectedDay.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  }
  function handleDayClick(d: Date) {
    setSelectedDay(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setCalTab("day");
    onDateSelect?.(d);
  }

  return (
    <div className="pb-4">
      <div className="flex border-b border-border mb-2 px-3">
        {(["month","week","day"] as CalTab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => setCalTab(tab)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              calTab === tab ? "border-[#1A6B4A] text-[#1A6B4A]" : "border-transparent text-fg-faint hover:text-fg-muted"
            }`}>
            {tab === "month" ? "חודש" : tab === "week" ? "שבוע" : "יום"}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 mb-3">
        <button type="button" onClick={prevPeriod}
          className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-fg-muted hover:bg-surface-2">‹</button>
        <span className="text-sm font-semibold text-fg">{periodLabel()}</span>
        <button type="button" onClick={nextPeriod}
          className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-fg-muted hover:bg-surface-2">›</button>
      </div>
      {calTab === "month" && <MonthView trips={trips} year={viewYear} month={viewMonth} onDayClick={handleDayClick} selectedDay={selectedDay} calMode={calMode} />}
      {calTab === "week" && <WeekView trips={trips} weekStart={weekStart} activeDay={selectedDay} setActiveDay={setSelectedDay} />}
      {calTab === "day" && <DayView trips={trips} day={selectedDay} regStatus={regStatus} />}
    </div>
  );
}

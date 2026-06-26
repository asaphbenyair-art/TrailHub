"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const DIFF_COLOR: Record<string, { bg: string; color: string; dot: string }> = {
  EASY:    { bg: "#EAF3DE", color: "#27500A", dot: "#27500A" },
  MEDIUM:  { bg: "#FAEEDA", color: "#633806", dot: "#633806" },
  HARD:    { bg: "#FADBD8", color: "#791F1F", dot: "#791F1F" },
  EXTREME: { bg: "#E8D0D0", color: "#4A0F0F", dot: "#4A0F0F" },
};
const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };

const WEEKDAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

interface Trip {
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
  guide: { rating: number; user: { name: string | null } };
}

function formatDuration(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}:${String(m).padStart(2, "0")} שע׳` : `${h} שע׳`;
}

// ── Month view ─────────────────────────────────────────────────
function MonthView({ trips, year, month, onDayClick }: {
  trips: Trip[]; year: number; month: number; onDayClick: (d: Date) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // day-of-week for first cell (Sun=0)
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevDays = new Date(year, month, 0).getDate();

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

  const today = new Date();

  // Build grid cells
  const cells: Array<{ day: number; curr: boolean }> = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, curr: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curr: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startDow + 2, curr: false });

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {WEEKDAY_NAMES.map((n) => (
          <div key={n} className="text-center text-[10px] text-gray-400 font-semibold py-1">{n}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 px-3 gap-y-0.5">
        {cells.map((cell, i) => {
          const isToday = cell.curr &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === cell.day;
          const dayTrips = cell.curr ? (tripsByDay[cell.day.toString()] ?? []) : [];
          const dots = dayTrips.slice(0, 3);
          return (
            <button
              key={i}
              type="button"
              disabled={!cell.curr}
              onClick={() => cell.curr && onDayClick(new Date(year, month, cell.day))}
              className={`flex flex-col items-center pt-1 pb-1 rounded-lg transition-colors ${
                cell.curr ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"
              }`}
            >
              <span
                className={`w-6 h-6 flex items-center justify-center text-xs rounded-full leading-none ${
                  isToday ? "bg-[#1A6B4A] text-white font-semibold" :
                  cell.curr ? "text-gray-800" : "text-gray-300"
                } ${cell.curr && dayTrips.length ? "font-semibold" : ""}`}
              >
                {cell.day}
              </span>
              {dots.length > 0 && (
                <div className="flex gap-[3px] mt-0.5">
                  {dots.map((t, j) => (
                    <div
                      key={j}
                      className="w-[5px] h-[5px] rounded-full"
                      style={{ background: isToday ? "#fff" : (DIFF_COLOR[t.difficulty]?.dot ?? "#999") }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-3 px-4 pt-2 pb-1 flex-wrap">
        {Object.entries(DIFF_COLOR).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1 text-[10px] text-gray-500">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.dot }} />
            {DIFF_LABEL[k]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Week view ───────────────────────────────────────────────────
function WeekView({ trips, weekStart, onDayClick, activeDay, setActiveDay }: {
  trips: Trip[];
  weekStart: Date;
  onDayClick: (d: Date) => void;
  activeDay: Date;
  setActiveDay: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const dayTrips = useMemo(() => {
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const map: Record<string, Trip[]> = {};
    trips.forEach((t) => {
      const d = new Date(t.date);
      const k = key(d);
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [trips]);

  const activeDayKey = `${activeDay.getFullYear()}-${activeDay.getMonth()}-${activeDay.getDate()}`;
  const activeDayTrips = dayTrips[activeDayKey] ?? [];
  const router = useRouter();

  return (
    <div>
      {/* Day pills */}
      <div className="flex gap-1.5 px-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {days.map((d, i) => {
          const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const hasTr = (dayTrips[k]?.length ?? 0) > 0;
          const isActive = k === activeDayKey;
          const isToday = new Date().toDateString() === d.toDateString();
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveDay(d)}
              className="flex flex-col items-center px-3 py-2 rounded-xl shrink-0 transition-colors"
              style={{
                background: isActive ? "#1A6B4A" : "#f5f5f5",
                color: isActive ? "#fff" : "#333",
              }}
            >
              <span className="text-[10px] opacity-70">{WEEKDAY_NAMES[d.getDay()]}</span>
              <span className={`text-sm font-semibold ${isToday && !isActive ? "text-[#1A6B4A]" : ""}`}>
                {d.getDate()}
              </span>
              {hasTr && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isActive ? "#fff" : "#1A6B4A" }} />}
            </button>
          );
        })}
      </div>

      {/* Active day trips */}
      <div className="flex flex-col gap-2 px-3">
        {activeDayTrips.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">אין טיולים ביום זה</div>
        )}
        {activeDayTrips.map((t) => {
          const isFull = t.status === "FULL" || t.spotsBooked >= t.maxSpots;
          const occ = t.maxSpots > 0 ? t.spotsBooked / t.maxSpots : 0;
          const diff = DIFF_COLOR[t.difficulty];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => router.push(`/trips/${t.id}`)}
              className="flex gap-3 bg-white rounded-xl p-3 border border-gray-100 text-right hover:bg-gray-50 transition-colors w-full"
            >
              {/* Time column */}
              <div className="flex flex-col items-center shrink-0" style={{ minWidth: 42 }}>
                <span className="text-xs font-semibold text-[#1A6B4A]">{t.startTime}</span>
                <div className="flex-1 w-px bg-gray-200 my-1" style={{ minHeight: 20 }} />
                {t.durationMin > 0 && (
                  <span className="text-[10px] text-gray-400">{formatDuration(t.durationMin)}</span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-1 text-right leading-snug">{t.title}</p>
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {diff && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>
                      {DIFF_LABEL[t.difficulty]}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">📍 {t.region}</span>
                </div>
                <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(occ * 100, 100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{t.spotsBooked}/{t.maxSpots} מקומות</p>
              </div>
              {/* Price */}
              <div className="shrink-0 text-left">
                <p className="text-sm font-semibold text-gray-900">₪{t.price.toLocaleString("he-IL")}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Day view ────────────────────────────────────────────────────
function DayView({ trips, day }: { trips: Trip[]; day: Date }) {
  const router = useRouter();

  const dayTrips = useMemo(() => {
    return trips
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === day.getFullYear() &&
               d.getMonth() === day.getMonth() &&
               d.getDate() === day.getDate();
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [trips, day]);

  return (
    <div className="flex flex-col gap-3 px-3">
      {dayTrips.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">אין טיולים ביום זה</div>
      )}
      {dayTrips.map((t) => {
        const isFull = t.status === "FULL" || t.spotsBooked >= t.maxSpots;
        const occ = t.maxSpots > 0 ? t.spotsBooked / t.maxSpots : 0;
        const diff = DIFF_COLOR[t.difficulty];
        const spotsLeft = Math.max(t.maxSpots - t.spotsBooked, 0);
        return (
          <div key={t.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
            {/* Hero */}
            <div
              className="relative cursor-pointer"
              style={{ height: 110 }}
              onClick={() => router.push(`/trips/${t.id}`)}
            >
              {isFull && (
                <div className="absolute top-0 left-0 right-0 z-10 text-center py-1 text-[10px] font-semibold text-white bg-[#C0392B]">
                  מלא — אפשר רשימת המתנה
                </div>
              )}
              {t.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.images[0]} alt={t.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#2C5F8A,#0f2a0d)" }} />
              )}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 55%)" }} />
              <div className="absolute bottom-2 right-3 left-3">
                <p className="text-sm font-semibold text-white leading-snug">{t.title}</p>
              </div>
              <div className="absolute top-1.5 right-2.5 flex gap-1" style={{ top: isFull ? 28 : 8 }}>
                {diff && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>
                    {DIFF_LABEL[t.difficulty]}
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/90 text-gray-700">📍 {t.region}</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-3 py-2.5">
              <div className="flex gap-3 text-[11px] text-gray-500 mb-2 flex-wrap">
                <span>🕐 {t.startTime}</span>
                {t.durationMin > 0 && <span>⏱ {formatDuration(t.durationMin)}</span>}
                {t.distanceKm > 0 && <span>📍 {t.distanceKm} ק"מ</span>}
              </div>
              <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full" style={{ width: `${Math.min(occ * 100, 100)}%`, background: isFull ? "#C0392B" : "#1A6B4A" }} />
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">₪{t.price.toLocaleString("he-IL")} <span className="text-[10px] font-normal text-gray-400">לאדם</span></p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isFull ? "מלא" : `${spotsLeft} מקומות נותרו`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(isFull ? `/trips/${t.id}/register?flow=waitlist` : `/trips/${t.id}/register`)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full text-white ${
                    isFull ? "bg-[#C0392B] hover:bg-[#a93226]" : "bg-[#1A6B4A] hover:bg-[#155a3e]"
                  } transition-colors`}
                >
                  {isFull ? "רשימת המתנה" : "הרשמה ←"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main CalendarView ───────────────────────────────────────────
type CalTab = "month" | "week" | "day";

export default function CalendarView({ trips }: { trips: Trip[] }) {
  const today = new Date();
  const [calTab, setCalTab] = useState<CalTab>("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // Week containing selectedDay
  const weekStart = useMemo(() => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - d.getDay()); // go to Sunday
    return d;
  }, [selectedDay]);

  function prevPeriod() {
    if (calTab === "month") {
      if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
      else setViewMonth((m) => m - 1);
    } else if (calTab === "week") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setSelectedDay(d);
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() - 1);
      setSelectedDay(d);
    }
  }

  function nextPeriod() {
    if (calTab === "month") {
      if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
      else setViewMonth((m) => m + 1);
    } else if (calTab === "week") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setSelectedDay(d);
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() + 1);
      setSelectedDay(d);
    }
  }

  function periodLabel() {
    if (calTab === "month") return `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    if (calTab === "week") {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]}`;
    }
    return selectedDay.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  }

  function handleDayClick(d: Date) {
    setSelectedDay(d);
    setCalTab("day");
  }

  return (
    <div className="pb-4">
      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200 mb-2 px-3">
        {(["month", "week", "day"] as CalTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setCalTab(tab)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              calTab === tab ? "border-[#1A6B4A] text-[#1A6B4A]" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab === "month" ? "חודש" : tab === "week" ? "שבוע" : "יום"}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between px-4 mb-3">
        <button type="button" onClick={nextPeriod} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-800">{periodLabel()}</span>
        <button type="button" onClick={prevPeriod} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
          ›
        </button>
      </div>

      {calTab === "month" && (
        <MonthView
          trips={trips}
          year={viewYear}
          month={viewMonth}
          onDayClick={handleDayClick}
        />
      )}
      {calTab === "week" && (
        <WeekView
          trips={trips}
          weekStart={weekStart}
          onDayClick={handleDayClick}
          activeDay={selectedDay}
          setActiveDay={setSelectedDay}
        />
      )}
      {calTab === "day" && (
        <DayView trips={trips} day={selectedDay} />
      )}
    </div>
  );
}

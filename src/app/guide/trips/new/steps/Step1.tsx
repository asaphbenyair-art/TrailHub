"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { WizardData, TripDayData, SourceMaterial, WaypointData } from "../types";
import SourceMaterialsEditor from "./SourceMaterialsEditor";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

const DAY_DIFFICULTIES = [
  { value: "EASY", label: "קל" },
  { value: "MEDIUM", label: "בינוני" },
  { value: "HARD", label: "קשה" },
  { value: "EXTREME", label: "קיצוני" },
];

// Per-day route editor for a journey day — GPX + waypoints on a map, same logic as a single-day trip.
function DayRouteEditor({
  day,
  onUpdate,
}: {
  day: TripDayData;
  onUpdate: (field: keyof TripDayData, value: string | WaypointData[]) => void;
}) {
  const gpxRef = useRef<HTMLInputElement>(null);
  const gpxPickedAt = useRef(0);
  const [mapMode, setMapMode] = useState<"view" | "edit">("edit");
  const gpx = day.gpxData ?? "";
  const wps = day.waypointsJson ?? [];
  const GPX_REMOVE_WARNING = "מחיקת קובץ ה-GPX תמחק את כל נקודות העצירה של יום זה. להמשיך?";

  function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (gpx && wps.length > 0 && !window.confirm(GPX_REMOVE_WARNING)) {
      if (gpxRef.current) gpxRef.current.value = "";
      return;
    }
    gpxPickedAt.current = Date.now();
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdate("gpxData", (ev.target?.result as string) ?? "");
      if (wps.length > 0) onUpdate("waypointsJson", []);
    };
    reader.readAsText(file);
  }
  function clearGpx() {
    if (wps.length > 0 && !window.confirm(GPX_REMOVE_WARNING)) return;
    onUpdate("gpxData", "");
    onUpdate("waypointsJson", []);
    if (gpxRef.current) gpxRef.current.value = "";
  }
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (Date.now() - gpxPickedAt.current < 700) return;
    onUpdate("waypointsJson", [...wps, { lat, lng, name: `נקודת עצירה ${wps.length + 1}`, description: "" }]);
  }, [wps, onUpdate]);
  function patchWp(i: number, patch: Partial<WaypointData>) {
    onUpdate("waypointsJson", wps.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  }
  function removeWp(i: number) {
    onUpdate("waypointsJson", wps.filter((_, j) => j !== i));
  }

  return (
    <div className="flex flex-col gap-2 pt-1.5 border-t border-border">
      <label className="text-[11px] font-medium text-fg-muted">מסלול היום (GPX + נקודות עצירה)</label>
      {gpx ? (
        <div className="flex items-center gap-2 border border-[#1A6B4A] bg-[#D6EDE3] rounded-lg px-3 py-2">
          <span>🗺</span>
          <span className="text-xs text-[#0F5038] flex-1 truncate">קובץ GPX נטען</span>
          <button type="button" onClick={clearGpx} className="text-fg-faint hover:text-red-500 text-xs px-1">✕</button>
        </div>
      ) : (
        <div onClick={() => gpxRef.current?.click()}
          className="border border-dashed border-border rounded-lg p-3 text-center text-fg-faint text-xs cursor-pointer hover:border-[#1A6B4A] hover:bg-surface-2 transition-colors select-none">
          🗺 לחץ להעלאת קובץ GPX ליום זה
        </div>
      )}
      <input ref={gpxRef} type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={handleGpxFile} />

      {gpx && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex bg-surface-2 rounded-full p-0.5">
              <button type="button" onClick={() => setMapMode("edit")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${mapMode === "edit" ? "bg-[#1A6B4A] text-white" : "text-fg-muted"}`}>✏️ עריכה</button>
              <button type="button" onClick={() => setMapMode("view")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${mapMode === "view" ? "bg-[#185FA5] text-white" : "text-fg-muted"}`}>👁 צפייה</button>
            </div>
            <span className="text-[10px] text-fg-faint">{mapMode === "edit" ? "הקש על המפה להוספת תחנה" : "גרירה והגדלה בלבד"}</span>
          </div>
          <TripMap
            gpxContent={gpx}
            waypoints={wps.map((w) => ({ lat: w.lat, lng: w.lng, label: w.name }))}
            onMapClick={handleMapClick}
            editable={mapMode === "edit"}
          />
          {wps.map((wp, i) => (
            <div key={i} className="border border-border rounded-lg p-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[#1A6B4A] font-medium text-[11px] shrink-0">📍 {i + 1}</span>
                <input type="text" value={wp.name} onChange={(e) => patchWp(i, { name: e.target.value })}
                  placeholder="שם הנקודה" className="flex-1 border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#1A6B4A]" />
                <button type="button" onClick={() => removeWp(i)} className="text-fg-faint hover:text-red-400 px-1">✕</button>
              </div>
              <input type="text" value={wp.description} onChange={(e) => patchWp(i, { description: e.target.value })}
                placeholder="תיאור קצר (אופציונלי)" className="border border-border rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-[#1A6B4A]" />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const REGIONS = ["גליל עליון", "גליל תחתון", "כרמל", "ירושלים", "שפלה", "נגב", "ערבה", "גולן", "עמק יזרעאל", "אפרים ומנשה", "ארץ בנימין", "יהודה"];

const TRIP_TYPES = [
  { value: "DAY_HIKE", label: "טיול יום", desc: "טיול חד-יומי" },
  { value: "EXPEDITION", label: "מסע", desc: "מספר ימים רצופים" },
] as const;

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string | string[] | TripDayData[]) => void;
  selfGuided?: boolean;
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload failed");
  const { url } = await res.json();
  return url as string;
}

function ImageUpload({
  label,
  preview,
  onFile,
  multiple = false,
}: {
  label: string;
  preview?: string | string[];
  onFile: (files: File[]) => void;
  multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const previews = Array.isArray(preview) ? preview : preview ? [preview] : [];

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      onFile(files);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length) onFile(files);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-fg-muted">{label}</label>

      {previews.length > 0 ? (
        <div className={`grid gap-2 ${multiple ? "grid-cols-3" : "grid-cols-1"}`}>
          {previews.map((src, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden bg-surface-2" style={{ height: multiple ? 80 : 160 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onFile([])}
                className="absolute top-1 left-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ))}
          {multiple && previews.length < 8 && (
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="rounded-lg border border-dashed border-border flex items-center justify-center text-fg-faint text-2xl hover:border-[#1A6B4A] transition-colors"
              style={{ height: 80 }}
            >
              +
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !uploading && ref.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border border-dashed border-border rounded-lg p-5 text-center text-fg-faint text-sm cursor-pointer hover:border-[#1A6B4A] hover:bg-surface-2 transition-colors select-none"
        >
          {uploading ? (
            <div className="text-[#1A6B4A] text-sm">מעלה...</div>
          ) : (
            <>
              <div className="text-2xl mb-1">🖼</div>
              <div>גרור תמונה לכאן או <span className="text-[#1A6B4A] font-medium">לחץ להעלאה</span></div>
              <div className="text-xs text-fg-faint mt-1">JPG, PNG, WEBP — עד 10MB</div>
            </>
          )}
        </div>
      )}

      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

const HE_WEEKDAYS = ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"];
const HE_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

// Derived date for a day = journey start date + (dayNumber - 1) days
function derivedDayDate(startDate: string, dayNumber: number): Date | null {
  if (!startDate) return null;
  const d = new Date(startDate + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}
function dayDateIso(startDate: string, dayNumber: number): string {
  const d = derivedDayDate(startDate, dayNumber);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayDateLabel(startDate: string, dayNumber: number): string {
  const d = derivedDayDate(startDate, dayNumber);
  if (!d) return "";
  return `${HE_WEEKDAYS[d.getDay()]} ${d.getDate()} ${HE_MONTHS[d.getMonth()]}`;
}

function TripDayEditor({
  days,
  onChange,
  startDate,
  endDate,
}: {
  days: TripDayData[];
  onChange: (days: TripDayData[]) => void;
  startDate: string;
  endDate: string;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Auto-generate the number of days from the journey date range (start → end),
  // preserving any content already entered for existing days.
  const targetCount = (() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  })();

  useEffect(() => {
    if (targetCount === days.length) return;
    const next: TripDayData[] = Array.from({ length: targetCount }, (_, i) => {
      const existing = days[i];
      return existing
        ? { ...existing, dayNumber: i + 1, date: dayDateIso(startDate, i + 1) }
        : {
            dayNumber: i + 1,
            title: "",
            description: "",
            distanceKm: "",
            durationHours: "",
            startPoint: "",
            endPoint: "",
            date: dayDateIso(startDate, i + 1),
            startTime: "07:00",
            estimatedEndTime: "",
            isRestDay: false,
            equipment: "",
          };
    });
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCount]);

  // Keep derived dates in sync if the journey start date changes.
  useEffect(() => {
    if (!days.length) return;
    let changed = false;
    const next = days.map((d, i) => {
      const iso = dayDateIso(startDate, i + 1);
      if (d.date !== iso) { changed = true; return { ...d, date: iso }; }
      return d;
    });
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  function updateDay(idx: number, field: keyof TripDayData, value: string | boolean | SourceMaterial[] | WaypointData[]) {
    const next = days.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    onChange(next);
  }
  function toggle(idx: number) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(idx)) n.delete(idx); else n.add(idx);
      return n;
    });
  }
  const allExpanded = days.length > 0 && expanded.size === days.length;
  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(days.map((_, i) => i)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted">ימי המסע ({days.length})</span>
        {days.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-[#1A6B4A] font-medium border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors"
          >
            {allExpanded ? "צמצם הכל" : "הרחב הכל"}
          </button>
        )}
      </div>
      {days.length === 0 && (
        <p className="text-xs text-fg-faint text-center py-3">קבע תאריך התחלה ותאריך סיום — הימים ייווצרו אוטומטית</p>
      )}
      {days.map((day, idx) => {
        const isOpen = expanded.has(idx);
        return (
        <div key={idx} className="border border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggle(idx)}
            className="w-full flex items-center justify-between p-3 text-right hover:bg-[#F7FAF8] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-faint">{isOpen ? "▼" : "◀"}</span>
              <span className="text-xs font-semibold text-[#1A6B4A]">יום {day.dayNumber}</span>
              {dayDateLabel(startDate, day.dayNumber) && (
                <span className="text-[11px] text-fg-muted">— {dayDateLabel(startDate, day.dayNumber)}</span>
              )}
              {day.startTime && <span className="text-[11px] text-fg-faint" dir="ltr">{day.startTime}</span>}
              {day.isRestDay && <span className="text-[10px] text-[#E8A020] bg-[#FBF0DA] rounded-full px-2 py-0.5">מנוחה</span>}
            </div>
            {day.title && <span className="text-[11px] text-fg-faint truncate max-w-[40%]">{day.title}</span>}
          </button>
          {isOpen && (
          <div className="p-3 pt-0 flex flex-col gap-2">
            <div className="flex items-center justify-end mb-1">
              <label className="flex items-center gap-1 text-[11px] text-fg-muted">
                <input type="checkbox" checked={day.isRestDay} onChange={(e) => updateDay(idx, "isRestDay", e.target.checked)} />
                יום מנוחה
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-fg-faint">שעת מפגש</label>
                <input
                  type="time"
                  value={day.startTime}
                  onChange={(e) => updateDay(idx, "startTime", e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-fg-faint">שעת סיום משוערת</label>
                <input
                  type="time"
                  value={day.estimatedEndTime}
                  onChange={(e) => updateDay(idx, "estimatedEndTime", e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  dir="ltr"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder={day.isRestDay ? "שם היום (למשל: מנוחה בחניון)" : "שם היום (למשל: מנחל דן לחרמון)"}
              value={day.title}
              onChange={(e) => updateDay(idx, "title", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            />
            <textarea
              placeholder="תיאור קצר של היום"
              value={day.description}
              onChange={(e) => updateDay(idx, "description", e.target.value)}
              rows={2}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
            />
            {!day.isRestDay && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-fg-faint">רמת קושי</label>
                  <div className="flex gap-1.5">
                    {DAY_DIFFICULTIES.map((d) => (
                      <button key={d.value} type="button" onClick={() => updateDay(idx, "difficulty", d.value)}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] transition-colors ${
                          (day.difficulty ?? "") === d.value ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-border text-fg-muted"
                        }`}>{d.label}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="נקודת התחלה" value={day.startPoint}
                    onChange={(e) => updateDay(idx, "startPoint", e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  <input type="text" placeholder="נקודת סיום" value={day.endPoint}
                    onChange={(e) => updateDay(idx, "endPoint", e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  <input type="number" placeholder="ק״מ" value={day.distanceKm}
                    onChange={(e) => updateDay(idx, "distanceKm", e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  <input type="number" placeholder="שעות הליכה" value={day.durationHours}
                    onChange={(e) => updateDay(idx, "durationHours", e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                </div>
                <input type="text" placeholder="ציוד נוסף ליום זה (מעבר לציוד הבסיס של המסע)" value={day.equipment}
                  onChange={(e) => updateDay(idx, "equipment", e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                <DayRouteEditor
                  day={day}
                  onUpdate={(field, value) => updateDay(idx, field, value)}
                />
              </>
            )}
            <div className="pt-1.5 border-t border-border">
              <SourceMaterialsEditor label="חומרי מקור ליום זה" materials={day.sources ?? []}
                onChange={(next) => updateDay(idx, "sources", next)} />
            </div>
          </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

export default function Step1({ data, onChange }: Props) {
  const [mainPreview, setMainPreview] = useState<string>(data.mainImagePreview ?? "");
  const [extraPreviews, setExtraPreviews] = useState<string[]>(data.extraImagePreviews ?? []);
  const [uploading, setUploading] = useState(false);

  async function handleMainImage(files: File[]) {
    if (!files.length) {
      setMainPreview("");
      onChange("mainImagePreview", "");
      return;
    }
    const localUrl = URL.createObjectURL(files[0]);
    setMainPreview(localUrl);
    setUploading(true);
    try {
      const serverUrl = await uploadFile(files[0]);
      setMainPreview(serverUrl);
      onChange("mainImagePreview", serverUrl);
    } catch {
      onChange("mainImagePreview", localUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleExtraImages(files: File[]) {
    if (!files.length) return;
    const localUrls = files.map((f) => URL.createObjectURL(f));
    const next = [...extraPreviews, ...localUrls].slice(0, 8);
    setExtraPreviews(next);
    setUploading(true);
    try {
      const serverUrls = await Promise.all(files.map((f) => uploadFile(f)));
      const nextServer = [...extraPreviews, ...serverUrls].slice(0, 8);
      setExtraPreviews(nextServer);
      onChange("extraImagePreviews", nextServer);
    } catch {
      onChange("extraImagePreviews", next);
    } finally {
      setUploading(false);
    }
  }

  const isSelfGuided = data.tripType === "SELF_GUIDED";
  const isMultiDay = data.tripType === "EXPEDITION";

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-fg border-b border-border pb-3 mb-1">
        פרטים בסיסיים
      </div>

      {/* Trip type selector — hidden for self-guided (type already chosen) */}
      {isSelfGuided ? (
        <div className="bg-[#EEF5FC] rounded-xl p-3 text-xs text-[#185FA5]">
          🎒 טיול עצמאי — תוכן לרכישה, ללא תאריך, ללא הגבלת משתתפים, ללא מדריך בשטח.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-fg-muted">סוג הטיול</label>
          <div className="grid grid-cols-3 gap-2">
            {TRIP_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange("tripType", t.value)}
                className={`rounded-xl border p-2 text-center transition-colors ${
                  data.tripType === t.value
                    ? "border-[#1A6B4A] bg-[#D6EDE3]"
                    : "border-border hover:border-border"
                }`}
              >
                <div className="text-xs font-semibold text-fg">{t.label}</div>
                <div className="text-[10px] text-fg-faint mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-fg-muted">שם הטיול</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="למשל: טיול נחל פולג — מעיינות ובריכות"
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-fg-muted">תיאור</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="תיאור חופשי — מה רואים, מה עושים, מה מיוחד..."
          rows={3}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
        />
      </div>

      {!isSelfGuided && (
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">
            {isMultiDay ? "תאריך התחלה" : "תאריך"}
          </label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChange("date", e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
        {isMultiDay ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-fg-muted">תאריך סיום</label>
            <input
              type="date"
              value={data.endDate}
              min={data.date}
              onChange={(e) => onChange("endDate", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              dir="ltr"
            />
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-fg-muted">שעת מפגש</label>
              <input
                type="time"
                value={data.startTime}
                onChange={(e) => onChange("startTime", e.target.value)}
                className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                dir="ltr"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-fg-muted">שעת סיום משוערת</label>
              <input
                type="time"
                value={data.estimatedEndTime}
                onChange={(e) => onChange("estimatedEndTime", e.target.value)}
                className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                dir="ltr"
              />
              <span className="text-[10px] text-fg-faint text-center block">ביקורות על הטיול יתאפשרו החל משעה לפני סוף הטיול</span>
            </div>
          </div>
        )}
      </div>
      )}

      {isMultiDay && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">שעת מפגש</label>
          <input
            type="time"
            value={data.startTime}
            onChange={(e) => onChange("startTime", e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] w-32"
            dir="ltr"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-fg-muted">איזור בארץ</label>
        <select
          value={data.region}
          onChange={(e) => onChange("region", e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-surface"
        >
          <option value="">בחר איזור...</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-fg-muted">נקודת מפגש</label>
        <input
          type="text"
          value={data.meetingPoint}
          onChange={(e) => onChange("meetingPoint", e.target.value)}
          placeholder="הקלד כתובת או שם מקום..."
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
        />
        <p className="text-xs text-fg-faint mt-1">ניתן להקליד כתובת מדויקת או שם מקום מוכר</p>
      </div>

      {isMultiDay && (
        <TripDayEditor
          days={data.tripDays}
          onChange={(days) => onChange("tripDays", days)}
          startDate={data.date}
          endDate={data.endDate}
        />
      )}

      {isMultiDay && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-fg-muted">אופן הרשמה למסע</label>
          {[
            { value: "FULL_ONLY", label: "מסע מלא בלבד", desc: "הרשמה לכל הימים, ללא ביטול חלקי" },
            { value: "INDIVIDUAL_DAYS", label: "ימים בודדים", desc: "כל יום עצמאי, הרשמה ומחיר נפרדים" },
            { value: "FLEXIBLE", label: "מסע עם גמישות", desc: "הרשמה לכל המסע עם אפשרות לרדת ביום מסוים" },
          ].map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange("registrationMode", m.value)}
              className={`text-right rounded-xl border p-2.5 transition-colors ${
                data.registrationMode === m.value ? "border-[#1A6B4A] bg-[#D6EDE3]" : "border-border hover:border-border"
              }`}
            >
              <div className="text-xs font-semibold text-fg">{m.label}</div>
              <div className="text-[10px] text-fg-faint mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      )}

      <ImageUpload
        label="תמונה ראשית"
        preview={mainPreview}
        onFile={handleMainImage}
      />

      <ImageUpload
        label="תמונות נוספות (עד 8)"
        preview={extraPreviews}
        onFile={handleExtraImages}
        multiple
      />
    </div>
  );
}

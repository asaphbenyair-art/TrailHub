"use client";

import { useRef, useState } from "react";
import { WizardData, TripDayData } from "../types";

const REGIONS = ["גליל עליון", "גליל תחתון", "כרמל", "ירושלים", "שפלה", "נגב", "ערבה", "גולן", "עמק יזרעאל"];

const TRIP_TYPES = [
  { value: "DAY_HIKE", label: "טיול יום", desc: "טיול חד-יומי" },
  { value: "EXPEDITION", label: "מסע", desc: "מספר ימים רצופים" },
  { value: "MULTI_SITE", label: "מרובה אתרים", desc: "מספר יעדים נפרדים" },
  { value: "SELF_GUIDED", label: "טיול עצמאי", desc: "תוכן לרכישה, ללא מדריך" },
] as const;

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string | string[] | TripDayData[]) => void;
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
      <label className="text-xs font-medium text-gray-500">{label}</label>

      {previews.length > 0 ? (
        <div className={`grid gap-2 ${multiple ? "grid-cols-3" : "grid-cols-1"}`}>
          {previews.map((src, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden bg-gray-100" style={{ height: multiple ? 80 : 160 }}>
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
              className="rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-2xl hover:border-[#1A6B4A] transition-colors"
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
          className="border border-dashed border-gray-200 rounded-lg p-5 text-center text-gray-400 text-sm cursor-pointer hover:border-[#1A6B4A] hover:bg-gray-50 transition-colors select-none"
        >
          {uploading ? (
            <div className="text-[#1A6B4A] text-sm">מעלה...</div>
          ) : (
            <>
              <div className="text-2xl mb-1">🖼</div>
              <div>גרור תמונה לכאן או <span className="text-[#1A6B4A] font-medium">לחץ להעלאה</span></div>
              <div className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP — עד 10MB</div>
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

function TripDayEditor({
  days,
  onChange,
}: {
  days: TripDayData[];
  onChange: (days: TripDayData[]) => void;
}) {
  function updateDay(idx: number, field: keyof TripDayData, value: string | boolean) {
    const next = days.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    onChange(next);
  }

  function addDay() {
    onChange([...days, {
      dayNumber: days.length + 1,
      title: "",
      description: "",
      distanceKm: "",
      durationHours: "",
      startPoint: "",
      endPoint: "",
      date: "",
      startTime: "",
      isRestDay: false,
      equipment: "",
    }]);
  }

  function removeDay(idx: number) {
    const next = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">ימי המסע</span>
        <button
          type="button"
          onClick={addDay}
          className="text-xs text-[#1A6B4A] font-medium border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors"
        >
          + הוסף יום
        </button>
      </div>
      {days.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">לחץ "הוסף יום" להגדרת כל יום</p>
      )}
      {days.map((day, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#1A6B4A]">יום {day.dayNumber}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-[11px] text-gray-500">
                <input type="checkbox" checked={day.isRestDay} onChange={(e) => updateDay(idx, "isRestDay", e.target.checked)} />
                יום מנוחה
              </label>
              <button type="button" onClick={() => removeDay(idx)} className="text-xs text-red-400 hover:text-red-600">הסר</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={day.date}
              onChange={(e) => updateDay(idx, "date", e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              dir="ltr"
            />
            <input
              type="time"
              value={day.startTime}
              onChange={(e) => updateDay(idx, "startTime", e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              dir="ltr"
            />
          </div>
          <input
            type="text"
            placeholder={day.isRestDay ? "שם היום (למשל: מנוחה בחניון)" : "שם היום (למשל: מנחל דן לחרמון)"}
            value={day.title}
            onChange={(e) => updateDay(idx, "title", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
          />
          <textarea
            placeholder="תיאור קצר של היום"
            value={day.description}
            onChange={(e) => updateDay(idx, "description", e.target.value)}
            rows={2}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
          />
          {!day.isRestDay && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="נקודת התחלה" value={day.startPoint}
                  onChange={(e) => updateDay(idx, "startPoint", e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                <input type="text" placeholder="נקודת סיום" value={day.endPoint}
                  onChange={(e) => updateDay(idx, "endPoint", e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                <input type="number" placeholder="ק״מ" value={day.distanceKm}
                  onChange={(e) => updateDay(idx, "distanceKm", e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                <input type="number" placeholder="שעות הליכה" value={day.durationHours}
                  onChange={(e) => updateDay(idx, "durationHours", e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
              </div>
              <input type="text" placeholder="ציוד מיוחד ליום זה (אופציונלי)" value={day.equipment}
                onChange={(e) => updateDay(idx, "equipment", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
            </>
          )}
        </div>
      ))}
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
  const isMultiDay = data.tripType === "EXPEDITION" || data.tripType === "MULTI_SITE";

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-3 mb-1">
        פרטים בסיסיים
      </div>

      {/* Trip type selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500">סוג הטיול</label>
        <div className="grid grid-cols-2 gap-2">
          {TRIP_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange("tripType", t.value)}
              className={`rounded-xl border p-2 text-center transition-colors ${
                data.tripType === t.value
                  ? "border-[#1A6B4A] bg-[#D6EDE3]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-xs font-semibold text-gray-800">{t.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">שם הטיול</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="למשל: טיול נחל פולג — מעיינות ובריכות"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">תיאור</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="תיאור חופשי — מה רואים, מה עושים, מה מיוחד..."
          rows={3}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
        />
      </div>

      {isSelfGuided && (
        <div className="flex flex-col gap-1 bg-[#EEF5FC] rounded-xl p-3">
          <label className="text-xs font-medium text-[#185FA5]">חלון גישה לתוכן (ימים לאחר רכישה)</label>
          <input
            type="number" min="1"
            value={data.accessWindowDays}
            onChange={(e) => onChange("accessWindowDays", e.target.value)}
            placeholder="30"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white"
            dir="ltr"
          />
          <p className="text-[11px] text-gray-500 mt-1">טיול עצמאי הוא תוכן לרכישה — ללא תאריך, ללא הגבלת משתתפים, ללא מדריך בשטח.</p>
        </div>
      )}

      {!isSelfGuided && (
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            {isMultiDay ? "תאריך התחלה" : "תאריך"}
          </label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChange("date", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
        {isMultiDay ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">תאריך סיום</label>
            <input
              type="date"
              value={data.endDate}
              min={data.date}
              onChange={(e) => onChange("endDate", e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              dir="ltr"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">שעת מפגש</label>
            <input
              type="time"
              value={data.startTime}
              onChange={(e) => onChange("startTime", e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              dir="ltr"
            />
          </div>
        )}
      </div>
      )}

      {isMultiDay && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">שעת מפגש</label>
          <input
            type="time"
            value={data.startTime}
            onChange={(e) => onChange("startTime", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] w-32"
            dir="ltr"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">איזור בארץ</label>
        <select
          value={data.region}
          onChange={(e) => onChange("region", e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white"
        >
          <option value="">בחר איזור...</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">נקודת מפגש</label>
        <input
          type="text"
          value={data.meetingPoint}
          onChange={(e) => onChange("meetingPoint", e.target.value)}
          placeholder="הקלד כתובת או שם מקום..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
        />
        <p className="text-xs text-gray-400 mt-1">ניתן להקליד כתובת מדויקת או שם מקום מוכר</p>
      </div>

      {isMultiDay && (
        <TripDayEditor
          days={data.tripDays}
          onChange={(days) => onChange("tripDays", days)}
        />
      )}

      {isMultiDay && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">אופן הרשמה למסע</label>
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
                data.registrationMode === m.value ? "border-[#1A6B4A] bg-[#D6EDE3]" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-xs font-semibold text-gray-800">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{m.desc}</div>
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

"use client";

import { WizardData } from "../types";
import SourceMaterialsEditor from "./SourceMaterialsEditor";

const PUBLISH_OPTIONS = [
  { key: "DRAFT",   status: "DRAFT", visibility: "PUBLIC",  icon: "📄", label: "טיוטה", desc: "שמור, גלוי רק לך" },
  { key: "PUBLIC",  status: "OPEN",  visibility: "PUBLIC",  icon: "🌍", label: "פרסום ציבורי", desc: "גלוי בחיפוש" },
  { key: "PRIVATE", status: "OPEN",  visibility: "PRIVATE", icon: "🔗", label: "פרסום פרטי", desc: "רק דרך לינק ישיר" },
] as const;

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני",
};

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string) => void;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      <div className="text-xs font-medium text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function Step5({ data, onChange }: Props) {
  const isSelfGuided = data.tripType === "SELF_GUIDED";
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-3 mb-1">
        סקירה ופרסום
      </div>

      <Section title="פרטים בסיסיים">
        <Row label="שם" value={data.title || "—"} />
        {!isSelfGuided && <Row label="תאריך" value={data.date ? `${data.date} · ${data.startTime}` : "—"} />}
        <Row label="איזור" value={data.region || "—"} />
        {!isSelfGuided && <Row label="נקודת מפגש" value={data.meetingPoint} />}
        {isSelfGuided && <Row label="חלון גישה" value={`${data.accessWindowDays || "30"} ימים`} />}
      </Section>

      <Section title="מסלול">
        <Row label="סוג" value={data.routeType === "one-way" ? "חד-כיווני" : data.routeType === "circular-nature" ? "מעגלי — שטח" : data.routeType === "circular-urban" ? "מעגלי — עירוני" : "—"} />
        <Row label={`אורך`} value={data.distanceKm ? `${data.distanceKm} ק"מ` : "—"} />
        <Row label="משך" value={data.durationHours ? `${data.durationHours} שע'` : "—"} />
        {isSelfGuided && <Row label="תחנות ניווט" value={String(data.waypointsJson.length)} />}
      </Section>

      <Section title={isSelfGuided ? "פרמטרים ומחיר" : "פרמטרים ותשלום"}>
        <Row label="קושי" value={DIFFICULTY_LABELS[data.difficulty] || "—"} />
        {!isSelfGuided && <Row label="גיל" value={data.ageMin ? `${data.ageMin}+` : undefined} />}
        {!isSelfGuided && <Row label="מקסימום" value={data.maxSpots || "—"} />}
        <Row label="מחיר" value={data.price ? `₪${data.price}` : "חינם"} />
      </Section>

      {/* Source materials (trip-level) */}
      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <SourceMaterialsEditor
          label="חומרי מקור לטיול (פסוקים, מאמרים, רקע היסטורי)"
          materials={data.sourceMaterials || []}
          onChange={(next) => onChange("sourceMaterials" as keyof WizardData, next as unknown as string)}
        />
        {(data.sourceMaterials || []).length > 0 && (
          <div className="flex gap-2">
            {([["preview", "גלוי מראש (תצוגה מקדימה)"], ["during", "רק במהלך הטיול"]] as const).map(([val, lbl]) => (
              <button key={val} type="button"
                onClick={() => onChange("sourceMaterialsVisibility" as keyof WizardData, val as unknown as string)}
                className={`flex-1 py-1.5 rounded-lg border text-xs transition-colors ${
                  data.sourceMaterialsVisibility === val ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-gray-200 text-gray-500"}`}>
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500">בחר מצב פרסום</label>
        <div className="flex gap-2">
          {PUBLISH_OPTIONS.map((opt) => {
            const selected = opt.key === "DRAFT"
              ? data.status === "DRAFT"
              : data.status !== "DRAFT" && data.visibility === opt.visibility;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => { onChange("status", opt.status); onChange("visibility", opt.visibility); }}
                className={`flex-1 py-3 px-2 rounded-lg border text-center transition-colors ${
                  selected ? "border-[#1A6B4A] bg-[#D6EDE3]" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-xl block mb-1">{opt.icon}</span>
                <div className={`text-xs font-medium ${selected ? "text-[#0F5038]" : "text-gray-700"}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

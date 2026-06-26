"use client";

import { WizardData } from "../types";

const PUBLISH_OPTIONS = [
  { value: "DRAFT", icon: "📄", label: "טיוטה", desc: "שמור, לא גלוי" },
  { value: "PREVIEW", icon: "🔗", label: "תצוגה מקדימה", desc: "גלוי דרך לינק" },
  { value: "OPEN", icon: "🌍", label: "פרסם", desc: "גלוי בחיפוש" },
];

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
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-3 mb-1">
        סקירה ופרסום
      </div>

      <Section title="פרטים בסיסיים">
        <Row label="שם" value={data.title || "—"} />
        <Row label="תאריך" value={data.date ? `${data.date} · ${data.startTime}` : "—"} />
        <Row label="איזור" value={data.region || "—"} />
        <Row label="נקודת מפגש" value={data.meetingPoint} />
      </Section>

      <Section title="מסלול">
        <Row label="סוג" value={data.routeType === "one-way" ? "חד-כיווני" : data.routeType === "circular-nature" ? "מעגלי — שטח" : data.routeType === "circular-urban" ? "מעגלי — עירוני" : "—"} />
        <Row label={`אורך`} value={data.distanceKm ? `${data.distanceKm} ק"מ` : "—"} />
        <Row label="משך" value={data.durationHours ? `${data.durationHours} שע'` : "—"} />
      </Section>

      <Section title="פרמטרים ותשלום">
        <Row label="קושי" value={DIFFICULTY_LABELS[data.difficulty] || "—"} />
        <Row label="גיל" value={data.ageMin ? `${data.ageMin}+` : undefined} />
        <Row label="מקסימום" value={data.maxSpots || "—"} />
        <Row label="מחיר" value={data.price ? `₪${data.price}` : "—"} />
      </Section>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500">בחר מצב פרסום</label>
        <div className="flex gap-2">
          {PUBLISH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange("status", opt.value)}
              className={`flex-1 py-3 px-2 rounded-lg border text-center transition-colors ${
                data.status === opt.value
                  ? "border-[#1A6B4A] bg-[#D6EDE3]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-xl block mb-1">{opt.icon}</span>
              <div className={`text-xs font-medium ${data.status === opt.value ? "text-[#0F5038]" : "text-gray-700"}`}>
                {opt.label}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

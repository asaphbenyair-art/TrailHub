"use client";

import { useRef, useState } from "react";
import { WizardData } from "../types";

const DIFFICULTIES = [
  { value: "EASY", label: "קל", cls: "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" },
  { value: "MEDIUM", label: "בינוני", cls: "border-[#E8A020] bg-[#FDF3DC] text-[#7A5010]" },
  { value: "HARD", label: "קשה", cls: "border-[#C0392B] bg-[#FADBD8] text-[#8B2519]" },
  { value: "EXTREME", label: "קיצוני", cls: "border-[#6B1A1A] bg-[#F5C0C0] text-[#4A0F0F]" },
];

const EQUIPMENT_PRESETS = [
  "נעלי הליכה", "כובע ושמשייה", "מים (2 ליטר)", "מים (3 ליטר)",
  "אוכל לצהריים", "מקל הליכה", "ערכת עזרה ראשונה", "קרם הגנה",
];

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string) => void;
}

export default function Step3({ data, onChange }: Props) {
  const [showMoreEq, setShowMoreEq] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const customRef = useRef<HTMLInputElement>(null);
  const selected = data.equipmentList || [];

  function addCustomItem() {
    const item = customInput.trim();
    if (!item || selected.includes(item)) { setCustomInput(""); return; }
    onChange("equipmentList" as keyof WizardData, [...selected, item] as unknown as string);
    setCustomInput("");
    customRef.current?.focus();
  }

  function toggleEquipment(item: string) {
    const current = data.equipmentList || [];
    const next = current.includes(item)
      ? current.filter((e) => e !== item)
      : [...current, item];
    onChange("equipmentList" as keyof WizardData, next as unknown as string);
  }

  const visibleEquipment = showMoreEq ? EQUIPMENT_PRESETS : EQUIPMENT_PRESETS.slice(0, 5);

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-3 mb-1">
        פרמטרים
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500">רמת קושי</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => onChange("difficulty", d.value)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                data.difficulty === d.value
                  ? d.cls
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">גיל מינימום</label>
          <input
            type="number"
            min="0"
            value={data.ageMin}
            onChange={(e) => onChange("ageMin", e.target.value)}
            placeholder="למשל: 8"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">גיל מקסימום</label>
          <input
            type="number"
            min="0"
            value={data.ageMax}
            onChange={(e) => onChange("ageMax", e.target.value)}
            placeholder="ללא הגבלה"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">רמה גופנית נדרשת</label>
        <textarea
          value={data.fitnessLevel}
          onChange={(e) => onChange("fitnessLevel", e.target.value)}
          placeholder="למשל: הליכה של 5 שעות בשטח לא אחיד"
          rows={2}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">מקסימום משתתפים</label>
          <input
            type="number"
            min="1"
            value={data.maxSpots}
            onChange={(e) => onChange("maxSpots", e.target.value)}
            placeholder="20"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">מינימום יציאה</label>
          <input
            type="number"
            min="1"
            value={data.minSpots}
            onChange={(e) => onChange("minSpots", e.target.value)}
            placeholder="5"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500">ציוד נדרש</label>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg min-h-[36px]">
            {selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-full text-xs"
              >
                {item}
                <button
                  type="button"
                  onClick={() => toggleEquipment(item)}
                  className="text-gray-400 hover:text-red-500 text-xs leading-none"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="border border-gray-100 rounded-lg overflow-hidden">
          {visibleEquipment.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleEquipment(item)}
              className={`w-full flex items-center justify-between px-3 py-2 border-b border-gray-50 text-sm last:border-b-0 hover:bg-gray-50 transition-colors ${
                selected.includes(item) ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <span>{item}</span>
              <span className={selected.includes(item) ? "text-gray-300" : "text-[#1A6B4A]"}>
                {selected.includes(item) ? "✓" : "＋"}
              </span>
            </button>
          ))}
          {!showMoreEq && (
            <button
              type="button"
              onClick={() => setShowMoreEq(true)}
              className="w-full text-center text-[#1A6B4A] text-xs py-2 hover:bg-gray-50"
            >
              + הצג עוד ציוד
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <input
            ref={customRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomItem())}
            placeholder="הוסף ציוד ידנית..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
          />
          <button
            type="button"
            onClick={addCustomItem}
            className="px-3 py-2 bg-[#1A6B4A] text-white rounded-lg text-xs font-medium hover:bg-[#155a3e] transition-colors whitespace-nowrap"
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}

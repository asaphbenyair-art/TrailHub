"use client";

import { useRef, useState } from "react";
import { WizardData, RegFieldData } from "../types";
import { TRIP_TAGS } from "@/lib/tripTags";
import UserPicker from "@/components/UserPicker";

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
  selfGuided?: boolean;
}

export default function Step3({ data, onChange, selfGuided = false }: Props) {
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

  const regFields = data.registrationFields || [];
  function updateFields(next: RegFieldData[]) {
    onChange("registrationFields" as keyof WizardData, next as unknown as string);
  }
  function addField() {
    updateFields([...regFields, { id: Math.random().toString(36).slice(2, 9), label: "", type: "text", required: false, options: [] }]);
  }
  function patchField(i: number, patch: Partial<RegFieldData>) {
    updateFields(regFields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeField(i: number) {
    updateFields(regFields.filter((_, idx) => idx !== i));
  }

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

      {/* Self-guided: single fixed price + access window (no participants/team/cancellation) */}
      {selfGuided && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">מחיר לרכישה (₪)</label>
            <input type="number" min="0" value={data.price} onChange={(e) => onChange("price", e.target.value)}
              placeholder="0 = חינם" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">חלון גישה (ימים)</label>
            <input type="number" min="1" value={data.accessWindowDays} onChange={(e) => onChange("accessWindowDays", e.target.value)}
              placeholder="30" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
          </div>
          <p className="col-span-2 text-[11px] text-gray-400">מחיר אחד קבוע לכל הרכישה — תשלום מיידי וסופי, ללא מדיניות ביטולים.</p>
        </div>
      )}

      {!selfGuided && (
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
      )}

      {!selfGuided && (
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
      )}

      {!selfGuided && (
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
      )}

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

      {/* Multi-person registration mode (not for self-guided) */}
      {!selfGuided && (
      <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
        <label className="text-xs font-medium text-gray-500">הרשמת מספר משתתפים</label>
        <div className="grid grid-cols-3 gap-2">
          {([["", "אדם בודד"], ["simple", "כמות בלבד"], ["detailed", "פרטים לכל אחד"]] as const).map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => onChange("multiPersonMode" as keyof WizardData, val as unknown as string)}
              className={`py-2 rounded-lg border text-xs transition-colors ${
                data.multiPersonMode === val ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-gray-200 text-gray-500"}`}>
              {lbl}
            </button>
          ))}
        </div>
        {data.multiPersonMode === "detailed" && <p className="text-[11px] text-gray-400">הנרשם ימלא שם ושדות דינמיים לכל משתתף</p>}
      </div>
      )}

      {/* Attribute tags */}
      <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
        <label className="text-xs font-medium text-gray-500">מאפייני הטיול (לסינון בחיפוש)</label>
        <div className="flex flex-wrap gap-1.5">
          {TRIP_TAGS.filter((t) => !t.selfGuidedOnly || data.tripType === "SELF_GUIDED").map((t) => {
            const on = (data.attributeTags || []).includes(t.value);
            return (
              <button key={t.value} type="button"
                onClick={() => {
                  const cur = data.attributeTags || [];
                  const next = on ? cur.filter((x) => x !== t.value) : [...cur, t.value];
                  onChange("attributeTags" as keyof WizardData, next as unknown as string);
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  on ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic registration fields (not for self-guided) */}
      {!selfGuided && (
      <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">שדות הרשמה מותאמים</label>
          <button
            type="button"
            onClick={addField}
            className="text-xs text-[#1A6B4A] font-medium border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors"
          >
            + הוסף שדה
          </button>
        </div>
        <p className="text-[11px] text-gray-400">שדות שהנרשם ימלא בעת ההרשמה (למשל: הצהרת בריאות, ניסיון קודם)</p>

        {regFields.map((f, i) => (
          <div key={f.id} className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={f.label}
                onChange={(e) => patchField(i, { label: e.target.value })}
                placeholder="שם השדה (למשל: הצהרת בריאות)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              />
              <button type="button" onClick={() => removeField(i)} className="text-xs text-red-400 hover:text-red-600 px-1">הסר</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={f.type}
                onChange={(e) => patchField(i, { type: e.target.value as RegFieldData["type"] })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A] bg-white"
              >
                <option value="text">טקסט חופשי</option>
                <option value="boolean">כן / לא</option>
                <option value="select">בחירה מרשימה</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={f.required} onChange={(e) => patchField(i, { required: e.target.checked })} />
                חובה
              </label>
            </div>
            {f.type === "select" && (
              <input
                type="text"
                value={f.options.join(", ")}
                onChange={(e) => patchField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="אפשרויות מופרדות בפסיק: מתחיל, בינוני, מתקדם"
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1A6B4A]"
              />
            )}
          </div>
        ))}
      </div>
      )}

      {/* Shared management: second guide + co-managers (not for self-guided) */}
      {!selfGuided && (
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
        <label className="text-xs font-medium text-gray-500">צוות הטיול (ניהול משותף)</label>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-400">מדריך שני (אופציונלי) — חפש משתמש רשום</label>
          <UserPicker guidesOnly max={1} placeholder="חפש מדריך לפי שם או אימייל..."
            selected={data.secondGuideEmail ? [data.secondGuideEmail] : []}
            onChange={(emails) => onChange("secondGuideEmail", emails[0] ?? "")} />
          {data.secondGuideEmail && (
            <div className="flex gap-2 mt-1">
              {([["SECONDARY", "משני"], ["EQUAL", "שווה (ללא הבחנה)"]] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => onChange("secondGuideRole", val)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs transition-colors ${
                    data.secondGuideRole === val ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-gray-200 text-gray-500"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-400">מנהלי טיול (גישה מלאה, עד 3) — חפש משתמשים עם תפקיד מנהל טיול</label>
          <UserPicker max={3} managersOnly placeholder="חפש מנהל טיול..."
            selected={data.managerEmails || []}
            onChange={(emails) => onChange("managerEmails" as keyof WizardData, emails as unknown as string)} />
          <p className="text-[11px] text-gray-400">מנהל טיול רואה ויכול לעשות הכל כמו המדריך, אך אינו מוצג כמדריך בטיול.</p>
        </div>
      </div>
      )}
    </div>
  );
}

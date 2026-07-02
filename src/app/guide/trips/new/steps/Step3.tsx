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

  const healthRef = useRef<HTMLInputElement>(null);
  const [uploadingHealth, setUploadingHealth] = useState(false);
  function uploadHealthPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { alert("יש להעלות קובץ PDF"); if (healthRef.current) healthRef.current.value = ""; return; }
    if (file.size > 4 * 1024 * 1024) { alert("הקובץ גדול מדי — עד 4MB"); if (healthRef.current) healthRef.current.value = ""; return; }
    // Inline data URL — works on serverless/read-only hosting; shows immediately.
    setUploadingHealth(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange("healthDeclarationUrl" as keyof WizardData, reader.result as string);
      setUploadingHealth(false);
      if (healthRef.current) healthRef.current.value = "";
    };
    reader.onerror = () => { setUploadingHealth(false); if (healthRef.current) healthRef.current.value = ""; };
    reader.readAsDataURL(file);
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-fg border-b border-border pb-3 mb-1">
        פרמטרים
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-fg-muted">רמת קושי</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => onChange("difficulty", d.value)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                data.difficulty === d.value
                  ? d.cls
                  : "border-border text-fg-muted hover:border-border"
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
            <label className="text-xs font-medium text-fg-muted">מחיר לרכישה (₪)</label>
            <input type="number" min="0" value={data.price} onChange={(e) => onChange("price", e.target.value)}
              placeholder="0 = חינם" className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-fg-muted">חלון גישה (ימים)</label>
            <input type="number" min="1" value={data.accessWindowDays} onChange={(e) => onChange("accessWindowDays", e.target.value)}
              placeholder="30" className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
          </div>
          <p className="col-span-2 text-[11px] text-fg-faint">מחיר אחד קבוע לכל הרכישה — תשלום מיידי וסופי, ללא מדיניות ביטולים.</p>
        </div>
      )}

      {!selfGuided && (
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">גיל מינימום</label>
          <input
            type="number"
            min="0"
            value={data.ageMin}
            onChange={(e) => onChange("ageMin", e.target.value)}
            placeholder="למשל: 8"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">גיל מקסימום</label>
          <input
            type="number"
            min="0"
            value={data.ageMax}
            onChange={(e) => onChange("ageMax", e.target.value)}
            placeholder="ללא הגבלה"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
      </div>
      )}

      {!selfGuided && (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-fg-muted">רמה גופנית נדרשת</label>
        <textarea
          value={data.fitnessLevel}
          onChange={(e) => onChange("fitnessLevel", e.target.value)}
          placeholder="למשל: הליכה של 5 שעות בשטח לא אחיד"
          rows={2}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
        />
      </div>
      )}

      {!selfGuided && (
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">מקסימום משתתפים</label>
          <input
            type="number"
            min="1"
            value={data.maxSpots}
            onChange={(e) => onChange("maxSpots", e.target.value)}
            placeholder="20"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">מינימום יציאה</label>
          <input
            type="number"
            min="1"
            value={data.minSpots}
            onChange={(e) => onChange("minSpots", e.target.value)}
            placeholder="5"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
      </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-fg-muted">ציוד נדרש</label>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-surface-2 border border-border rounded-lg min-h-[36px]">
            {selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-full text-xs"
              >
                {item}
                <button
                  type="button"
                  onClick={() => toggleEquipment(item)}
                  className="text-fg-faint hover:text-red-500 text-xs leading-none"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          {visibleEquipment.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleEquipment(item)}
              className={`w-full flex items-center justify-between px-3 py-2 border-b border-border text-sm last:border-b-0 hover:bg-surface-2 transition-colors ${
                selected.includes(item) ? "text-fg-faint" : "text-fg"
              }`}
            >
              <span>{item}</span>
              <span className={selected.includes(item) ? "text-fg-faint" : "text-[#1A6B4A]"}>
                {selected.includes(item) ? "✓" : "＋"}
              </span>
            </button>
          ))}
          {!showMoreEq && (
            <button
              type="button"
              onClick={() => setShowMoreEq(true)}
              className="w-full text-center text-[#1A6B4A] text-xs py-2 hover:bg-surface-2"
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
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
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
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="text-xs font-medium text-fg-muted">הרשמת מספר משתתפים</label>
        <div className="grid grid-cols-3 gap-2">
          {([["", "אדם בודד"], ["simple", "כמות בלבד"], ["detailed", "פרטים לכל משתתף"]] as const).map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => onChange("multiPersonMode" as keyof WizardData, val as unknown as string)}
              className={`py-2 rounded-lg border text-xs transition-colors ${
                data.multiPersonMode === val ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-border text-fg-muted"}`}>
              {lbl}
            </button>
          ))}
        </div>
        {data.multiPersonMode === "detailed" && <p className="text-[11px] text-fg-faint">הנרשם ימלא שם, גיל, מין, כושר וצרכים מיוחדים לכל משתתף (או יבחר משתמש קיים)</p>}
      </div>
      )}

      {/* Attribute tags */}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="text-xs font-medium text-fg-muted">מאפייני הטיול (לסינון בחיפוש)</label>
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
                  on ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]" : "border-border text-fg-muted"}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Health declaration (PDF) — hiker views it and signs a confirmation at registration */}
      {!selfGuided && (
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="text-xs font-medium text-fg-muted">הצהרת בריאות (PDF)</label>
        <p className="text-[11px] text-fg-faint">מסמך שהנרשם יצפה בו, יוכל להוריד, ויאשר בעת ההרשמה</p>
        {data.healthDeclarationUrl ? (
          <div className="bg-surface-2 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
            <span>📄</span>
            <a href={data.healthDeclarationUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-fg underline hover:text-[#1A6B4A]">צפה בהצהרת הבריאות</a>
            <button type="button" onClick={() => onChange("healthDeclarationUrl" as keyof WizardData, "")} className="text-fg-faint hover:text-red-400" aria-label="מחק">✕</button>
          </div>
        ) : (
          <button type="button" onClick={() => healthRef.current?.click()} disabled={uploadingHealth}
            className="text-xs text-[#1A6B4A] border border-dashed border-[#1A6B4A]/40 rounded-lg py-1.5 hover:bg-[#F0FAF5] disabled:opacity-60">
            {uploadingHealth ? "מעלה..." : "📄 העלה הצהרת בריאות (PDF)"}
          </button>
        )}
        <input ref={healthRef} type="file" accept="application/pdf" className="hidden" onChange={uploadHealthPdf} />
      </div>
      )}

      {/* Dynamic registration fields (not for self-guided) */}
      {!selfGuided && (
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fg-muted">שדות הרשמה מותאמים</label>
          <button
            type="button"
            onClick={addField}
            className="text-xs text-[#1A6B4A] font-medium border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors"
          >
            + הוסף שדה
          </button>
        </div>
        <p className="text-[11px] text-fg-faint">שדות שהנרשם ימלא בעת ההרשמה (למשל: הצהרת בריאות, ניסיון קודם)</p>

        {regFields.map((f, i) => (
          <div key={f.id} className="border border-border rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={f.label}
                onChange={(e) => patchField(i, { label: e.target.value })}
                placeholder="שם השדה (למשל: הצהרת בריאות)"
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              />
              <button type="button" onClick={() => removeField(i)} className="text-xs text-red-400 hover:text-red-600 px-1">הסר</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={f.type}
                onChange={(e) => patchField(i, { type: e.target.value as RegFieldData["type"] })}
                className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A] bg-surface"
              >
                <option value="text">טקסט חופשי</option>
                <option value="boolean">כן / לא</option>
                <option value="select">בחירה מרשימה</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-fg-muted">
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
                className="border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1A6B4A]"
              />
            )}
          </div>
        ))}
      </div>
      )}

      {/* Shared management: second guide + co-managers (not for self-guided) */}
      {!selfGuided && (
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <label className="text-xs font-medium text-fg-muted">צוות הטיול (ניהול משותף)</label>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-fg-faint">מדריך שני (אופציונלי) — חפש משתמש רשום</label>
          <UserPicker guidesOnly max={1} placeholder="חפש מדריך לפי שם או אימייל..."
            selected={data.secondGuideEmail ? [data.secondGuideEmail] : []}
            onChange={(emails) => onChange("secondGuideEmail", emails[0] ?? "")} />
          {data.secondGuideEmail && (
            <div className="flex gap-2 mt-1">
              {([["SECONDARY", "משני"], ["EQUAL", "שווה (ללא הבחנה)"]] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => onChange("secondGuideRole", val)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs transition-colors ${
                    data.secondGuideRole === val ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-border text-fg-muted"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-fg-faint">מנהלי טיול (גישה מלאה, עד 3) — חפש משתמשים עם תפקיד מנהל טיול</label>
          <UserPicker max={3} managersOnly placeholder="חפש מנהל טיול..."
            selected={data.managerEmails || []}
            onChange={(emails) => onChange("managerEmails" as keyof WizardData, emails as unknown as string)} />
          <p className="text-[11px] text-fg-faint">מנהל טיול רואה ויכול לעשות הכל כמו המדריך, אך אינו מוצג כמדריך בטיול.</p>
        </div>
      </div>
      )}
    </div>
  );
}

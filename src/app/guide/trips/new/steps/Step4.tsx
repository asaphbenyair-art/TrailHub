"use client";

import { WizardData } from "../types";

const REFUND_OPTIONS = ["100%", "75%", "50%", "25%", "0%"];

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string) => void;
}

export default function Step4({ data, onChange }: Props) {
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-3 mb-1">
        תשלום וביטולים
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">מחיר לאדם (₪)</label>
        <input
          type="number"
          min="0"
          value={data.price}
          onChange={(e) => onChange("price", e.target.value)}
          placeholder="0 = חינם"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
          dir="ltr"
        />
        <p className="text-xs text-gray-400 mt-1">עמלת הפלטפורמה תנוכה אוטומטית</p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-gray-500">
          מדיניות ביטולים — מדרגות החזר
        </label>
        <p className="text-xs text-gray-400">הגדר עד 3 מדרגות</p>

        {/* Tier 1 */}
        <div className="flex items-center gap-2 flex-wrap border border-gray-100 rounded-lg p-3">
          <span className="text-gray-500 text-xs">עד</span>
          <input
            type="number"
            value={data.cancelTier1Hours}
            onChange={(e) => onChange("cancelTier1Hours", e.target.value)}
            className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
          <span className="text-gray-500 text-xs">שעות לפני — החזר</span>
          <select
            value={data.cancelTier1Refund}
            onChange={(e) => onChange("cancelTier1Refund", e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white"
          >
            {REFUND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Tier 2 */}
        <div className="flex items-center gap-2 flex-wrap border border-gray-100 rounded-lg p-3">
          <span className="text-gray-500 text-xs">עד</span>
          <input
            type="number"
            value={data.cancelTier2Hours}
            onChange={(e) => onChange("cancelTier2Hours", e.target.value)}
            className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
          <span className="text-gray-500 text-xs">שעות לפני — החזר</span>
          <select
            value={data.cancelTier2Refund}
            onChange={(e) => onChange("cancelTier2Refund", e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white"
          >
            {REFUND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Tier 3 — fixed: less than tier2 */}
        <div className="flex items-center gap-2 flex-wrap border border-gray-100 rounded-lg p-3">
          <span className="text-gray-500 text-xs">פחות מ-{data.cancelTier2Hours || 24} שעות — החזר</span>
          <select
            value={data.cancelTier3Refund}
            onChange={(e) => onChange("cancelTier3Refund", e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white"
          >
            {REFUND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

"use client";

import { WizardData, PriceTier, CouponData } from "../types";
import { useLabels } from "@/components/useLabels";

const REFUND_OPTIONS = ["100%", "75%", "50%", "25%", "0%"];

const PRICE_TIER_PRESETS = ["ילדים", "סטודנטים", "חיילים", "גמלאים", "בעלי מוגבלות"];

// English display labels for the preset chips. The stored value stays Hebrew
// (used for logic and saved data) — only the on-screen label translates.
const PRICE_TIER_PRESET_EN: Record<string, string> = {
  "ילדים": "Children",
  "סטודנטים": "Students",
  "חיילים": "Soldiers",
  "גמלאים": "Seniors",
  "בעלי מוגבלות": "People with disabilities",
};

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string | PriceTier[] | CouponData[]) => void;
}

export default function Step4({ data, onChange }: Props) {
  const { en } = useLabels();

  function addPriceTier() {
    onChange("priceTiers", [...data.priceTiers, { label: "", price: "" }]);
  }

  function updatePriceTier(idx: number, field: keyof PriceTier, value: string) {
    const next = data.priceTiers.map((t, i) => i === idx ? { ...t, [field]: value } : t);
    onChange("priceTiers", next);
  }

  function removePriceTier(idx: number) {
    onChange("priceTiers", data.priceTiers.filter((_, i) => i !== idx));
  }

  function addCoupon() {
    onChange("coupons", [...data.coupons, { code: "", discountPct: "10", maxUses: "", expiresAt: "" }]);
  }

  function updateCoupon(idx: number, field: keyof CouponData, value: string) {
    const next = data.coupons.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    onChange("coupons", next);
  }

  function removeCoupon(idx: number) {
    onChange("coupons", data.coupons.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-fg border-b border-border pb-3 mb-1">
        {en ? "Payment & cancellation" : "תשלום וביטולים"}
      </div>

      {/* Base price */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-fg-muted">
          {data.tripType !== "DAY_HIKE"
            ? (en ? "Price for full journey (₪)" : "מחיר למסע שלם (₪)")
            : (en ? "Standard price per person (₪)" : "מחיר רגיל לאדם (₪)")}
        </label>
        <input
          type="number"
          min="0"
          value={data.price}
          onChange={(e) => onChange("price", e.target.value)}
          placeholder={en ? "0 = free" : "0 = חינם"}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
          dir="ltr"
        />
        <p className="text-xs text-fg-faint mt-1">
          {en ? "The platform fee is deducted automatically" : "עמלת הפלטפורמה תנוכה אוטומטית"}
        </p>
      </div>

      {/* Per-day price for journeys with individual-day registration */}
      {data.registrationMode === "INDIVIDUAL_DAYS" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">
            {en ? "Price per single day (₪)" : "מחיר ליום בודד (₪)"}
          </label>
          <input
            type="number"
            min="0"
            value={data.individualDayPrice}
            onChange={(e) => onChange("individualDayPrice", e.target.value)}
            placeholder={en ? "Price for registering for one day" : "מחיר להרשמה ליום אחד"}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
          <p className="text-xs text-fg-faint mt-1">
            {en ? "Since you allowed registration for individual days" : "מאחר שאיפשרת הרשמה לימים בודדים"}
          </p>
        </div>
      )}

      {/* Price tiers for special groups */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fg-muted">
            {en ? "Reduced prices for groups" : "מחירים מופחתים לקבוצות"}
          </label>
          <button
            type="button"
            onClick={addPriceTier}
            className="text-xs text-[#1A6B4A] font-medium border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors"
          >
            {en ? "+ Add price" : "+ הוסף מחיר"}
          </button>
        </div>

        {data.priceTiers.length === 0 && (
          <p className="text-xs text-fg-faint">
            {en ? "Tap to add a reduced price (children, students, soldiers...)" : "לחץ להוספת מחיר מופחת (ילדים, סטודנטים, חיילים...)"}
          </p>
        )}

        {/* Preset chips — stay visible after selecting, so multiple groups can be
            added; already-added presets are hidden. */}
        {PRICE_TIER_PRESETS.some((label) => !data.priceTiers.some((t) => t.label === label)) && (
          <div className="flex flex-wrap gap-1">
            {PRICE_TIER_PRESETS.filter((label) => !data.priceTiers.some((t) => t.label === label)).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onChange("priceTiers", [...data.priceTiers, { label, price: "" }])}
                className="text-xs border border-border rounded-full px-2.5 py-1 text-fg-muted hover:border-[#1A6B4A] hover:text-[#1A6B4A] transition-colors"
              >
                + {en ? (PRICE_TIER_PRESET_EN[label] ?? label) : label}
              </button>
            ))}
          </div>
        )}

        {data.priceTiers.map((tier, idx) => (
          <div key={idx} className="flex items-center gap-2 border border-border rounded-xl p-3">
            <input
              type="text"
              placeholder={en ? "Group name (e.g. Children)" : "שם קבוצה (למשל: ילדים)"}
              value={tier.label}
              onChange={(e) => updatePriceTier(idx, "label", e.target.value)}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="₪"
                value={tier.price}
                min="0"
                onChange={(e) => updatePriceTier(idx, "price", e.target.value)}
                className="w-20 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                dir="ltr"
              />
              <span className="text-xs text-fg-faint">₪</span>
            </div>
            <button
              type="button"
              onClick={() => removePriceTier(idx)}
              className="text-fg-faint hover:text-red-400 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Coupon codes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fg-muted">{en ? "Coupon codes" : "קודי קופון"}</label>
          <button
            type="button"
            onClick={addCoupon}
            className="text-xs text-[#1A6B4A] font-medium border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors"
          >
            {en ? "+ Add coupon" : "+ הוסף קופון"}
          </button>
        </div>

        {data.coupons.length === 0 && (
          <p className="text-xs text-fg-faint">
            {en ? "Add a coupon code for a percentage discount" : "הוסף קוד קופון להנחה באחוזים"}
          </p>
        )}

        {data.coupons.map((coupon, idx) => (
          <div key={idx} className="border border-border rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-fg-muted">
                {en ? `Coupon ${idx + 1}` : `קופון ${idx + 1}`}
              </span>
              <button
                type="button"
                onClick={() => removeCoupon(idx)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                {en ? "Remove" : "הסר"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-fg-faint">{en ? "Code" : "קוד"}</label>
                <input
                  type="text"
                  placeholder="SAVE20"
                  value={coupon.code}
                  onChange={(e) => updateCoupon(idx, "code", e.target.value.toUpperCase())}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] font-mono"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-fg-faint">{en ? "Discount (%)" : "הנחה (%)"}</label>
                <input
                  type="number"
                  placeholder="10"
                  min="1"
                  max="100"
                  value={coupon.discountPct}
                  onChange={(e) => updateCoupon(idx, "discountPct", e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-fg-faint">{en ? "Max uses" : "שימושים מקסימום"}</label>
                <input
                  type="number"
                  placeholder={en ? "Unlimited" : "ללא הגבלה"}
                  min="1"
                  value={coupon.maxUses}
                  onChange={(e) => updateCoupon(idx, "maxUses", e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-fg-faint">{en ? "Expiry" : "תפוגה"}</label>
                <input
                  type="date"
                  value={coupon.expiresAt}
                  onChange={(e) => updateCoupon(idx, "expiresAt", e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cancellation policy */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-fg-muted">
          {en ? "Cancellation policy — refund tiers" : "מדיניות ביטולים — מדרגות החזר"}
        </label>
        <p className="text-xs text-fg-faint">{en ? "Define up to 3 tiers" : "הגדר עד 3 מדרגות"}</p>

        <div className="flex items-center gap-2 flex-wrap border border-border rounded-lg p-3">
          <span className="text-fg-muted text-xs">{en ? "Up to" : "עד"}</span>
          <input
            type="number"
            value={data.cancelTier1Hours}
            onChange={(e) => onChange("cancelTier1Hours", e.target.value)}
            className="w-14 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
          <span className="text-fg-muted text-xs">{en ? "hours before — refund" : "שעות לפני — החזר"}</span>
          <select
            value={data.cancelTier1Refund}
            onChange={(e) => onChange("cancelTier1Refund", e.target.value)}
            className="border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A] bg-surface"
          >
            {REFUND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap border border-border rounded-lg p-3">
          <span className="text-fg-muted text-xs">{en ? "Up to" : "עד"}</span>
          <input
            type="number"
            value={data.cancelTier2Hours}
            onChange={(e) => onChange("cancelTier2Hours", e.target.value)}
            className="w-14 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
          <span className="text-fg-muted text-xs">{en ? "hours before — refund" : "שעות לפני — החזר"}</span>
          <select
            value={data.cancelTier2Refund}
            onChange={(e) => onChange("cancelTier2Refund", e.target.value)}
            className="border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A] bg-surface"
          >
            {REFUND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap border border-border rounded-lg p-3">
          <span className="text-fg-muted text-xs">
            {en
              ? `Less than ${data.cancelTier2Hours || 24} hours — refund`
              : `פחות מ-${data.cancelTier2Hours || 24} שעות — החזר`}
          </span>
          <select
            value={data.cancelTier3Refund}
            onChange={(e) => onChange("cancelTier3Refund", e.target.value)}
            className="border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A] bg-surface"
          >
            {REFUND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Step1 from "./steps/Step1";
import Step2 from "./steps/Step2";
import Step3 from "./steps/Step3";
import Step4 from "./steps/Step4";
import Step5 from "./steps/Step5";
import { WizardData, DEFAULT_WIZARD_DATA, TripDayData, PriceTier, CouponData, WaypointData, SourceMaterial } from "./types";

const STEPS = [
  { label: "פרטים" },
  { label: "מסלול" },
  { label: "פרמטרים" },
  { label: "תשלום" },
  { label: "פרסום" },
];

function validateStep(step: number, data: WizardData): string | null {
  if (step === 1) {
    if (!data.title.trim()) return "נא להזין שם טיול";
    if (data.tripType !== "SELF_GUIDED" && !data.date) return "נא לבחור תאריך";
    if (!data.region) return "נא לבחור איזור";
  }
  if (step === 4) {
    if (!data.price && data.price !== "0") return "נא להזין מחיר (0 לחינם)";
  }
  return null;
}

export default function NewTripWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function onChange(field: keyof WizardData, value: string | string[] | TripDayData[] | PriceTier[] | CouponData[] | WaypointData[] | SourceMaterial[]) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function goNext() {
    const err = validateStep(step, data);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, 5));
  }

  function goPrev() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  function goTo(n: number) {
    if (n < step) { setError(""); setStep(n); }
  }

  async function resolveImageUrl(url: string): Promise<string> {
    if (!url) return "";
    if (url.startsWith("/") || url.startsWith("http")) return url;
    if (!url.startsWith("blob:")) return "";
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "upload.jpg", { type: blob.type || "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: form });
      if (!up.ok) return "";
      const { url: serverUrl } = await up.json();
      return serverUrl as string;
    } catch {
      return "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const cancellationPolicy = [
      `עד ${data.cancelTier1Hours} שעות לפני — החזר ${data.cancelTier1Refund}`,
      `עד ${data.cancelTier2Hours} שעות לפני — החזר ${data.cancelTier2Refund}`,
      `פחות מ-${data.cancelTier2Hours} שעות — החזר ${data.cancelTier3Refund}`,
    ].join("\n");

    const allEquipment = [
      ...data.equipmentList,
      ...(data.whatToBring ? [data.whatToBring] : []),
    ].join(", ");

    // Resolve any remaining blob URLs to server URLs
    const rawUrls = [data.mainImagePreview, ...data.extraImagePreviews].filter(Boolean);
    const images = (await Promise.all(rawUrls.map(resolveImageUrl))).filter(Boolean);

    const isSelfGuided = data.tripType === "SELF_GUIDED";
    const body = {
      title: data.title,
      description: data.description,
      region: data.region,
      date: new Date(data.date || Date.now()).toISOString(),
      unlimitedCapacity: isSelfGuided,
      accessWindowDays: isSelfGuided ? (data.accessWindowDays || "30") : null,
      attributeTags: data.attributeTags || [],
      sourceMaterials: data.sourceMaterials.length > 0 ? data.sourceMaterials : null,
      sourceMaterialsVisibility: data.sourceMaterialsVisibility || "preview",
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      startTime: data.startTime,
      meetingPoint: data.meetingPoint,
      waypoints: data.waypoints || null,
      difficulty: data.difficulty === "PREVIEW" ? "MEDIUM" : data.difficulty,
      maxSpots: data.maxSpots || "20",
      price: data.price || "0",
      distanceKm: data.distanceKm || "0",
      durationMin: String(Math.round((parseFloat(data.durationHours) || 0) * 60)),
      whatToBring: allEquipment || null,
      cancellationPolicy,
      status: data.status === "PREVIEW" ? "DRAFT" : data.status,
      visibility: data.visibility || "PUBLIC",
      images,
      tripType: data.tripType || "DAY_HIKE",
      registrationMode: data.registrationMode || "FULL_ONLY",
      routeGpx: data.routeGpx || null,
      waypointsJson: data.waypointsJson.length > 0 ? data.waypointsJson : null,
      individualDayPrice: data.individualDayPrice || null,
      priceTiers: data.priceTiers.length > 0 ? data.priceTiers : null,
      tripDays: data.tripDays,
      coupons: data.coupons,
      registrationFields: data.registrationFields.filter((f) => f.label.trim()),
      routeType: data.routeType || null,
      minAge: data.ageMin || null,
      maxAge: data.ageMax || null,
      fitnessLevel: data.fitnessLevel || null,
      minSpots: data.minSpots || null,
      secondGuideEmail: data.secondGuideEmail || null,
      secondGuideRole: data.secondGuideRole || "SECONDARY",
      managerEmails: data.managerEmails || [],
    };

    const res = await fetch("/api/guide/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      let msg = "שגיאה בשמירה";
      try { const d = await res.json(); msg = d.error ?? msg; } catch {}
      setError(msg);
      return;
    }

    router.push("/guide/dashboard");
  }

  return (
    <div className="min-h-screen p-4 flex items-start justify-center">
      <div className="w-full max-w-[480px]">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-gray-900">יצירת טיול חדש</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Step tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const isDone = n < step;
              const isActive = n === step;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => goTo(n)}
                  className={`flex-1 py-3 flex flex-col items-center gap-1 border-b-2 transition-colors ${
                    isActive
                      ? "border-[#1A6B4A] bg-white"
                      : "border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div
                    className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium ${
                      isDone
                        ? "bg-[#D6EDE3] text-[#1A6B4A]"
                        : isActive
                        ? "bg-[#1A6B4A] text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isDone ? "✓" : n}
                  </div>
                  <span
                    className={`text-[10px] ${
                      isActive ? "text-[#1A6B4A] font-medium" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Step content */}
          {step === 1 && <Step1 data={data} onChange={onChange} />}
          {step === 2 && <Step2 data={data} onChange={onChange} />}
          {step === 3 && <Step3 data={data} onChange={onChange} />}
          {step === 4 && <Step4 data={data} onChange={onChange} />}
          {step === 5 && <Step5 data={data} onChange={onChange} />}

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={goPrev}
              className={`px-4 py-2 text-xs border border-gray-200 rounded-full text-gray-500 hover:bg-gray-100 transition-colors ${
                step === 1 ? "invisible" : ""
              }`}
            >
              חזור
            </button>

            <div className="flex flex-col items-center gap-1">
              {error && (
                <span className="text-xs text-red-500">{error}</span>
              )}
              <span className="text-xs text-gray-400">שלב {step} מתוך 5</span>
            </div>

            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                className="px-5 py-2 text-xs bg-[#1A6B4A] text-white rounded-full font-medium hover:bg-[#155a3e] transition-colors"
              >
                המשך
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-xs bg-[#1A6B4A] text-white rounded-full font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60"
              >
                {saving ? "שומר..." : "שמור"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Step1 from "../../new/steps/Step1";
import Step2 from "../../new/steps/Step2";
import Step3 from "../../new/steps/Step3";
import Step4 from "../../new/steps/Step4";
import Step5 from "../../new/steps/Step5";
import { WizardData, DEFAULT_WIZARD_DATA } from "../../new/types";

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
    if (!data.date) return "נא לבחור תאריך";
    if (!data.region) return "נא לבחור איזור";
  }
  if (step === 4) {
    if (!data.price && data.price !== "0") return "נא להזין מחיר (0 לחינם)";
  }
  return null;
}

function tripToWizard(trip: Record<string, unknown>): WizardData {
  const images = (trip.images as string[]) ?? [];
  const durationMin = Number(trip.durationMin ?? 0);
  return {
    title: String(trip.title ?? ""),
    description: String(trip.description ?? ""),
    date: trip.date ? new Date(trip.date as string).toISOString().slice(0, 10) : "",
    startTime: String(trip.startTime ?? "07:00"),
    region: String(trip.region ?? ""),
    meetingPoint: String(trip.meetingPoint ?? ""),
    mainImagePreview: images[0] ?? "",
    extraImagePreviews: images.slice(1),
    routeType: "one-way",
    distanceKm: String(trip.distanceKm ?? ""),
    durationHours: durationMin > 0 ? String(durationMin / 60) : "",
    waypoints: "",
    difficulty: String(trip.difficulty ?? "MEDIUM"),
    ageMin: "",
    ageMax: "",
    fitnessLevel: "",
    maxSpots: String(trip.maxSpots ?? "20"),
    minSpots: "",
    equipmentList: trip.whatToBring
      ? String(trip.whatToBring).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    whatToBring: "",
    price: String(trip.price ?? ""),
    cancelTier1Hours: "72",
    cancelTier1Refund: "100%",
    cancelTier2Hours: "24",
    cancelTier2Refund: "50%",
    cancelTier3Refund: "0%",
    status: String(trip.status ?? "DRAFT"),
  };
}

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then((r) => r.json())
      .then((trip) => {
        if (trip.error) { router.replace("/guide/dashboard"); return; }
        setData(tripToWizard(trip));
        setLoading(false);
      })
      .catch(() => router.replace("/guide/dashboard"));
  }, [id, router]);

  function onChange(field: keyof WizardData, value: string | string[]) {
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

  // In edit mode, allow jumping to any step freely
  function goTo(n: number) {
    setError("");
    setStep(n);
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

    const images = [
      data.mainImagePreview,
      ...data.extraImagePreviews,
    ].filter((u) => u && (u.startsWith("/") || u.startsWith("http")));

    const body = {
      title: data.title,
      description: data.description,
      region: data.region,
      date: new Date(data.date).toISOString(),
      startTime: data.startTime,
      meetingPoint: data.meetingPoint,
      difficulty: data.difficulty,
      maxSpots: data.maxSpots || "20",
      price: data.price || "0",
      distanceKm: data.distanceKm || "0",
      durationMin: String(Math.round((parseFloat(data.durationHours) || 0) * 60)),
      whatToBring: allEquipment || null,
      cancellationPolicy,
      status: data.status === "PREVIEW" ? "DRAFT" : data.status,
      images,
    };

    const res = await fetch(`/api/guide/trips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "שגיאה בשמירה");
      return;
    }

    router.push("/guide/dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        טוען...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-start justify-center">
      <div className="w-full max-w-[480px]">
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">
            ← חזרה
          </button>
          <h1 className="text-lg font-semibold text-gray-900">עריכת טיול</h1>
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
                  className={`flex-1 py-3 flex flex-col items-center gap-1 border-b-2 transition-colors cursor-pointer ${
                    isActive ? "border-[#1A6B4A] bg-white" : "border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div
                    className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium ${
                      isDone ? "bg-[#D6EDE3] text-[#1A6B4A]" : isActive ? "bg-[#1A6B4A] text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isDone ? "✓" : n}
                  </div>
                  <span className={`text-[10px] ${isActive ? "text-[#1A6B4A] font-medium" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {step === 1 && <Step1 data={data} onChange={onChange} />}
          {step === 2 && <Step2 data={data} onChange={onChange} />}
          {step === 3 && <Step3 data={data} onChange={onChange} />}
          {step === 4 && <Step4 data={data} onChange={onChange} />}
          {step === 5 && <Step5 data={data} onChange={onChange} />}

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
              {error && <span className="text-xs text-red-500">{error}</span>}
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
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

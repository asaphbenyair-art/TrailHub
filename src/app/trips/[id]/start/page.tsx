"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Waypoint { lat?: number; lng?: number; name?: string; description?: string; navInstructions?: string; guidance?: string; safety?: string }
interface Trip {
  id: string; title: string; description: string | null; whatToBring: string | null;
  waypointsJson: Waypoint[] | null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "he-IL";
  window.speechSynthesis.speak(u);
}

export default function SelfGuidedStartPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trips/${id}/purchase`).then((r) => r.json()).then((p) => {
      setAllowed(p.purchased && !p.expired);
    }).catch(() => setAllowed(false));
    fetch(`/api/trips/${id}`).then((r) => r.json()).then((t) => { if (!t.error) setTrip(t); }).finally(() => setLoading(false));
  }, [id]);

  if (loading || allowed === null) return <div dir="rtl" className="min-h-screen flex items-center justify-center text-gray-400 text-sm">טוען...</div>;
  if (!allowed) return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
      אין לך גישה לתוכן זה
      <button type="button" onClick={() => router.push(`/trips/${id}`)} className="text-[#1A6B4A] underline">חזרה לדף הטיול</button>
    </div>
  );
  if (!trip) return null;

  const waypoints = trip.waypointsJson ?? [];

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5] py-4 px-3">
      <div className="max-w-[480px] mx-auto pb-10">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => router.push(`/trips/${id}`)} className="text-gray-400 hover:text-gray-600 text-sm">← חזרה</button>
          <h1 className="text-sm font-semibold text-gray-900">טיול עצמאי — {trip.title}</h1>
        </div>

        <div className="bg-[#EEF5FC] border border-[#185FA5]/20 rounded-2xl p-3 mb-3 text-xs text-[#185FA5]">
          📍 ניווט בזמן אמת (נקודה כחולה) זמין במהלך ההליכה. כל תחנה כוללת הנחיות והסבר עם אפשרות הקראה.
        </div>

        {trip.description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-900">📄 על הטיול</span>
              <button type="button" onClick={() => speak(trip.description ?? "")} className="text-xs text-[#1A6B4A]">🔊 הקרא</button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{trip.description}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {waypoints.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">אין תחנות מוגדרות</div>}
          {waypoints.map((wp, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#D6EDE3] text-[#1A6B4A] flex items-center justify-center text-xs font-semibold">{i + 1}</div>
                <span className="text-sm font-medium text-gray-900 flex-1">{wp.name || `תחנה ${i + 1}`}</span>
                <button type="button" onClick={() => speak([wp.guidance, wp.navInstructions, wp.description].filter(Boolean).join(". "))}
                  className="text-xs text-[#1A6B4A] border border-[#1A6B4A]/30 rounded-full px-2.5 py-1">🔊 הקרא</button>
              </div>
              {wp.navInstructions && (
                <div className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mb-1.5">🧭 {wp.navInstructions}</div>
              )}
              {wp.guidance && <p className="text-sm text-gray-600 leading-relaxed mb-1.5">{wp.guidance}</p>}
              {wp.description && !wp.guidance && <p className="text-sm text-gray-600 leading-relaxed mb-1.5">{wp.description}</p>}
              {wp.safety && (
                <div className="text-xs text-[#7A5010] bg-[#FDF3DC] rounded-lg px-3 py-2">⚠ {wp.safety}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const TripDetailMap = dynamic(() => import("@/components/TripDetailMap"), { ssr: false });

interface SourceMaterial { type: "pdf" | "link"; url: string; title: string }
interface Waypoint { lat?: number; lng?: number; name?: string; description?: string; navInstructions?: string; guidance?: string; safety?: string; sources?: SourceMaterial[] }
interface Trip {
  id: string; title: string; description: string | null; whatToBring: string | null; region: string;
  waypointsJson: Waypoint[] | null;
  sourceMaterials: SourceMaterial[] | null;
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
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [shareEmails, setShareEmails] = useState<string[]>(["", "", ""]);
  const [shareMsg, setShareMsg] = useState("");

  const cacheKey = `trailhub_offline_${id}`;

  async function saveShare() {
    const emails = shareEmails.map((e) => e.trim()).filter(Boolean);
    const res = await fetch(`/api/trips/${id}/purchase`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedWith: emails }),
    });
    setShareMsg(res.ok ? "השיתוף נשמר" : "שגיאה");
  }

  useEffect(() => {
    const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
    setOfflineSaved(!!cached);

    Promise.all([
      fetch(`/api/trips/${id}/purchase`).then((r) => r.json()),
      fetch(`/api/trips/${id}`).then((r) => r.json()),
    ]).then(([p, t]) => {
      setAllowed(p.purchased && !p.expired);
      setIsOwner(!!p.owner);
      if (Array.isArray(p.sharedWith)) setShareEmails([p.sharedWith[0] ?? "", p.sharedWith[1] ?? "", p.sharedWith[2] ?? ""]);
      if (!t.error) setTrip(t);
      setLoading(false);
    }).catch(() => {
      // Offline / network error — fall back to cached content if available
      if (cached) { setTrip(JSON.parse(cached)); setAllowed(true); setOfflineMode(true); }
      else setAllowed(false);
      setLoading(false);
    });
  }, [id, cacheKey]);

  function downloadOffline() {
    if (!trip) return;
    try { localStorage.setItem(cacheKey, JSON.stringify(trip)); setOfflineSaved(true); } catch { /* quota */ }
  }
  function removeOffline() {
    try { localStorage.removeItem(cacheKey); setOfflineSaved(false); } catch { /* noop */ }
  }

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
          <h1 className="text-sm font-semibold text-gray-900 flex-1 truncate">טיול עצמאי — {trip.title}</h1>
          {offlineSaved ? (
            <button type="button" onClick={removeOffline} className="text-[11px] text-[#0F5038] border border-[#1A6B4A]/30 rounded-full px-2.5 py-1 shrink-0">✓ זמין לא מקוון</button>
          ) : (
            <button type="button" onClick={downloadOffline} className="text-[11px] text-[#185FA5] border border-[#185FA5]/30 rounded-full px-2.5 py-1 shrink-0">📥 הורד לא מקוון</button>
          )}
        </div>
        {offlineMode && (
          <div className="bg-[#FDF3DC] border border-[#E8A020]/40 rounded-xl px-3 py-2 mb-3 text-[11px] text-[#7A5010]">
            ⚠ מצב לא מקוון — מוצג תוכן שמור (ייתכן שאינו מעודכן). המפה והניווט החי דורשים חיבור.
          </div>
        )}

        <div className="bg-[#EEF5FC] border border-[#185FA5]/20 rounded-2xl p-3 mb-3 text-xs text-[#185FA5]">
          📍 הנקודה הכחולה במפה מציגה את מיקומך בזמן אמת. כל תחנה כוללת הנחיות והסבר עם אפשרות הקראה.
        </div>

        {/* Live map with blue dot */}
        <div className="mb-3">
          <TripDetailMap
            region={trip.region}
            waypoints={waypoints.filter((w) => w.lat != null && w.lng != null).map((w, i) => ({ lat: w.lat!, lng: w.lng!, label: w.name || `תחנה ${i + 1}` }))}
            height={220}
            liveLocation
          />
        </div>

        {/* Share access (owner only, up to 3 people) */}
        {isOwner && !offlineMode && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            <div className="text-sm font-semibold text-gray-900 mb-1">שתף גישה (עד 3 אנשים)</div>
            <div className="text-[11px] text-gray-400 mb-2">בני משפחה שתשתף יוכלו לגשת לתוכן עם המייל שלהם</div>
            <div className="flex flex-col gap-1.5">
              {shareEmails.map((e, i) => (
                <input key={i} type="email" value={e} dir="ltr"
                  onChange={(ev) => setShareEmails((prev) => prev.map((x, j) => j === i ? ev.target.value : x))}
                  placeholder={`אימייל ${i + 1}`}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={saveShare} className="px-4 py-1.5 bg-[#1A6B4A] text-white rounded-full text-xs font-medium">שמור שיתוף</button>
              {shareMsg && <span className="text-[11px] text-[#0F5038]">{shareMsg}</span>}
            </div>
          </div>
        )}

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
              {Array.isArray(wp.sources) && wp.sources.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {wp.sources.map((m, j) => (
                    <a key={j} href={m.url} target="_blank" rel="noreferrer" className="text-xs text-[#185FA5] hover:underline">{m.type === "pdf" ? "📄" : "🔗"} {m.title}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

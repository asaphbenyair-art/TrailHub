"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import ElevationChart, { parseTrack } from "@/components/ElevationChart";

const TripDetailMap = dynamic(() => import("@/components/TripDetailMap"), { ssr: false });

interface SourceMaterial { type: "pdf" | "link"; url: string; title: string; description?: string }
interface Waypoint { lat?: number; lng?: number; name?: string; description?: string; navInstructions?: string; guidance?: string; safety?: string; sources?: SourceMaterial[]; audioUrl?: string; audioName?: string; audioDuration?: number }
interface Trip {
  id: string; title: string; description: string | null; whatToBring: string | null; region: string;
  waypointsJson: Waypoint[] | null;
  sourceMaterials: SourceMaterial[] | null;
  routeGpx?: string | null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "he-IL";
  window.speechSynthesis.speak(u);
}

function fmtTime(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Distance in metres between two [lat,lng] points.
function distM(a: [number, number], b: [number, number]): number {
  const R = 6371000, dLat = ((b[0] - a[0]) * Math.PI) / 180, dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const wazeUrl = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
const ARRIVE_M = 20; // proximity threshold for start + waypoint detection
const DEPART_M = 50; // moving this far from a reached waypoint = departed → next

// Inline guidance-audio player: play/pause + seekable progress bar.
function WaypointAudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); } else { a.pause(); }
  }
  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = ref.current; if (!a || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // RTL-aware: bar fills right-to-left
    const ratio = (rect.right - e.clientX) / rect.width;
    a.currentTime = Math.min(Math.max(ratio, 0), 1) * dur;
  }
  const pct = dur ? (cur / dur) * 100 : 0;
  return (
    <div className="flex items-center gap-2 bg-[#D6EDE3] rounded-full pl-3 pr-1.5 py-1.5 shrink-0" style={{ minWidth: 150 }}>
      <button type="button" onClick={toggle} aria-label={playing ? "השהה" : "נגן"}
        className="w-6 h-6 rounded-full bg-[#1A6B4A] text-white flex items-center justify-center text-[11px] shrink-0">
        {playing ? "⏸" : "▶"}
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-[#1A6B4A]/20 cursor-pointer relative" onClick={seek}>
        <div className="absolute top-0 right-0 h-full rounded-full bg-[#1A6B4A]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[#0F5038] tabular-nums shrink-0">{fmtTime(cur)}/{fmtTime(dur)}</span>
      <audio ref={ref} src={src} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)} />
    </div>
  );
}

export default function SelfGuidedStartPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to return on exit — set by the entry point (?from=). Never the trip
  // page itself, so exiting fully leaves the trip context (no redirect loop).
  const exitHref = searchParams.get("from") === "search" ? "/trips" : "/my-trips";
  const [trip, setTrip] = useState<Trip | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [shareEmails, setShareEmails] = useState<string[]>(["", "", ""]);
  const [shareMsg, setShareMsg] = useState("");
  const [focusWp, setFocusWp] = useState<number | null>(null);
  const [hoverCoord, setHoverCoord] = useState<[number, number] | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  // ── Active navigation flow ──
  const [navMode, setNavMode] = useState<"preview" | "navigating" | "done">("preview");
  const [navReverse, setNavReverse] = useState(false);
  const [step, setStep] = useState(0);                 // index into the ordered waypoint sequence
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [pendingArrival, setPendingArrival] = useState(false); // within 20m of the current target, awaiting "הגעתי"
  const [arrived, setArrived] = useState(false);       // arrival effects fired; content auto-opened for this step
  const [departed, setDeparted] = useState(false);     // "יצאתי לדרך" pressed → auto-advance once 50m away
  const [startPrompt, setStartPrompt] = useState<null | { atStart: boolean; atEnd: boolean; dStart: number; dEnd: number; nearestStep: number }>(null);
  const [locating, setLocating] = useState(false);
  const stepRef = useRef(0);
  const arrivedRef = useRef(false);
  const departedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const arrivalAudioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { arrivedRef.current = arrived; }, [arrived]);
  useEffect(() => { departedRef.current = departed; }, [departed]);

  const cacheKey = `trailhub_offline_${id}`;

  // Ordered waypoint coordinates (respecting reverse direction).
  const navPts: [number, number][] = (trip?.waypointsJson ?? [])
    .filter((w) => w.lat != null && w.lng != null)
    .map((w) => [w.lat as number, w.lng as number]);
  const orderedPts = navReverse ? [...navPts].reverse() : navPts;

  // A short arrival chime via the Web Audio context (unlocked on nav start).
  function playChime() {
    try {
      const ctx = audioCtxRef.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [660, 880].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.18);
      });
    } catch {}
  }

  // Fire the arrival experience once per waypoint: vibrate + chime + auto-play
  // the guide's audio (or TTS the guidance text as a fallback).
  function fireArrival(wp: Waypoint | undefined) {
    try { navigator.vibrate?.([200, 100, 200]); } catch {}
    playChime();
    if (wp?.audioUrl && arrivalAudioRef.current) {
      const a = arrivalAudioRef.current;
      a.src = wp.audioUrl;
      setTimeout(() => a.play().catch(() => {}), 350); // let the chime play first
    } else if (wp) {
      const text = [wp.guidance, wp.navInstructions, wp.description].filter(Boolean).join(". ");
      if (text) setTimeout(() => speak(text), 350);
    }
  }

  // Advance to the next waypoint from GPS callbacks (uses the step ref).
  function advanceFromRef() {
    arrivedRef.current = false; departedRef.current = false;
    setArrived(false); setDeparted(false); setPendingArrival(false);
    const next = stepRef.current + 1;
    if (next >= orderedWps.length) { setNavMode("done"); }
    else { stepRef.current = next; setStep(next); setFocusWp(null); }
  }

  // Live GPS tracking during navigation → arrival (20m) + departure (50m) detection.
  useEffect(() => {
    if (navMode !== "navigating" || typeof navigator === "undefined" || !navigator.geolocation) return;
    const full = (trip?.waypointsJson ?? []).filter((w) => w.lat != null && w.lng != null);
    const orderedFull = navReverse ? [...full].reverse() : full;
    const ordered = orderedFull.map((w) => [w.lat as number, w.lng as number] as [number, number]);
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        const cur: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyPos(cur);
        const i = stepRef.current;
        const target = ordered[i];
        if (!target) return;
        const d = distM(cur, target);
        if (d <= ARRIVE_M && !arrivedRef.current) {
          arrivedRef.current = true;
          setArrived(true);
          setPendingArrival(true);
          fireArrival(orderedFull[i]);
        }
        // After the hiker sets off ("יצאתי לדרך"), moving 50m away → next waypoint.
        if (departedRef.current && d > DEPART_M) advanceFromRef();
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(wid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navMode, navReverse, trip]);

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

  if (loading || allowed === null) return <div dir="rtl" className="min-h-screen flex items-center justify-center text-fg-faint text-sm">טוען...</div>;
  if (!allowed) return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-fg-muted px-6 text-center">
      <div>אין לך גישה לתוכן זה — יש לרכוש את הטיול תחילה.</div>
      <div className="flex gap-2">
        <button type="button" onClick={() => router.push(`/trips/${id}`)} className="px-4 py-2 rounded-full font-medium text-white" style={{ background: "#1A6B4A" }}>חזרה לדף הטיול</button>
        <button type="button" onClick={() => router.push("/trips")} className="px-4 py-2 rounded-full font-medium border border-border text-fg-muted">חזרה לחיפוש</button>
      </div>
    </div>
  );
  if (!trip) return null;

  const waypoints = trip.waypointsJson ?? [];
  const mapPts = waypoints
    .map((w, i) => ({ i, lat: w.lat, lng: w.lng, label: w.name || `תחנה ${i + 1}` }))
    .filter((w): w is { i: number; lat: number; lng: number; label: string } => w.lat != null && w.lng != null);

  function focusOnWaypoint(originalIndex: number) {
    const mapIdx = mapPts.findIndex((p) => p.i === originalIndex);
    if (mapIdx < 0) return;
    setFocusWp(mapIdx);
    mapWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Ordered full waypoint objects (respecting reverse), for content reveal.
  const wpWithLoc = waypoints.filter((w) => w.lat != null && w.lng != null);
  const orderedWps = navReverse ? [...wpWithLoc].reverse() : wpWithLoc;
  const currentWp = orderedWps[step];
  const currentTarget = orderedPts[step];
  const distToTarget = myPos && currentTarget ? Math.round(distM(myPos, currentTarget)) : null;

  function startFromStep(idx: number, reverse: boolean) {
    // Unlock audio (chime + guidance auto-play) on this user gesture.
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) { audioCtxRef.current = audioCtxRef.current ?? new Ctx(); audioCtxRef.current.resume().catch(() => {}); }
      arrivalAudioRef.current?.load();
    } catch {}
    setNavReverse(reverse);
    setStep(idx);
    stepRef.current = idx;
    setPendingArrival(false); setArrived(false); setDeparted(false);
    arrivedRef.current = false; departedRef.current = false;
    setStartPrompt(null);
    setNavMode("navigating");
    setFocusWp(null);
  }

  // Check where the hiker is before starting: at the start, at the end (offer
  // reverse), or elsewhere (offer Waze to start / join from the nearest point).
  function beginNavigation() {
    if (navPts.length < 1) { startFromStep(0, false); return; }
    if (typeof navigator === "undefined" || !navigator.geolocation) { startFromStep(0, false); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const cur: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyPos(cur);
        const first = navPts[0], last = navPts[navPts.length - 1];
        const dStart = distM(cur, first);
        const dEnd = distM(cur, last);
        let nearestStep = 0, nd = Infinity;
        navPts.forEach((p, i) => { const d = distM(cur, p); if (d < nd) { nd = d; nearestStep = i; } });
        const atStart = dStart <= ARRIVE_M;
        const atEnd = dEnd <= ARRIVE_M && dEnd < dStart;
        if (atStart) { startFromStep(0, false); return; }
        setStartPrompt({ atStart, atEnd, dStart: Math.round(dStart), dEnd: Math.round(dEnd), nearestStep });
      },
      () => { setLocating(false); setStartPrompt({ atStart: false, atEnd: false, dStart: -1, dEnd: -1, nearestStep: 0 }); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function confirmArrival() {
    setPendingArrival(false); setArrived(false); setDeparted(false);
    arrivedRef.current = false; departedRef.current = false;
    const next = step + 1;
    if (next >= orderedWps.length) setNavMode("done");
    else { setStep(next); stepRef.current = next; setFocusWp(null); }
  }

  // The current waypoint's revealed content (text, safety, audio, PDF/links).
  function wpContentBlock(wp: Waypoint) {
    return (
      <>
        {wp.navInstructions && <div className="text-sm text-fg bg-surface-2 rounded-lg px-3 py-2 mb-2">🧭 {wp.navInstructions}</div>}
        {wp.guidance && <p className="text-sm text-fg-muted leading-relaxed mb-2">{wp.guidance}</p>}
        {wp.description && !wp.guidance && <p className="text-sm text-fg-muted leading-relaxed mb-2">{wp.description}</p>}
        {wp.safety && <div className="text-xs text-[#7A5010] bg-[#FDF3DC] rounded-lg px-3 py-2 mb-2">⚠ {wp.safety}</div>}
        <div className="flex items-center gap-2 mb-2">
          {wp.audioUrl ? <WaypointAudioPlayer src={wp.audioUrl} /> : (
            <button type="button" onClick={() => speak([wp.guidance, wp.navInstructions, wp.description].filter(Boolean).join(". "))}
              className="text-xs text-[#1A6B4A] border border-[#1A6B4A]/30 rounded-full px-2.5 py-1">🔊 הקרא בקול</button>
          )}
        </div>
        {Array.isArray(wp.sources) && wp.sources.length > 0 && (
          <div className="flex flex-col gap-1">
            {wp.sources.map((m, j) => (
              <div key={j}>
                <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-[#185FA5] hover:underline">{m.type === "pdf" ? "📄" : "🔗"} {m.title}</a>
                {m.description && <div className="text-[11px] text-fg-faint pr-4">{m.description}</div>}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── Completion screen ──
  if (navMode === "done") {
    return (
      <div dir="rtl" className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="font-display text-2xl text-fg">סיימת את הטיול!</h1>
        <p className="text-sm text-fg-muted max-w-xs">כל הכבוד — עברת את כל {orderedWps.length} התחנות של &quot;{trip.title}&quot;. נשמח לשמוע איך היה.</p>
        <div className="flex flex-col gap-2 w-full max-w-[260px]">
          <button type="button" onClick={() => router.push(`/trips/${trip.id}?scroll=reviews`)}
            className="w-full py-3 rounded-full text-sm font-semibold text-white" style={{ background: "#1A6B4A" }}>⭐ כתוב ביקורת</button>
          <button type="button" onClick={() => { setNavMode("preview"); setStep(0); }}
            className="w-full py-2.5 rounded-full text-sm font-medium border border-border text-fg-muted">חזרה לתוכן הטיול</button>
          <button type="button" onClick={() => router.push(`/trips/${trip.id}`)}
            className="w-full py-2.5 rounded-full text-sm font-medium text-fg-faint">לדף הטיול</button>
        </div>
      </div>
    );
  }

  // ── Active navigation ──
  if (navMode === "navigating") {
    const isLast = step >= orderedWps.length - 1;
    return (
      <div dir="rtl" className="min-h-screen bg-bg pb-28">
        <div className="max-w-[480px] mx-auto px-3 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button type="button" onClick={() => setNavMode("preview")}
              className="text-[11px] font-medium rounded-full px-3 py-1.5 shrink-0" style={{ background: "var(--surface-2)", color: "var(--fg)" }}>← עצור ניווט</button>
            <h1 className="text-sm font-semibold text-fg flex-1 truncate">ניווט · {trip.title}{navReverse ? " (הפוך)" : ""}</h1>
            <span className="text-[11px] text-fg-faint shrink-0">תחנה {step + 1}/{orderedWps.length}</span>
          </div>

          {/* Live map focused on the current target */}
          <div className="mb-3" ref={mapWrapRef}>
            <TripDetailMap
              region={trip.region}
              waypoints={orderedWps.map((w, i) => ({ lat: w.lat as number, lng: w.lng as number, label: `${i + 1}. ${w.name || ""}` }))}
              routeLine={parseTrack(trip.routeGpx).map((p) => [p.lat, p.lon] as [number, number])}
              focusWaypoint={step}
              height={240}
              liveLocation
            />
          </div>

          {/* Distance to the current target */}
          <div className="rounded-2xl p-3 mb-3 flex items-center justify-between"
            style={{ background: pendingArrival ? "rgba(26,107,74,0.12)" : "var(--surface-2)" }}>
            <div className="text-sm">
              <div className="text-fg-muted text-[11px]">היעד הבא</div>
              <div className="font-semibold text-fg">{currentWp?.name || `תחנה ${step + 1}`}</div>
            </div>
            <div className="text-left">
              {distToTarget != null
                ? <div className={`text-lg font-bold tabular-nums ${pendingArrival ? "text-[#1A6B4A]" : "text-fg"}`}>{distToTarget} מ׳</div>
                : <div className="text-[11px] text-fg-faint">מאתר מיקום…</div>}
              {pendingArrival && <div className="text-[10px] text-[#1A6B4A] font-medium">הגעת לאזור התחנה!</div>}
            </div>
          </div>

          {/* Arrival banner — auto-opened content screen for the reached waypoint */}
          {arrived && (
            <div className="rounded-2xl p-3 mb-3 text-center text-sm font-semibold text-white" style={{ background: "#1A6B4A" }}>
              🎉 הגעת לתחנה {step + 1}! {currentWp?.audioUrl ? "ההדרכה מתנגנת…" : ""}
            </div>
          )}

          {/* Current waypoint content (auto-revealed on arrival — always viewable) */}
          {currentWp && (
            <div className="bg-surface rounded-2xl border border-border p-4 mb-3" style={arrived ? { boxShadow: "0 0 0 2px var(--accent)" } : undefined}>
              <div className="text-sm font-semibold text-fg mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D6EDE3] text-[#1A6B4A] flex items-center justify-center text-xs font-bold">{step + 1}</span>
                {currentWp.name || `תחנה ${step + 1}`}
              </div>
              {wpContentBlock(currentWp)}
            </div>
          )}
        </div>

        {/* Hidden audio element for on-arrival guidance auto-play */}
        <audio ref={arrivalAudioRef} preload="none" />

        {/* Fixed action bar — הגעתי (confirm) + יצאתי לדרך (arm departure auto-advance) */}
        <div className="fixed bottom-0 inset-x-0 flex justify-center z-40" dir="rtl">
          <div className="w-full max-w-[480px] bg-surface/95 backdrop-blur-xl border-t border-border p-3 flex gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
            {arrived && !isLast && (
              <button type="button" onClick={() => setDeparted((v) => !v)}
                className="px-4 py-3 rounded-full text-sm font-semibold shadow-lg shrink-0"
                style={departed ? { background: "#E8A020", color: "#fff" } : { border: "1.5px solid #1A6B4A", color: "#1A6B4A" }}>
                {departed ? "🚶 בדרך… (עוקב)" : "🚶 יצאתי לדרך"}
              </button>
            )}
            <button type="button" onClick={confirmArrival}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white shadow-lg"
              style={{ background: pendingArrival || arrived ? "#1A6B4A" : "#6b7280" }}>
              {isLast ? "✓ הגעתי — סיים טיול" : pendingArrival || arrived ? "✓ הגעתי — לתחנה הבאה" : "הגעתי (אישור ידני) →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg py-4 px-3">
      <div className="max-w-[480px] mx-auto pb-10">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => router.push(exitHref)}
            className="text-[11px] font-medium rounded-full px-3 py-1.5 shrink-0 flex items-center gap-1"
            style={{ background: "var(--surface-2)", color: "var(--fg)" }}>
            ← צא מהטיול
          </button>
          <h1 className="text-sm font-semibold text-fg flex-1 truncate">טיול עצמאי — {trip.title}</h1>
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

        {/* Start guided navigation */}
        {navPts.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
            <div className="text-sm font-semibold text-fg mb-1">🧭 ניווט מודרך</div>
            <div className="text-[11px] text-fg-faint mb-3">התחל ניווט חי עם זיהוי תחנות אוטומטי (ברדיוס 20 מ׳) וחשיפת תוכן לאורך הדרך.</div>
            {!startPrompt ? (
              <div className="flex gap-2">
                <button type="button" onClick={beginNavigation} disabled={locating}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#1A6B4A" }}>
                  {locating ? "מאתר מיקום…" : "▶ התחל ניווט"}
                </button>
                <a href={wazeUrl(navPts[0][0], navPts[0][1])} target="_blank" rel="noreferrer"
                  className="px-3 py-2.5 rounded-full text-sm font-medium border border-[#185FA5]/40 text-[#185FA5] flex items-center gap-1">
                  📍 נווט לנקודת ההתחלה
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-[#7A5010] bg-[#FDF3DC] rounded-lg px-3 py-2">
                  {startPrompt.dStart < 0
                    ? "לא הצלחנו לאתר את מיקומך. אפשר להתחיל מנקודת ההתחלה ידנית."
                    : startPrompt.atEnd
                    ? `נראה שאתה קרוב לנקודת הסיום (${startPrompt.dEnd} מ׳). אפשר לנווט בכיוון הפוך.`
                    : `אינך בנקודת ההתחלה (במרחק ${startPrompt.dStart} מ׳ ממנה).`}
                </div>
                <div className="flex flex-col gap-1.5">
                  <a href={wazeUrl(navPts[0][0], navPts[0][1])} target="_blank" rel="noreferrer"
                    className="w-full text-center py-2 rounded-full text-sm font-medium border border-[#185FA5]/40 text-[#185FA5]">📍 נווט לנקודת ההתחלה (Waze)</a>
                  {startPrompt.atEnd && (
                    <button type="button" onClick={() => startFromStep(0, true)}
                      className="w-full py-2 rounded-full text-sm font-semibold text-white" style={{ background: "#1A6B4A" }}>🔄 נווט בכיוון הפוך</button>
                  )}
                  {startPrompt.dStart >= 0 && !startPrompt.atEnd && (
                    <button type="button" onClick={() => startFromStep(startPrompt.nearestStep, false)}
                      className="w-full py-2 rounded-full text-sm font-medium border border-[#1A6B4A]/40 text-[#1A6B4A]">📍 הצטרף מנקודה אחרת (התחנה הקרובה)</button>
                  )}
                  <button type="button" onClick={() => startFromStep(0, false)}
                    className="w-full py-2 rounded-full text-sm font-semibold text-white" style={{ background: "#1A6B4A" }}>התחל מהתחלה בכל זאת</button>
                  <button type="button" onClick={() => setStartPrompt(null)}
                    className="w-full py-1.5 text-xs text-fg-faint">ביטול</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-[#EEF5FC] border border-[#185FA5]/20 rounded-2xl p-3 mb-3 text-xs text-[#185FA5]">
          📍 הנקודה הכחולה במפה מציגה את מיקומך בזמן אמת. כל תחנה כוללת הנחיות והסבר עם אפשרות הקראה.
        </div>

        {/* Live map with blue dot + elevation-hover marker */}
        <div className="mb-3" ref={mapWrapRef}>
          <TripDetailMap
            region={trip.region}
            waypoints={mapPts.map((p) => ({ lat: p.lat, lng: p.lng, label: p.label }))}
            routeLine={parseTrack(trip.routeGpx).map((p) => [p.lat, p.lon] as [number, number])}
            focusWaypoint={focusWp}
            hoverCoord={hoverCoord}
            height={220}
            liveLocation
          />
        </div>

        {/* Interactive elevation profile — synced with the map above */}
        {(() => {
          const track = parseTrack(trip.routeGpx);
          if (track.length < 2) return null;
          return (
            <div className="mb-3">
              <ElevationChart track={track} waypoints={mapPts.map((p) => ({ lat: p.lat, lng: p.lng, label: p.label }))} onHover={setHoverCoord} />
            </div>
          );
        })()}

        {/* Share access (owner only, up to 3 people) */}
        {isOwner && !offlineMode && (
          <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
            <div className="text-sm font-semibold text-fg mb-1">שתף גישה (עד 3 אנשים)</div>
            <div className="text-[11px] text-fg-faint mb-2">בני משפחה שתשתף יוכלו לגשת לתוכן עם המייל שלהם</div>
            <div className="flex flex-col gap-1.5">
              {shareEmails.map((e, i) => (
                <input key={i} type="email" value={e} dir="ltr"
                  onChange={(ev) => setShareEmails((prev) => prev.map((x, j) => j === i ? ev.target.value : x))}
                  placeholder={`אימייל ${i + 1}`}
                  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={saveShare} className="px-4 py-1.5 bg-[#1A6B4A] text-white rounded-full text-xs font-medium">שמור שיתוף</button>
              {shareMsg && <span className="text-[11px] text-[#0F5038]">{shareMsg}</span>}
            </div>
          </div>
        )}

        {trip.description && (
          <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-fg">📄 על הטיול</span>
              <button type="button" onClick={() => speak(trip.description ?? "")} className="text-xs text-[#1A6B4A]">🔊 הקרא</button>
            </div>
            <p className="text-sm text-fg-muted leading-relaxed">{trip.description}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {waypoints.length === 0 && <div className="text-center py-8 text-fg-faint text-sm">אין תחנות מוגדרות</div>}
          {waypoints.map((wp, i) => {
            const hasLoc = wp.lat != null && wp.lng != null;
            return (
            <div key={i} className="bg-surface rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => hasLoc && focusOnWaypoint(i)}
                  className={`w-7 h-7 rounded-full bg-[#D6EDE3] text-[#1A6B4A] flex items-center justify-center text-xs font-semibold shrink-0 ${hasLoc ? "hover:bg-[#1A6B4A] hover:text-white transition-colors" : ""}`}
                  title={hasLoc ? "הצג במפה" : undefined}>{i + 1}</button>
                <button type="button" onClick={() => hasLoc && focusOnWaypoint(i)}
                  className="text-sm font-medium text-fg flex-1 text-right">{wp.name || `תחנה ${i + 1}`}</button>
                {hasLoc && (
                  <button type="button" onClick={() => focusOnWaypoint(i)}
                    className="text-[11px] text-[#185FA5] border border-[#185FA5]/30 rounded-full px-2 py-1 shrink-0">📍 במפה</button>
                )}
                {/* Audio takes priority over TTS when the guide uploaded a clip */}
                {wp.audioUrl ? (
                  <WaypointAudioPlayer src={wp.audioUrl} />
                ) : (
                  <button type="button" onClick={() => speak([wp.guidance, wp.navInstructions, wp.description].filter(Boolean).join(". "))}
                    className="text-xs text-[#1A6B4A] border border-[#1A6B4A]/30 rounded-full px-2.5 py-1 shrink-0">🔊 הקרא</button>
                )}
              </div>
              {wp.navInstructions && (
                <div className="text-xs text-fg bg-surface-2 rounded-lg px-3 py-2 mb-1.5">🧭 {wp.navInstructions}</div>
              )}
              {wp.guidance && <p className="text-sm text-fg-muted leading-relaxed mb-1.5">{wp.guidance}</p>}
              {wp.description && !wp.guidance && <p className="text-sm text-fg-muted leading-relaxed mb-1.5">{wp.description}</p>}
              {wp.safety && (
                <div className="text-xs text-[#7A5010] bg-[#FDF3DC] rounded-lg px-3 py-2">⚠ {wp.safety}</div>
              )}
              {Array.isArray(wp.sources) && wp.sources.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {wp.sources.map((m, j) => (
                    <div key={j}>
                      <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-[#185FA5] hover:underline">{m.type === "pdf" ? "📄" : "🔗"} {m.title}</a>
                      {m.description && <div className="text-[11px] text-fg-faint pr-4">{m.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

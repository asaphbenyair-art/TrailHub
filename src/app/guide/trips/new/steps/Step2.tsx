"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback, useMemo } from "react";
import { WizardData, WaypointData } from "../types";
import SourceMaterialsEditor from "./SourceMaterialsEditor";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

// ── GPX route parsing + distance (for the 10m waypoint-off-route warning) ──
type LL = { lat: number; lng: number };
function parseGpxPoints(gpx: string): LL[] {
  if (!gpx) return [];
  const pts: LL[] = [];
  const tagRe = /<(?:trkpt|rtept|wpt)\b([^>/]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(gpx)) !== null) {
    const lat = /lat="([-\d.]+)"/.exec(m[1]);
    const lon = /lon="([-\d.]+)"/.exec(m[1]);
    if (lat && lon) pts.push({ lat: parseFloat(lat[1]), lng: parseFloat(lon[1]) });
  }
  return pts;
}
function haversineM(a: LL, b: LL): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function metersToRoute(wp: LL, route: LL[]): number {
  let min = Infinity;
  for (const p of route) { const d = haversineM(wp, p); if (d < min) min = d; }
  return min;
}

const ROUTE_TYPES = [
  { value: "one-way", label: "חד-כיווני" },
  { value: "circular-nature", label: "מעגלי — שטח" },
  { value: "circular-urban", label: "מעגלי — עירוני" },
];

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string | WaypointData[]) => void;
}

export default function Step2({ data, onChange }: Props) {
  const gpxRef = useRef<HTMLInputElement>(null);
  const [gpxName, setGpxName] = useState<string>(data.routeGpx ? "מסלול קיים" : "");
  const gpxContent = data.routeGpx;
  const mapWaypoints = data.waypointsJson;
  const routePoints = useMemo(() => parseGpxPoints(gpxContent), [gpxContent]);

  function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGpxName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => onChange("routeGpx", (ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    onChange("waypointsJson", [...mapWaypoints, { lat, lng, name: `נקודת עצירה ${mapWaypoints.length + 1}`, description: "" }]);
  }, [mapWaypoints, onChange]);

  function addWaypoint() {
    // Default near the last point (or Israel's center) — guide fine-tunes on the map / via nav text
    const last = mapWaypoints[mapWaypoints.length - 1];
    const lat = last ? last.lat + 0.003 : 31.5;
    const lng = last ? last.lng + 0.003 : 34.9;
    onChange("waypointsJson", [...mapWaypoints, { lat, lng, name: `נקודת עצירה ${mapWaypoints.length + 1}`, description: "" }]);
  }

  function patchWaypoint(i: number, patch: Partial<WaypointData>) {
    onChange("waypointsJson", mapWaypoints.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  }
  function removeWaypoint(i: number) {
    onChange("waypointsJson", mapWaypoints.filter((_, j) => j !== i));
  }
  function clearGpx() {
    setGpxName("");
    onChange("routeGpx", "");
    onChange("waypointsJson", []);
    if (gpxRef.current) gpxRef.current.value = "";
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-fg border-b border-border pb-3 mb-1">מסלול</div>

      {/* Route type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-fg-muted">סוג מסלול</label>
        <div className="flex gap-2 flex-wrap">
          {ROUTE_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => onChange("routeType", t.value)}
              className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg border text-xs transition-colors ${
                data.routeType === t.value ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-border text-fg-muted hover:border-border"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* GPX upload */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-fg-muted">קובץ GPX <span className="text-danger">(חובה)</span></label>
        {gpxName ? (
          <div className="flex items-center gap-2 border border-[#1A6B4A] bg-[#D6EDE3] rounded-lg px-3 py-2.5">
            <span className="text-lg">🗺</span>
            <span className="text-sm text-[#0F5038] flex-1 truncate">{gpxName}</span>
            <button type="button" onClick={clearGpx} className="text-fg-faint hover:text-red-500 text-xs px-1">✕</button>
          </div>
        ) : (
          <div onClick={() => gpxRef.current?.click()}
            className="border border-dashed border-border rounded-lg p-5 text-center text-fg-faint text-sm cursor-pointer hover:border-[#1A6B4A] hover:bg-surface-2 transition-colors select-none">
            <div className="text-2xl mb-1">🗺</div>
            <div>לחץ להעלאת קובץ GPX</div>
            <div className="text-xs text-fg-faint mt-1">המסלול יוצג על המפה אוטומטית ויישמר עם הטיול</div>
          </div>
        )}
        <input ref={gpxRef} type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={handleGpxFile} />
      </div>

      {/* Map */}
      <div className="flex flex-col gap-1">
        {!gpxContent && <p className="text-xs text-fg-faint">לחץ על המפה להוספת נקודות עצירה</p>}
        <TripMap
          gpxContent={gpxContent}
          waypoints={mapWaypoints.map((w) => ({ lat: w.lat, lng: w.lng, label: w.name }))}
          onMapClick={handleMapClick}
          onDistanceKm={(km) => onChange("distanceKm", km)}
        />
      </div>

      {/* Waypoints list — name + description per point */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fg-muted">
            {data.tripType === "SELF_GUIDED" ? "תחנות ניווט" : "נקודות עצירה"} ({mapWaypoints.length})
          </label>
          <button type="button" onClick={addWaypoint}
            className="text-xs text-[#1A6B4A] font-medium border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors">
            + הוסף תחנה
          </button>
        </div>
        {data.tripType === "SELF_GUIDED" && mapWaypoints.length === 0 && (
          <p className="text-[11px] text-fg-faint">כל תחנה כוללת הוראות ניווט צעד-אחר-צעד, חומר הדרכה שיוקרא בקול, ואזהרת בטיחות — הם מחליפים את המדריך החי.</p>
        )}
        {mapWaypoints.length > 0 && (
          <>
          {mapWaypoints.map((wp, i) => {
            const offRoute = routePoints.length > 0 && Number.isFinite(wp.lat) && metersToRoute(wp, routePoints) > 10;
            return (
            <div key={i} className="border border-border rounded-xl p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[#1A6B4A] font-medium text-xs shrink-0">📍 {i + 1}</span>
                <input type="text" value={wp.name} onChange={(e) => patchWaypoint(i, { name: e.target.value })}
                  placeholder="שם הנקודה" className="flex-1 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                <button type="button" onClick={() => removeWaypoint(i)} className="text-fg-faint hover:text-red-400 px-1">✕</button>
              </div>
              {offRoute && (
                <div className="text-[11px] text-[#7A5010] bg-[#FDF6E8] border border-[#E8A020]/30 rounded-lg px-2 py-1">
                  ⚠ הנקודה רחוקה מהמסלול — האם אתה בטוח?
                </div>
              )}
              <input type="text" value={wp.description} onChange={(e) => patchWaypoint(i, { description: e.target.value })}
                placeholder="תיאור קצר (אופציונלי)" className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
              {data.tripType === "SELF_GUIDED" && (
                <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-border">
                  <input type="text" value={wp.navInstructions ?? ""} onChange={(e) => patchWaypoint(i, { navInstructions: e.target.value })}
                    placeholder="🧭 הוראות ניווט (למשל: אחרי 200מ' פנה שמאל בעץ הגדול)" className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
                  <textarea value={wp.guidance ?? ""} onChange={(e) => patchWaypoint(i, { guidance: e.target.value })} rows={2}
                    placeholder="📖 חומר הדרכה (יוקרא בקול — מחליף את המדריך)" className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A] resize-none" />
                  <input type="text" value={wp.safety ?? ""} onChange={(e) => patchWaypoint(i, { safety: e.target.value })}
                    placeholder="⚠ אזהרת בטיחות לקטע זה" className="border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
                </div>
              )}
              <div className="mt-1 pt-1.5 border-t border-border">
                <SourceMaterialsEditor label="חומרי מקור לנקודה זו" materials={wp.sources ?? []}
                  onChange={(next) => patchWaypoint(i, { sources: next })} />
              </div>
            </div>
            );
          })}
          </>
        )}
      </div>

      {/* Distance + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">אורך (ק"מ)</label>
          <input type="number" step="0.1" min="0" value={data.distanceKm}
            onChange={(e) => onChange("distanceKm", e.target.value)} placeholder="12.4"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-fg-muted">משך (שעות)</label>
          <input type="number" step="0.5" min="0" value={data.durationHours}
            onChange={(e) => onChange("durationHours", e.target.value)} placeholder="5"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
        </div>
      </div>
    </div>
  );
}

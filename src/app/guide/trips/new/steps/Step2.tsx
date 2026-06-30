"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback } from "react";
import { WizardData, WaypointData } from "../types";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

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
      <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-3 mb-1">מסלול</div>

      {/* Route type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500">סוג מסלול</label>
        <div className="flex gap-2 flex-wrap">
          {ROUTE_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => onChange("routeType", t.value)}
              className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg border text-xs transition-colors ${
                data.routeType === t.value ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* GPX upload */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">קובץ GPX (אופציונלי)</label>
        {gpxName ? (
          <div className="flex items-center gap-2 border border-[#1A6B4A] bg-[#D6EDE3] rounded-lg px-3 py-2.5">
            <span className="text-lg">🗺</span>
            <span className="text-sm text-[#0F5038] flex-1 truncate">{gpxName}</span>
            <button type="button" onClick={clearGpx} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
          </div>
        ) : (
          <div onClick={() => gpxRef.current?.click()}
            className="border border-dashed border-gray-200 rounded-lg p-5 text-center text-gray-400 text-sm cursor-pointer hover:border-[#1A6B4A] hover:bg-gray-50 transition-colors select-none">
            <div className="text-2xl mb-1">🗺</div>
            <div>לחץ להעלאת קובץ GPX</div>
            <div className="text-xs text-gray-300 mt-1">המסלול יוצג על המפה אוטומטית ויישמר עם הטיול</div>
          </div>
        )}
        <input ref={gpxRef} type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={handleGpxFile} />
      </div>

      {/* Map */}
      <div className="flex flex-col gap-1">
        {!gpxContent && <p className="text-xs text-gray-400">לחץ על המפה להוספת נקודות עצירה</p>}
        <TripMap
          gpxContent={gpxContent}
          waypoints={mapWaypoints.map((w) => ({ lat: w.lat, lng: w.lng, label: w.name }))}
          onMapClick={handleMapClick}
          onDistanceKm={(km) => onChange("distanceKm", km)}
        />
      </div>

      {/* Waypoints list — name + description per point */}
      {mapWaypoints.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">נקודות עצירה ({mapWaypoints.length})</label>
          {mapWaypoints.map((wp, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[#1A6B4A] font-medium text-xs shrink-0">📍 {i + 1}</span>
                <input type="text" value={wp.name} onChange={(e) => patchWaypoint(i, { name: e.target.value })}
                  placeholder="שם הנקודה" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                <button type="button" onClick={() => removeWaypoint(i)} className="text-gray-300 hover:text-red-400 px-1">✕</button>
              </div>
              <input type="text" value={wp.description} onChange={(e) => patchWaypoint(i, { description: e.target.value })}
                placeholder="תיאור קצר (אופציונלי)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
              {data.tripType === "SELF_GUIDED" && (
                <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-gray-100">
                  <input type="text" value={wp.navInstructions ?? ""} onChange={(e) => patchWaypoint(i, { navInstructions: e.target.value })}
                    placeholder="🧭 הוראות ניווט (למשל: אחרי 200מ' פנה שמאל בעץ הגדול)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
                  <textarea value={wp.guidance ?? ""} onChange={(e) => patchWaypoint(i, { guidance: e.target.value })} rows={2}
                    placeholder="📖 חומר הדרכה (יוקרא בקול — מחליף את המדריך)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A] resize-none" />
                  <input type="text" value={wp.safety ?? ""} onChange={(e) => patchWaypoint(i, { safety: e.target.value })}
                    placeholder="⚠ אזהרת בטיחות לקטע זה" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Distance + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">אורך (ק"מ)</label>
          <input type="number" step="0.1" min="0" value={data.distanceKm}
            onChange={(e) => onChange("distanceKm", e.target.value)} placeholder="12.4"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">משך (שעות)</label>
          <input type="number" step="0.5" min="0" value={data.durationHours}
            onChange={(e) => onChange("durationHours", e.target.value)} placeholder="5"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
        </div>
      </div>
    </div>
  );
}

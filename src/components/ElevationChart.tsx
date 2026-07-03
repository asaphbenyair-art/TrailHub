"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

export interface TrackPt { lat: number; lon: number; ele: number }

/** Parse GPX <trkpt lat lon><ele> into points with coordinates + elevation. */
export function parseTrack(gpx: string | null | undefined): TrackPt[] {
  if (!gpx) return [];
  const pts: TrackPt[] = [];
  const re = /<(?:trkpt|rtept|wpt)[^>]*\blat="(-?[\d.]+)"[^>]*\blon="(-?[\d.]+)"[^>]*>([\s\S]*?)<\/(?:trkpt|rtept|wpt)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(gpx)) !== null) {
    const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
    const em = /<ele>\s*(-?[\d.]+)\s*<\/ele>/.exec(m[3]);
    const ele = em ? parseFloat(em[1]) : NaN;
    if (!Number.isNaN(lat) && !Number.isNaN(lon) && !Number.isNaN(ele)) pts.push({ lat, lon, ele });
  }
  return pts;
}

function haversine(a: TrackPt, b: TrackPt): number {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s)); // km
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/**
 * Interactive elevation profile driven by a GPX track.
 * Stats row (distance, ascent, descent, min–max) + filled green area + numbered
 * waypoint dots. Hover is CONTINUOUS: the mouse X maps to an exact distance along
 * the route, the elevation/coordinates are interpolated between GPX points, a
 * dashed crosshair follows the cursor, a tooltip shows elevation + distance (+
 * nearby waypoint name), and onHover emits the interpolated [lat,lng] so a marker
 * on the map can move smoothly and continuously — not snapping to fixed points.
 */
export default function ElevationChart({
  track,
  waypoints = [],
  onHover,
}: {
  track: TrackPt[];
  waypoints?: Array<{ lat: number; lng: number; label: string }>;
  onHover?: (coord: [number, number] | null) => void;
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  if (track.length < 2) return null;

  const W = 320, H = 108, padX = 6, padTop = 8, padBot = 6;
  // Cumulative distance per track point.
  const cum: number[] = [0];
  for (let i = 1; i < track.length; i++) cum.push(cum[i - 1] + haversine(track[i - 1], track[i]));
  const totalKm = cum[cum.length - 1] || 0.001;
  const eles = track.map((p) => p.ele);
  const min = Math.min(...eles), max = Math.max(...eles), range = max - min || 1;
  let ascent = 0, descent = 0;
  for (let i = 1; i < eles.length; i++) { const d = eles[i] - eles[i - 1]; if (d > 0) ascent += d; else descent -= d; }

  const xOf = (km: number) => padX + (km / totalKm) * (W - 2 * padX);
  const yOf = (e: number) => padTop + (1 - (e - min) / range) * (H - padTop - padBot);

  // Drawn line (downsampled for smoothness).
  const N = Math.min(track.length, 140), stride = track.length / N;
  const pathPts = Array.from({ length: N }, (_, i) => {
    const idx = Math.min(Math.floor(i * stride), track.length - 1);
    return { x: xOf(cum[idx]), y: yOf(eles[idx]) };
  });
  const line = pathPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${xOf(0).toFixed(1)},${(H - padBot).toFixed(1)} ${line} ${xOf(totalKm).toFixed(1)},${(H - padBot).toFixed(1)}`;

  // Waypoints → their distance along the route (nearest track point).
  const wpMarks = waypoints.map((w, i) => {
    let best = 0, bd = Infinity;
    for (let k = 0; k < track.length; k++) {
      const d = (track[k].lat - w.lat) ** 2 + (track[k].lon - w.lng) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    return { i, km: cum[best], ele: eles[best], label: w.label };
  });

  // Interpolate an exact point at a given distance along the route.
  function sampleAt(km: number): { lat: number; lon: number; ele: number } {
    const d = Math.max(0, Math.min(km, totalKm));
    // Binary-search the segment containing d.
    let lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
    const seg = cum[hi] - cum[lo] || 1;
    const f = (d - cum[lo]) / seg;
    return {
      lat: lerp(track[lo].lat, track[hi].lat, f),
      lon: lerp(track[lo].lon, track[hi].lon, f),
      ele: lerp(eles[lo], eles[hi], f),
    };
  }

  // Current hover state (continuous).
  let hover: { km: number; ele: number; x: number; y: number; wp?: string } | null = null;
  if (hoverX != null) {
    const km = (Math.max(padX, Math.min(W - padX, hoverX)) - padX) / (W - 2 * padX) * totalKm;
    const s = sampleAt(km);
    // Nearby waypoint (within ~4% of total distance).
    let near: string | undefined;
    let nd = totalKm * 0.04;
    for (const w of wpMarks) { const dd = Math.abs(w.km - km); if (dd < nd) { nd = dd; near = w.label; } }
    hover = { km, ele: s.ele, x: xOf(km), y: yOf(s.ele), wp: near };
  }

  function handleMove(clientX: number, el: SVGSVGElement) {
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    setHoverX(x);
    const km = (Math.max(padX, Math.min(W - padX, x)) - padX) / (W - 2 * padX) * totalKm;
    const s = sampleAt(km);
    onHover?.([s.lat, s.lon]);
  }
  function clearHover() { setHoverX(null); onHover?.(null); }

  const stat = (label: string, value: string) => (
    <div className="flex flex-col items-center flex-1">
      <span className="text-[13px] font-semibold text-fg tabular-nums">{value}</span>
      <span className="text-[9px] text-fg-faint">{label}</span>
    </div>
  );

  return (
    <div className="rounded-2xl p-3.5 border border-border bg-surface">
      <div className="flex items-center gap-1 text-[11px] text-fg-faint mb-2">
        <TrendingUp size={12} /> פרופיל גובה
      </div>
      {/* Stats row */}
      <div className="flex items-stretch mb-2 divide-x divide-x-reverse divide-border" dir="rtl">
        {stat("מרחק", `${totalKm.toFixed(1)} ק״מ`)}
        {stat("טיפוס", `${Math.round(ascent)} מ׳`)}
        {stat("ירידה", `${Math.round(descent)} מ׳`)}
        {stat("גובה", `${Math.round(min)}–${Math.round(max)} מ׳`)}
      </div>
      {/* Chart */}
      <div className="relative" style={{ direction: "ltr" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: 108, touchAction: "none" }} preserveAspectRatio="none"
          onMouseLeave={clearHover}
          onMouseMove={(e) => handleMove(e.clientX, e.currentTarget)}
          onTouchMove={(e) => { if (e.touches[0]) handleMove(e.touches[0].clientX, e.currentTarget); }}
          onTouchEnd={clearHover}
        >
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#elevGrad)" />
          <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {/* Waypoint dots + their dashed vertical guides */}
          {wpMarks.map((w) => (
            <g key={w.i}>
              <line x1={xOf(w.km)} y1={padTop} x2={xOf(w.km)} y2={H - padBot} stroke="var(--accent)" strokeWidth={0.5} strokeDasharray="1.5 2.5" opacity={0.35} vectorEffect="non-scaling-stroke" />
              <circle cx={xOf(w.km)} cy={yOf(w.ele)} r={2.6} fill="var(--accent)" stroke="#fff" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {/* Continuous hover crosshair + interpolated point */}
          {hover && (
            <>
              <line x1={hover.x} y1={padTop} x2={hover.x} y2={H - padBot} stroke="var(--fg-faint)" strokeWidth={0.7} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
              <circle cx={hover.x} cy={hover.y} r={3.4} fill="#fff" stroke="var(--accent)" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {/* Waypoint number labels + km on the x-axis under their dots */}
        {wpMarks.map((w) => (
          <span key={w.i} className="absolute -translate-x-1/2 text-[8px] font-semibold text-fg-faint text-center leading-tight"
            style={{ left: `${(xOf(w.km) / W) * 100}%`, top: 1 }}>
            {w.i + 1}
            <span className="block text-[7px] text-fg-faint/70">{w.km.toFixed(1)}</span>
          </span>
        ))}
        {/* Tooltip: elevation + distance (+ waypoint name if near) */}
        {hover && (
          <div className="absolute pointer-events-none px-2 py-1 rounded-lg text-[10px] font-medium text-white shadow-lg whitespace-nowrap"
            style={{ left: `${Math.min(Math.max((hover.x / W) * 100, 14), 86)}%`, top: -4, transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)" }}>
            {Math.round(hover.ele)} מ׳ · {hover.km.toFixed(1)} ק״מ
            {hover.wp ? <span className="block text-[9px] text-white/80">📍 {hover.wp}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}

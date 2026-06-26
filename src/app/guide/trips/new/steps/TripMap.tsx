"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

// Fix Leaflet default marker icons (broken by webpack)
function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)["_getIconUrl"];
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

interface GpxPoint { lat: number; lng: number; ele: number }

function parseGpx(gpxText: string): GpxPoint[] {
  try {
    const doc = new DOMParser().parseFromString(gpxText, "text/xml");
    return Array.from(doc.querySelectorAll("trkpt,rtept")).map((pt) => ({
      lat: parseFloat(pt.getAttribute("lat") ?? "0"),
      lng: parseFloat(pt.getAttribute("lon") ?? "0"),
      ele: parseFloat(pt.querySelector("ele")?.textContent ?? "0"),
    }));
  } catch {
    return [];
  }
}

function haversineKm(p1: GpxPoint, p2: GpxPoint): number {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDistanceKm(pts: GpxPoint[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversineKm(pts[i - 1], pts[i]);
  return Math.round(d * 10) / 10;
}

export interface MapWaypoint { lat: number; lng: number; label: string }

interface Props {
  gpxContent: string;
  waypoints?: MapWaypoint[];
  onDistanceKm?: (km: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function TripMap({ gpxContent, waypoints = [], onDistanceKm, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRefs = useRef<L.Marker[]>([]);
  const [points, setPoints] = useState<GpxPoint[]>([]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    fixLeafletIcons();

    const map = L.map(containerRef.current, { zoomControl: true });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Default view: Israel
    map.setView([31.5, 34.9], 7);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire click handler (re-run when onMapClick reference changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick?.(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  // Draw GPX track — also handles clearing when gpxContent becomes empty
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing polyline always
    polylineRef.current?.remove();
    polylineRef.current = null;

    if (!gpxContent) {
      setPoints([]);
      map.setView([31.5, 34.9], 7);
      return;
    }

    const pts = parseGpx(gpxContent);
    if (!pts.length) return;
    setPoints(pts);

    const latlngs: L.LatLngTuple[] = pts.map((p) => [p.lat, p.lng]);
    const poly = L.polyline(latlngs, { color: "#1A6B4A", weight: 3, opacity: 0.85 }).addTo(map);
    polylineRef.current = poly;
    map.fitBounds(poly.getBounds(), { padding: [24, 24] });

    onDistanceKm?.(String(totalDistanceKm(pts)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpxContent]);

  // Sync waypoint markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = waypoints.map((wp, i) =>
      L.marker([wp.lat, wp.lng])
        .bindPopup(wp.label || `נקודה ${i + 1}`)
        .addTo(map)
    );
  }, [waypoints]);

  // Elevation profile
  const eleMin = points.length ? Math.min(...points.map((p) => p.ele)) : 0;
  const eleMax = points.length ? Math.max(...points.map((p) => p.ele)) : 0;
  const eleRange = eleMax - eleMin || 1;
  const W = 360, H = 48;
  const pathD = points.length
    ? points
        .map((p, i) => {
          const x = (i / (points.length - 1)) * W;
          const y = H - ((p.ele - eleMin) / eleRange) * (H - 6);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ")
    : "";

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-gray-200"
        style={{ height: 200 }}
      />

      {points.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>פרופיל גבהים</span>
            <span>{eleMin}m — {eleMax}m</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
            <path d={`${pathD} L${W},${H} L0,${H}Z`} fill="#D6EDE3" />
            <path d={pathD} stroke="#1A6B4A" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}

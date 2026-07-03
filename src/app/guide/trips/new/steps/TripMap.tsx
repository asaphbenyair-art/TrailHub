"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
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
  editable?: boolean; // when false, tapping the map does nothing (view mode)
  /** Coordinate to highlight with a moving marker (elevation-chart hover sync). */
  hoverCoord?: [number, number] | null;
}

export default function TripMap({ gpxContent, waypoints = [], onDistanceKm, onMapClick, editable = true, hoverCoord = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRefs = useRef<L.Marker[]>([]);
  const hoverRef = useRef<L.CircleMarker | null>(null);

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

  // Wire click handler — only adds waypoints in edit mode.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => { if (editable) onMapClick?.(e.latlng.lat, e.latlng.lng); };
    map.on("click", handler);
    const el = map.getContainer();
    el.style.cursor = editable ? "crosshair" : "grab";
    return () => { map.off("click", handler); };
  }, [onMapClick, editable]);

  // Draw GPX track — also handles clearing when gpxContent becomes empty
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing polyline always
    polylineRef.current?.remove();
    polylineRef.current = null;

    if (!gpxContent) {
      map.setView([31.5, 34.9], 7);
      return;
    }

    const pts = parseGpx(gpxContent);
    if (!pts.length) return;

    const latlngs: L.LatLngTuple[] = pts.map((p) => [p.lat, p.lng]);
    const poly = L.polyline(latlngs, { color: "#1A6B4A", weight: 3, opacity: 0.85 }).addTo(map);
    polylineRef.current = poly;
    // Center the map on the route (invalidateSize fixes bounds when the container
    // was just laid out, e.g. when the waypoint editor first opens).
    map.invalidateSize();
    map.fitBounds(poly.getBounds(), { padding: [24, 24] });
    setTimeout(() => { try { map.invalidateSize(); map.fitBounds(poly.getBounds(), { padding: [24, 24] }); } catch {} }, 200);

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

  // Moving marker driven by the elevation-chart hover (same as the hiker view).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hoverCoord) {
      if (hoverRef.current) { hoverRef.current.remove(); hoverRef.current = null; }
      return;
    }
    if (!hoverRef.current) {
      hoverRef.current = L.circleMarker(hoverCoord, { radius: 7, color: "#fff", weight: 3, fillColor: "#1A6B4A", fillOpacity: 1 }).addTo(map);
    } else {
      hoverRef.current.setLatLng(hoverCoord);
    }
  }, [hoverCoord]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-border"
      style={{ height: 200 }}
    />
  );
}

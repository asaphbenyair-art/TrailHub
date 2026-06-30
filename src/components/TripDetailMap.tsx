"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

const REGION_COORDS: Record<string, [number, number]> = {
  "גליל עליון":    [33.05, 35.50],
  "גליל תחתון":   [32.72, 35.30],
  "כרמל":         [32.73, 34.97],
  "ירושלים":      [31.77, 35.21],
  "שפלה":         [31.90, 34.85],
  "נגב":          [30.80, 34.90],
  "ערבה":         [29.50, 35.00],
  "גולן":         [33.00, 35.75],
  "עמק יזרעאל":  [32.60, 35.20],
};
const ISRAEL_CENTER: [number, number] = [31.5, 34.9];

function fixIcons() {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)["_getIconUrl"];
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

interface Props {
  region: string;
  meetingPoint?: string | null;
  waypoints?: Array<{ lat: number; lng: number; label: string }>;
  onMapClick?: (lat: number, lng: number) => void;
  height?: number;
  liveLocation?: boolean;
}

export default function TripDetailMap({
  region,
  meetingPoint,
  waypoints = [],
  onMapClick,
  height = 160,
  liveLocation = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<L.Marker[]>([]);
  const dotRef = useRef<L.CircleMarker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    fixIcons();

    const center = REGION_COORDS[region] ?? ISRAEL_CENTER;
    const zoom = REGION_COORDS[region] ? 11 : 7;

    const map = L.map(containerRef.current, { zoomControl: true });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    map.setView(center, zoom);

    // Meeting point marker (approximate region center)
    if (meetingPoint) {
      L.marker(center)
        .bindPopup(`<div dir="rtl" style="font-size:12px"><b>📍 נקודת מפגש</b><br>${meetingPoint}</div>`)
        .addTo(map)
        .openPopup();
    }

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng));
    }

    setReady(true);

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync waypoint markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = waypoints.map((wp, i) =>
      L.marker([wp.lat, wp.lng])
        .bindPopup(`<div dir="rtl" style="font-size:12px">📍 ${wp.label || `נקודה ${i + 1}`}</div>`)
        .addTo(map)
    );
  }, [waypoints, ready]);

  // Live "blue dot" of the user's own GPS position (personal only, not shared)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !liveLocation || typeof navigator === "undefined" || !navigator.geolocation) return;
    let first = true;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!dotRef.current) {
          dotRef.current = L.circleMarker([latitude, longitude], {
            radius: 8, color: "#fff", weight: 3, fillColor: "#2C5F8A", fillOpacity: 1,
          }).addTo(map).bindPopup('<div dir="rtl" style="font-size:12px">📍 המיקום שלך</div>');
        } else {
          dotRef.current.setLatLng([latitude, longitude]);
        }
        if (first) { map.setView([latitude, longitude], Math.max(map.getZoom(), 14)); first = false; }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (dotRef.current) { dotRef.current.remove(); dotRef.current = null; }
    };
  }, [liveLocation, ready]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden border border-gray-100"
      style={{ height }}
    />
  );
}

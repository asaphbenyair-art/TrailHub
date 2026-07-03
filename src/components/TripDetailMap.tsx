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
  focusWaypoint?: number | null;
  /** Coordinate to highlight with a moving marker (e.g. elevation-chart hover). */
  hoverCoord?: [number, number] | null;
}

export default function TripDetailMap({
  region,
  meetingPoint,
  waypoints = [],
  onMapClick,
  height = 160,
  liveLocation = false,
  focusWaypoint = null,
  hoverCoord = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<(L.Marker | null)[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const dotRef = useRef<L.CircleMarker | null>(null);
  const hoverRef = useRef<L.CircleMarker | null>(null);
  const wpKeyRef = useRef<string>("");
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

  // Sync waypoint markers — numbered pins along the route + connecting line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Only rebuild when the waypoint data actually changes (the parent passes a
    // fresh array each render — without this the view would reset every render).
    const key = waypoints.map((w) => `${w.lat},${w.lng},${w.label}`).join("|");
    if (key === wpKeyRef.current) return;
    wpKeyRef.current = key;

    // Clear previous markers + route line
    markerRefs.current.forEach((m) => m?.remove());
    markerRefs.current = [];
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    const hasCoord = (wp: { lat: number; lng: number }) =>
      Number.isFinite(wp.lat) && Number.isFinite(wp.lng) && (wp.lat !== 0 || wp.lng !== 0);

    const validPts: [number, number][] = [];

    // Route line connecting all valid waypoints in order
    const linePts = waypoints.filter(hasCoord).map((wp) => [wp.lat, wp.lng] as [number, number]);
    if (linePts.length >= 2) {
      routeLineRef.current = L.polyline(linePts, {
        color: "#1A6B4A", weight: 3, opacity: 0.75, dashArray: "6 8",
      }).addTo(map);
    }

    // One numbered pin per waypoint (index aligned to the list below the map)
    markerRefs.current = waypoints.map((wp, i) => {
      if (!hasCoord(wp)) return null;
      const isFirst = i === 0;
      const isLast = i === waypoints.length - 1;
      const bg = isFirst ? "#2C5F8A" : isLast ? "#C0392B" : "#1A6B4A";
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${bg};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)">${i + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      });
      validPts.push([wp.lat, wp.lng]);
      return L.marker([wp.lat, wp.lng], { icon })
        .bindPopup(`<div dir="rtl" style="font-size:12px"><b>${i + 1}. ${wp.label || `נקודה ${i + 1}`}</b></div>`)
        .addTo(map);
    });

    // Zoom the map to show all waypoints at once
    if (validPts.length >= 2) {
      map.fitBounds(L.latLngBounds(validPts), { padding: [32, 32], maxZoom: 15 });
    } else if (validPts.length === 1) {
      map.setView(validPts[0], 14);
    }
  }, [waypoints, ready]);

  // Pan/zoom to a waypoint when its card is tapped (self-guided content view)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || focusWaypoint == null) return;
    const wp = waypoints[focusWaypoint];
    if (!wp) return;
    map.setView([wp.lat, wp.lng], Math.max(map.getZoom(), 15), { animate: true });
    const marker = markerRefs.current[focusWaypoint];
    if (marker) marker.openPopup();
  }, [focusWaypoint, ready, waypoints]);

  // Moving marker driven by elevation-chart hover — follows the route position.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!hoverCoord) {
      if (hoverRef.current) { hoverRef.current.remove(); hoverRef.current = null; }
      return;
    }
    if (!hoverRef.current) {
      hoverRef.current = L.circleMarker(hoverCoord, {
        radius: 7, color: "#fff", weight: 3, fillColor: "#1A6B4A", fillOpacity: 1,
      }).addTo(map);
    } else {
      hoverRef.current.setLatLng(hoverCoord);
    }
  }, [hoverCoord, ready]);

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
      className="rounded-xl overflow-hidden border border-border"
      style={{ height }}
    />
  );
}

/**
 * Generate a GPX track (with elevation) for every trip that has waypoints but no
 * routeGpx yet, so the interactive elevation profile has real data to render.
 * The track connects the trip's waypoints in order with interpolated points and
 * a smooth, plausible elevation profile derived deterministically from the trip.
 *
 * Run:  npx tsx prisma/seed-gpx.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function hash(s: string) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }

interface WP { lat?: number; lng?: number }

function buildGpx(id: string, region: string, wps: WP[]): string | null {
  const pts = wps.filter((w): w is { lat: number; lng: number } =>
    typeof w.lat === "number" && typeof w.lng === "number" && (w.lat !== 0 || w.lng !== 0));
  if (pts.length < 2) return null;

  const seed = hash(id + region);
  const baseEle = 120 + (seed % 400);            // 120–520 m base
  const amp = 60 + (hash(region) % 140);          // undulation amplitude
  const phase = (seed % 100) / 100 * Math.PI * 2;

  const trk: string[] = [];
  let cumFrac = 0;
  const totalSegs = pts.length - 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const steps = 10;
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      const lat = a.lat + (b.lat - a.lat) * f;
      const lng = a.lng + (b.lng - a.lng) * f;
      const progress = (i + f) / totalSegs;           // 0..1 along route
      // Smooth profile: a couple of hills + a gentle overall climb-then-descend.
      const ele = baseEle
        + amp * Math.sin(progress * Math.PI * 2 + phase)
        + amp * 0.5 * Math.sin(progress * Math.PI * 5 + phase * 1.7)
        + amp * 0.4 * Math.sin(progress * Math.PI); // rise toward the middle
      trk.push(`<trkpt lat="${lat.toFixed(5)}" lon="${lng.toFixed(5)}"><ele>${ele.toFixed(1)}</ele></trkpt>`);
      cumFrac = progress;
    }
  }
  const last = pts[pts.length - 1];
  const lastEle = baseEle + amp * Math.sin(Math.PI * 2 + phase) + amp * 0.4 * Math.sin(Math.PI * cumFrac);
  trk.push(`<trkpt lat="${last.lat.toFixed(5)}" lon="${last.lng.toFixed(5)}"><ele>${lastEle.toFixed(1)}</ele></trkpt>`);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TrailHub"><trk><name>route</name><trkseg>${trk.join("")}</trkseg></trk></gpx>`;
}

async function main() {
  const trips = await prisma.trip.findMany({
    where: { OR: [{ routeGpx: null }, { routeGpx: "" }] },
    select: { id: true, region: true, waypointsJson: true },
  });

  let updated = 0;
  for (const t of trips) {
    const wps = Array.isArray(t.waypointsJson) ? (t.waypointsJson as unknown as WP[]) : [];
    const gpx = buildGpx(t.id, t.region, wps);
    if (!gpx) continue;
    await prisma.trip.update({ where: { id: t.id }, data: { routeGpx: gpx } });
    updated++;
  }
  console.log(`✅ generated GPX for ${updated} trips (of ${trips.length} without one)`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1); });

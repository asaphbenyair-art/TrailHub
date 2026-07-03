/**
 * Seed guidance audio onto self-guided trip waypoints (Round 7 item 1).
 * Uses public sample MP3s (SoundHelix) as placeholders. Picks the first few
 * self-guided trips that have waypoints and adds audio to each waypoint.
 *
 * Run:  npx tsx prisma/seed-audio.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SAMPLE = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((n - 1) % 16) + 1}.mp3`;

async function main() {
  const trips = await prisma.trip.findMany({
    where: { tripType: "SELF_GUIDED" },
    select: { id: true, title: true, waypointsJson: true },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  let songIdx = 1;
  for (const t of trips) {
    const wps = Array.isArray(t.waypointsJson) ? (t.waypointsJson as Record<string, unknown>[]) : [];
    if (wps.length < 3) continue;
    if (updated >= 4) break; // at least 3–4 trips

    const withAudio = wps.map((w, i) => ({
      ...w,
      audioUrl: SAMPLE(songIdx + i),
      audioName: `הדרכה קולית — ${String(w.name ?? `תחנה ${i + 1}`)}.mp3`,
      audioDuration: 0, // the player reads the real duration on load
    }));
    songIdx += wps.length;

    await prisma.trip.update({ where: { id: t.id }, data: { waypointsJson: withAudio } });
    console.log(`🎙  ${t.title} — audio on ${wps.length} waypoints`);
    updated++;
  }
  console.log(`✅ seeded audio on ${updated} self-guided trips`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});

/**
 * Seed 6–8 realistic waypoints onto every guided trip that lacks them.
 *
 * Each region is anchored to a real Israeli hiking area. Per trip we derive a
 * deterministic offset + heading from the trip id, then lay out a gently curving
 * polyline of 6–8 waypoints (trailhead → features → endpoint), each with a
 * Hebrew name and short description. Also sets the trip's start lat/lng.
 *
 * Run:  npx tsx prisma/seed-waypoints.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Real hiking-area anchors per region [lat, lng].
const REGION_ANCHORS: Record<string, [number, number]> = {
  "גולן": [32.94, 35.72],          // נחל יהודיה / רמת הגולן
  "גליל עליון": [33.00, 35.42],     // הר מירון / נחל כזיב
  "גליל תחתון": [32.82, 35.50],     // הר ארבל / הר תבור
  "ירושלים": [31.83, 35.30],        // עין פרת / נחל פרת
  "כרמל": [32.72, 35.02],           // נחל אורן / נחל מערות
  "נגב": [30.61, 34.80],            // מכתש רמון / עין עבדת
  "עמק יזרעאל": [32.50, 35.40],     // הר הגלבוע / עין חרוד
  "ערבה": [30.05, 35.05],           // הרי אילת / נחל שני
  "שפלה": [31.65, 34.92],           // בית גוברין / עמק האלה
};
const DEFAULT_ANCHOR: [number, number] = [31.77, 35.21];

const START = { name: "חניון ותחילת המסלול", description: "נקודת המפגש — חניה, שירותים ותדרוך קצר לפני היציאה." };
const END = { name: "סיום המסלול", description: "סוף המסלול — חניון היציאה ונקודת האיסוף." };
const FEATURES: { name: string; description: string }[] = [
  { name: "צומת שבילים", description: "פנייה לשביל המסומן — שימו לב לצבע הסימון." },
  { name: "מעיין", description: "מעיין קטן בצד המסלול, נעים לעצירה קצרה." },
  { name: "נקודת תצפית", description: "תצפית פתוחה על הנוף — עצירה מומלצת לצילום." },
  { name: "מערה", description: "מערה טבעית בצד המסלול, אפשר להיכנס בזהירות." },
  { name: "ירידה לוואדי", description: "ירידה אל תוך הערוץ — היזהרו על הסלעים החלקים." },
  { name: "חורשה מוצלת", description: "חורשת עצים — מקום טוב להפסקת מים ומנוחה." },
  { name: "שרידי עתיקות", description: "שרידים עתיקים בצד הדרך — הימנעו מפגיעה בממצאים." },
  { name: "בריכת מים", description: "בריכה טבעית — בעונה המתאימה אפשר לטבול." },
  { name: "ראש הגבעה", description: "הנקודה הגבוהה במסלול — תצפית מעגלית לכל הכיוונים." },
  { name: "חציית נחל", description: "חציית הערוץ — המשיכו בעקבות הסימון בצד השני." },
  { name: "שדה פריחה", description: "בעונה פורחים כאן פרחי בר — שמרו על הצמחייה." },
  { name: "מצוק ותצפית", description: "קצה המצוק — תצפית מרהיבה, שמרו מרחק מהקצה." },
];

// Deterministic PRNG (mulberry32) seeded from the trip id.
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildWaypoints(id: string, region: string) {
  const anchor = REGION_ANCHORS[region] ?? DEFAULT_ANCHOR;
  const rng = mulberry32(hashSeed(id));
  // Per-trip offset within the region (±~4km) so trips don't overlap.
  const oLat = anchor[0] + (rng() - 0.5) * 0.08;
  const oLng = anchor[1] + (rng() - 0.5) * 0.08;
  const count = 6 + Math.floor(rng() * 3); // 6, 7 or 8
  const angle = rng() * Math.PI * 2;        // trail heading
  const span = 0.025 + rng() * 0.02;        // ~2.7–5km end-to-end
  const wigAmp = span * (0.14 + rng() * 0.1);
  const wigFreq = 1.3 + rng() * 1.2;

  // Pick feature stops (unique) for the middle points.
  const pool = [...FEATURES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const middle = pool.slice(0, count - 2);
  const labels = [START, ...middle, END];

  const wps = labels.map((meta, i) => {
    const t = count > 1 ? i / (count - 1) : 0;
    const dLat = Math.cos(angle) * span * t;
    const dLng = Math.sin(angle) * span * t;
    const wig = Math.sin(t * Math.PI * wigFreq) * wigAmp;
    const lat = oLat + dLat + Math.cos(angle + Math.PI / 2) * wig;
    const lng = oLng + dLng + Math.sin(angle + Math.PI / 2) * wig;
    return {
      name: meta.name,
      description: meta.description,
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
    };
  });
  return wps;
}

async function main() {
  const trips = await prisma.trip.findMany({
    where: { tripType: { not: "SELF_GUIDED" } },
    select: { id: true, region: true, waypointsJson: true },
  });

  let updated = 0;
  for (const t of trips) {
    const existing = Array.isArray(t.waypointsJson) ? (t.waypointsJson as unknown[]).length : 0;
    if (existing >= 6) continue; // already has plenty
    const wps = buildWaypoints(t.id, t.region);
    await prisma.trip.update({
      where: { id: t.id },
      data: {
        waypointsJson: wps,
        latitude: wps[0].lat,
        longitude: wps[0].lng,
      },
    });
    updated++;
  }
  console.log(`✅ seeded waypoints on ${updated}/${trips.length} guided trips`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});

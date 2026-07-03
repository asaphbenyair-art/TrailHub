/**
 * Round 8 seed:
 *  - 3 new guides with illustrated DiceBear avatars (2 with a head-covering).
 *  - 8 free (price=0) published self-guided trips across regions, 6–8 waypoints each.
 *  - 3 trips per new region (אפרים ומנשה / ארץ בנימין / יהודה), guided + self-guided.
 *
 * Run:  npx tsx prisma/seed-round8.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { hikingPhoto } from "../src/lib/tripImage";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// DiceBear avataaars — same service as the existing guides. `top=hat` gives a
// head covering (closest the library offers to a kippah).
const avatar = (seed: string, headCover = false) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&facialHairProbability=100&accessoriesProbability=0${headCover ? "&top=hat" : ""}`;

const NEW_GUIDES = [
  { email: "shmuel.bar-shay@trailhub.co.il", name: "שמואל בר שי", headline: "מומחה לתלים ארכיאולוגיים באזור בית שמש", regions: ["שפלה", "ירושלים", "ארץ בנימין"], headCover: true },
  { email: "amichai.naom@trailhub.co.il", name: "עמיחי נעם", headline: "מומחה לעולם ספר המדבר", regions: ["נגב", "יהודה"], headCover: true },
  { email: "amit.mendelson@trailhub.co.il", name: "עמית מנדלסון", headline: "מטייל בכל הארץ לאורכה ולרוחבה", regions: ["גליל עליון", "כרמל", "גולן", "אפרים ומנשה"], headCover: false },
];

// Real hiking-area anchors per region [lat, lng].
const ANCHOR: Record<string, [number, number]> = {
  "גולן": [32.94, 35.72], "גליל עליון": [33.0, 35.42], "גליל תחתון": [32.82, 35.5],
  "ירושלים": [31.83, 35.3], "כרמל": [32.72, 35.02], "נגב": [30.61, 34.8],
  "עמק יזרעאל": [32.5, 35.4], "ערבה": [30.05, 35.05], "שפלה": [31.65, 34.92],
  "אפרים ומנשה": [32.15, 35.25], "ארץ בנימין": [31.9, 35.22], "יהודה": [31.55, 35.28],
};

const WP_NAMES = [
  ["חניון ותחילת המסלול", "נקודת המפגש — חניה ותדרוך קצר."],
  ["מעיין", "מעיין קטן בצד המסלול, נעים לעצירה."],
  ["נקודת תצפית", "תצפית פתוחה על הנוף — מומלץ לצילום."],
  ["מערה", "מערה טבעית בצד המסלול."],
  ["ירידה לוואדי", "ירידה אל תוך הערוץ — היזהרו על הסלעים."],
  ["חורשה מוצלת", "מקום טוב להפסקת מים ומנוחה."],
  ["שרידי עתיקות", "שרידים עתיקים בצד הדרך."],
  ["בריכת מים", "בריכה טבעית — בעונה אפשר לטבול."],
  ["סיום המסלול", "סוף המסלול — חניון היציאה."],
];

function hash(s: string) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function waypoints(seed: string, region: string, withAudio = false) {
  const base = ANCHOR[region] ?? [31.77, 35.21];
  const rng = mulberry32(hash(seed));
  const oLat = base[0] + (rng() - 0.5) * 0.08, oLng = base[1] + (rng() - 0.5) * 0.08;
  const count = 6 + Math.floor(rng() * 3); // 6–8
  const angle = rng() * Math.PI * 2, span = 0.025 + rng() * 0.02;
  const pool = [...WP_NAMES.slice(1, -1)];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const mids = pool.slice(0, count - 2);
  const seq = [WP_NAMES[0], ...mids, WP_NAMES[WP_NAMES.length - 1]];
  return seq.map(([name, description], i) => {
    const t = count > 1 ? i / (count - 1) : 0;
    const wig = Math.sin(t * Math.PI * (1.3 + rng())) * span * 0.18;
    const lat = +(oLat + Math.cos(angle) * span * t + Math.cos(angle + Math.PI / 2) * wig).toFixed(5);
    const lng = +(oLng + Math.sin(angle) * span * t + Math.sin(angle + Math.PI / 2) * wig).toFixed(5);
    return {
      name, description, lat, lng,
      ...(withAudio ? {
        navInstructions: "המשיכו בשביל המסומן.",
        guidance: description,
        audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 16) + 1}.mp3`,
        audioName: `הדרכה קולית — ${name}.mp3`,
        audioDuration: 0,
      } : {}),
    };
  });
}

async function main() {
  const password = await bcrypt.hash("Trail2027!", 12);

  // 1) New guides
  const guideIdByRegion: Record<string, string[]> = {};
  const allNewGuideIds: string[] = [];
  for (const g of NEW_GUIDES) {
    const user = await prisma.user.upsert({
      where: { email: g.email },
      update: { name: g.name, image: avatar(g.email, g.headCover), role: "GUIDE", password, gender: "זכר" },
      create: { name: g.name, email: g.email, password, role: "GUIDE", image: avatar(g.email, g.headCover), gender: "זכר" },
    });
    const data = { headline: g.headline, bio: g.headline, specialtyRegions: g.regions, isVerified: true };
    const guide = await prisma.guide.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
    allNewGuideIds.push(guide.id);
    for (const r of g.regions) (guideIdByRegion[r] ??= []).push(guide.id);
    console.log(`✓ guide ${g.name}`);
  }

  // A pool of all guides for assignment.
  const allGuides = await prisma.guide.findMany({ select: { id: true, specialtyRegions: true } });
  const pickGuide = (region: string, i: number) => {
    const inRegion = guideIdByRegion[region] ?? allGuides.filter((g) => g.specialtyRegions.includes(region)).map((g) => g.id);
    const pool = inRegion.length ? inRegion : allGuides.map((g) => g.id);
    return pool[i % pool.length];
  };

  let created = 0;
  async function makeTrip(opts: { title: string; region: string; selfGuided: boolean; free: boolean; i: number }) {
    const { title, region, selfGuided, free, i } = opts;
    const guideId = pickGuide(region, i);
    const seed = `${title}-${region}`;
    await prisma.trip.create({
      data: {
        title, region,
        description: `${title} — מסלול מודרך באזור ${region}.`,
        difficulty: (["EASY", "MEDIUM", "HARD"] as const)[i % 3],
        status: "OPEN", visibility: "PUBLIC",
        date: new Date(Date.now() + (7 + i) * 86400000),
        startTime: "08:00",
        durationMin: 240 + (i % 4) * 30,
        distanceKm: 8 + (i % 6),
        price: free ? 0 : 120 + (i % 5) * 20,
        maxSpots: selfGuided ? 0 : 20,
        unlimitedCapacity: selfGuided,
        accessWindowDays: selfGuided ? 90 : null,
        tripType: selfGuided ? "SELF_GUIDED" : "DAY_HIKE",
        images: [hikingPhoto(seed, 0, { region, title })],
        guideId,
        attributeTags: [],
        waypointsJson: waypoints(seed, region, selfGuided),
      },
    });
    created++;
  }

  // 2) 8 free self-guided trips across regions
  const FREE_REGIONS = ["נגב", "גליל עליון", "כרמל", "ירושלים", "גולן", "שפלה", "ערבה", "עמק יזרעאל"];
  const FREE_TITLES = [
    "טיול עצמאי חינם — מכתש רמון", "טיול עצמאי חינם — נחל עמוד", "טיול עצמאי חינם — נחל אורן",
    "טיול עצמאי חינם — עין פרת", "טיול עצמאי חינם — נחל יהודיה", "טיול עצמאי חינם — מערות בית גוברין",
    "טיול עצמאי חינם — נחל שני", "טיול עצמאי חינם — הר הגלבוע",
  ];
  for (let i = 0; i < FREE_REGIONS.length; i++) {
    await makeTrip({ title: FREE_TITLES[i], region: FREE_REGIONS[i], selfGuided: true, free: true, i });
  }

  // 3) New-region trips (guided + self-guided), 3 each
  const NEW_REGIONS: [string, string[]][] = [
    ["אפרים ומנשה", ["סובב כרמי צור", "מעיינות השומרון", "רכס עיבל וגריזים"]],
    ["ארץ בנימין", ["נחל פרת התחתון", "מעלה מכמש", "סובב מצפה"]],
    ["יהודה", ["מדבר יהודה — נחל דרגות", "מצדה מהשביל", "עין גדי הנסתר"]],
  ];
  for (const [region, titles] of NEW_REGIONS) {
    for (let i = 0; i < titles.length; i++) {
      const selfGuided = i === titles.length - 1; // last one self-guided
      await makeTrip({ title: titles[i], region, selfGuided, free: selfGuided, i });
    }
  }

  console.log(`✅ created ${created} trips (8 free self-guided + ${NEW_REGIONS.length * 3} new-region)`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1); });

/**
 * Rich self-guided trip seed: 15 diverse trips across regions, lengths and
 * difficulties, each with a REALISTIC generated GPX track (region-accurate
 * coordinates, elevation tags, and a logical shape — linear / loop / out-and-
 * back), 6–8 waypoints with guidance, some with audio, and a free/paid mix.
 *
 * Run:  npx tsx prisma/seed-selfguided.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { hikingPhoto } from "../src/lib/tripImage";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ── deterministic PRNG ──
function hash(s: string) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Real hiking-area anchors [lat, lng] + a plausible base elevation (m).
const REGION: Record<string, { anchor: [number, number]; baseEle: number }> = {
  "נגב": { anchor: [30.61, 34.80], baseEle: 480 },
  "גליל עליון": { anchor: [33.02, 35.42], baseEle: 500 },
  "גליל תחתון": { anchor: [32.82, 35.42], baseEle: 300 },
  "כרמל": { anchor: [32.72, 35.03], baseEle: 320 },
  "גולן": { anchor: [32.94, 35.72], baseEle: 620 },
  "ירושלים": { anchor: [31.78, 35.15], baseEle: 720 },
  "ים המלח": { anchor: [31.45, 35.38], baseEle: -180 },
  "שפלה": { anchor: [31.65, 34.92], baseEle: 260 },
  "אפרים ומנשה": { anchor: [32.15, 35.25], baseEle: 480 },
  "ארץ בנימין": { anchor: [31.90, 35.22], baseEle: 640 },
  "יהודה": { anchor: [31.55, 35.28], baseEle: 380 },
};

type Shape = "linear" | "loop" | "out_back";

interface Pt { lat: number; lng: number; ele: number }

/** Generate a realistic track of a target length (km) with a given shape. */
function genTrack(seed: string, region: string, lengthKm: number, shape: Shape, eleAmp: number): Pt[] {
  const { anchor, baseEle } = REGION[region] ?? { anchor: [31.7, 35.1] as [number, number], baseEle: 400 };
  const rng = mulberry32(hash(seed));
  const oLat = anchor[0] + (rng() - 0.5) * 0.05;
  const oLng = anchor[1] + (rng() - 0.5) * 0.05;
  const kmToLat = 1 / 111;
  const kmToLng = 1 / (111 * Math.cos((oLat * Math.PI) / 180));
  const phase = rng() * Math.PI * 2;

  const eleAt = (t: number) =>
    baseEle
    + eleAmp * Math.sin(t * Math.PI * 2 + phase)
    + eleAmp * 0.4 * Math.sin(t * Math.PI * 5 + phase * 1.3)
    + eleAmp * 0.5 * Math.sin(t * Math.PI); // gentle rise toward the middle

  const pts: Pt[] = [];

  if (shape === "loop") {
    const n = Math.max(40, Math.round(lengthKm * 9));
    const radiusKm = lengthKm / (2 * Math.PI);
    const start = rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const ang = start + t * Math.PI * 2;
      const wob = 1 + Math.sin(t * Math.PI * 6 + phase) * 0.12;
      const lat = oLat + Math.cos(ang) * radiusKm * kmToLat * wob;
      const lng = oLng + Math.sin(ang) * radiusKm * kmToLng * wob;
      pts.push({ lat: +lat.toFixed(5), lng: +lng.toFixed(5), ele: +eleAt(t).toFixed(1) });
    }
    return pts;
  }

  // Build an outbound wandering path; out_back retraces it.
  const outKm = shape === "out_back" ? lengthKm / 2 : lengthKm;
  const nOut = Math.max(25, Math.round(outKm * 11));
  let lat = oLat, lng = oLng;
  let heading = rng() * Math.PI * 2;
  const stepKm = outKm / nOut;
  const out: Pt[] = [];
  for (let i = 0; i < nOut; i++) {
    const t = i / (nOut - 1);
    heading += (rng() - 0.5) * 0.6; // meander
    lat += Math.cos(heading) * stepKm * kmToLat;
    lng += Math.sin(heading) * stepKm * kmToLng;
    out.push({ lat: +lat.toFixed(5), lng: +lng.toFixed(5), ele: +eleAt(t).toFixed(1) });
  }
  if (shape === "linear") return out;
  // out_back: append the reverse (retrace), elevations mirror back down.
  const back = out.slice(0, -1).reverse().map((p, i) => ({ ...p, ele: +eleAt(1 - (i + 1) / (2 * nOut)).toFixed(1) }));
  return [...out, ...back];
}

function toGpx(pts: Pt[]): string {
  const body = pts.map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}"><ele>${p.ele}</ele></trkpt>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TrailHub"><trk><name>route</name><trkseg>${body}</trkseg></trk></gpx>`;
}

// Waypoint content pool.
const WP_POOL: [string, string, string][] = [
  ["חניון ותחילת המסלול", "נקודת המפגש — חניה חופשית, שירותים ותדריך קצר לפני היציאה.", "התארגנו, מלאו מים ובדקו שהנעליים קשורות היטב לפני היציאה."],
  ["מעיין נסתר", "מעיין קטן זורם בצל עצי שיזף — מקום נעים לעצירה ולמילוי מים.", "אפשר להשלים מים, אך אל תסתמכו על המעיין בקיץ — לעיתים הוא דל."],
  ["נקודת תצפית", "תצפית פתוחה על הנוף — ביום בהיר רואים עד האופק. מומלץ לצילום.", "עצרו כאן לנשום ולצלם. בקצה יש מדרון תלול — היזהרו."],
  ["מערה קרירה", "מערה טבעית בצד המסלול, קרירה ונעימה גם בשיא הקיץ.", "הכניסה נמוכה — התכופפו. פנס עוזר לראות את פנים המערה."],
  ["ירידה לערוץ", "ירידה תלולה אל תוך הנחל בין סלעים גדולים.", "רדו לאט ובזהירות — הסלעים חלקים, במיוחד אחרי גשם."],
  ["חורשת אלונים", "חורשה מוצלת של אלוני התבור — מקום מצוין להפסקת מנוחה.", "מקום אידיאלי לפיקניק ולמנוחה בצל לפני המשך הדרך."],
  ["שרידי ח׳רבה", "שרידי יישוב קדום — קירות אבן, בורות מים חצובים וגת עתיקה.", "הקפידו לא לטפס על הקירות העתיקים; הם שבירים."],
  ["בריכה טבעית", "בריכת מים צלולה — בעונה אפשר לטבול ולהתרענן.", "בדקו את עומק המים לפני כניסה ואל תקפצו פנימה."],
  ["פסגת ההר", "הנקודה הגבוהה במסלול — תצפית מעגלית מרהיבה לכל הכיוונים.", "בפסגה נושבת רוח קרירה — כדאי שכבה נוספת בחורף."],
  ["גשר הערוץ", "מעבר על גשר מעל הערוץ, עם נוף יפה של הנחל למטה.", "עברו אחד־אחד על הגשר ואל תעצרו במרכזו."],
  ["סיום המסלול", "סוף המסלול — חניון היציאה. מקווים שנהניתם!", "בדקו שלא שכחתם ציוד, ושתו מים לפני הנסיעה."],
];

const MARKERS = ["אדום", "כחול", "ירוק", "שחור"];

function makeWaypoints(seed: string, pts: Pt[], count: number, withAudio: boolean) {
  const rng = mulberry32(hash(seed + "wp"));
  const mids = WP_POOL.slice(1, -1);
  // shuffle middles
  for (let i = mids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [mids[i], mids[j]] = [mids[j], mids[i]]; }
  const chosen = [WP_POOL[0], ...mids.slice(0, count - 2), WP_POOL[WP_POOL.length - 1]];
  const marker = MARKERS[Math.floor(rng() * MARKERS.length)];

  return chosen.map(([name, description, guidance], i) => {
    const t = count > 1 ? i / (count - 1) : 0;
    const p = pts[Math.min(Math.round(t * (pts.length - 1)), pts.length - 1)];
    const dist = 150 + Math.floor(rng() * 700);
    const isLast = i === count - 1;
    const wp: Record<string, unknown> = {
      lat: p.lat, lng: p.lng, name, description, guidance,
      navInstructions: i === 0
        ? `צאו מהחניון והמשיכו בשביל המסומן ${marker}.`
        : isLast
        ? `עוד כ-${dist} מ׳ בשביל ה${marker} עד לחניון היציאה.`
        : `המשיכו בשביל ה${marker} כ-${dist} מ׳ עד ל${name}.`,
    };
    // A safety note on the steeper/edge points.
    if (/ירידה|פסגה|תצפית|גשר/.test(name)) wp.safety = guidance;
    if (withAudio && i > 0 && i % 2 === 1) {
      wp.audioUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 16) + 1}.mp3`;
      wp.audioName = `הדרכה קולית — ${name}.mp3`;
      wp.audioDuration = 0;
    }
    return wp;
  });
}

// ── The 15 trips ──
interface TripDef {
  title: string; region: string; lengthKm: number; shape: Shape; difficulty: "EASY" | "MEDIUM" | "HARD" | "EXTREME";
  price: number; wp: number; audio: boolean; eleAmp: number; access: number; desc: string;
}

const TRIPS: TripDef[] = [
  // ── Short: 3–6 km (4) ──
  { title: "עצמאי — סובב עין חנון", region: "שפלה", lengthKm: 3.5, shape: "loop", difficulty: "EASY", price: 0, wp: 6, audio: false, eleAmp: 25, access: 365, desc: "מסלול מעגלי קצר וקליל בין מעיינות השפלה — מושלם למשפחות ולבוקר רגוע." },
  { title: "עצמאי — מעיינות עמק חרוד", region: "גליל תחתון", lengthKm: 5, shape: "out_back", difficulty: "EASY", price: 35, wp: 6, audio: true, eleAmp: 30, access: 180, desc: "הלוך-חזור נעים לאורך מעיינות קרירים, עם בריכות טבילה בעונה." },
  { title: "עצמאי — יער ירושלים הקטן", region: "ירושלים", lengthKm: 4.2, shape: "loop", difficulty: "EASY", price: 0, wp: 7, audio: false, eleAmp: 60, access: 365, desc: "טבעת יער מוצלת סביב ירושלים, עם תצפיות אל ההרים ואתרים היסטוריים." },
  { title: "עצמאי — חוף אכזיב הצפוני", region: "כרמל", lengthKm: 6, shape: "linear", difficulty: "EASY", price: 25, wp: 6, audio: false, eleAmp: 20, access: 90, desc: "מסלול חופי לינארי עם מפרצונים, סלעי כורכר ונוף ים פתוח." },

  // ── Medium: 8–15 km (6) ──
  { title: "עצמאי — נחל עמוד העליון", region: "גליל עליון", lengthKm: 9, shape: "linear", difficulty: "MEDIUM", price: 45, wp: 7, audio: true, eleAmp: 160, access: 180, desc: "ירידה יפהפייה בנחל עמוד — מעיינות, טחנות קמח עתיקות וצמחייה עשירה." },
  { title: "עצמאי — רכס הכרמל והמערות", region: "כרמל", lengthKm: 11, shape: "loop", difficulty: "MEDIUM", price: 0, wp: 8, audio: false, eleAmp: 220, access: 365, desc: "מסלול מעגלי ברכס הכרמל בין חורש ים-תיכוני, מערות פרהיסטוריות ותצפיות." },
  { title: "עצמאי — נחל יהודייה", region: "גולן", lengthKm: 8.5, shape: "out_back", difficulty: "MEDIUM", price: 55, wp: 7, audio: true, eleAmp: 180, access: 180, desc: "אחד ממסלולי המים היפים בגולן — מפלים, בריכות קפיצה ובזלת שחורה." },
  { title: "עצמאי — מעלה מכמש", region: "ארץ בנימין", lengthKm: 12, shape: "linear", difficulty: "MEDIUM", price: 40, wp: 7, audio: false, eleAmp: 260, access: 365, desc: "מסלול היסטורי במורדות ארץ בנימין, עם ערוצים דרמטיים ואתרי מקרא." },
  { title: "עצמאי — סובב הר תבור", region: "גליל תחתון", lengthKm: 14, shape: "loop", difficulty: "MEDIUM", price: 0, wp: 8, audio: false, eleAmp: 300, access: 365, desc: "הקפת הר תבור המעוגל, עם עלייה מתונה לפסגה ותצפית 360 מעלות." },
  { title: "עצמאי — נחל פרת התחתון", region: "ארץ בנימין", lengthKm: 10, shape: "out_back", difficulty: "MEDIUM", price: 50, wp: 7, audio: false, eleAmp: 200, access: 180, desc: "מדבר ומים בערוץ פרת — מעיינות זורמים כל השנה בלב מדבר יהודה." },

  // ── Long: 18–35 km (5) ──
  { title: "עצמאי — מכתש רמון מקצה לקצה", region: "נגב", lengthKm: 22, shape: "linear", difficulty: "HARD", price: 75, wp: 8, audio: true, eleAmp: 380, access: 365, desc: "חציית המכתש הגדול — נופים גיאולוגיים נדירים, גבעות פחם וצבעים. מסלול ארוך ומאתגר." },
  { title: "עצמאי — שביל הגולן: גמלא–דליות", region: "גולן", lengthKm: 19, shape: "linear", difficulty: "HARD", price: 65, wp: 8, audio: false, eleAmp: 420, access: 365, desc: "מקטע ארוך בשביל הגולן, בין מפלים, שמורות טבע ותצפיות אל הכנרת." },
  { title: "עצמאי — הר הנגב הגבוה", region: "נגב", lengthKm: 28, shape: "loop", difficulty: "EXTREME", price: 90, wp: 8, audio: false, eleAmp: 520, access: 365, desc: "מסלול טבעתי תובעני בהר הנגב — פסגות, מצוקים ומדבר עוצר נשימה. למנוסים בלבד." },
  { title: "עצמאי — מדבר יהודה אל ים המלח", region: "ים המלח", lengthKm: 24, shape: "linear", difficulty: "HARD", price: 70, wp: 8, audio: true, eleAmp: 600, access: 365, desc: "ירידה דרמטית ממדבר יהודה אל מפלס ים המלח — נחלים, מפלים יבשים וירידת גובה חדה." },
  { title: "עצמאי — רכס עיבל וגריזים", region: "אפרים ומנשה", lengthKm: 33, shape: "loop", difficulty: "EXTREME", price: 85, wp: 8, audio: false, eleAmp: 560, access: 365, desc: "מסלול ארוך ומפרך בין שני ההרים ההיסטוריים, עם עליות תלולות ותצפיות רחבות. אתגר ליום שלם." },
];

async function main() {
  const guides = await prisma.guide.findMany({ select: { id: true, specialtyRegions: true } });
  if (guides.length === 0) { console.error("No guides found — seed guides first."); process.exit(1); }
  const pickGuide = (region: string, i: number) => {
    const inRegion = guides.filter((g) => g.specialtyRegions.includes(region));
    const pool = inRegion.length ? inRegion : guides;
    return pool[i % pool.length].id;
  };

  let created = 0;
  for (let i = 0; i < TRIPS.length; i++) {
    const t = TRIPS[i];
    const seed = `${t.title}-${t.region}`;
    const shape = t.shape;
    const track = genTrack(seed, t.region, t.lengthKm, shape, t.eleAmp);
    const waypoints = makeWaypoints(seed, track, t.wp, t.audio);

    await prisma.trip.create({
      data: {
        title: t.title,
        region: t.region,
        description: `${t.desc} · אורך ${t.lengthKm} ק"מ · צורת מסלול: ${shape === "loop" ? "מעגלי" : shape === "out_back" ? "הלוך-חזור" : "קווי"}.`,
        difficulty: t.difficulty,
        status: "OPEN",
        visibility: "PUBLIC",
        date: new Date(Date.now() + (7 + i) * 86400000),
        startTime: "07:00",
        durationMin: Math.round(t.lengthKm * 18),
        distanceKm: t.lengthKm,
        price: t.price,
        maxSpots: 0,
        unlimitedCapacity: true,
        accessWindowDays: t.access,
        tripType: "SELF_GUIDED",
        images: [hikingPhoto(seed, 0, { region: t.region, title: t.title })],
        guideId: pickGuide(t.region, i),
        attributeTags: [],
        routeGpx: toGpx(track),
        waypointsJson: waypoints as unknown as Prisma.InputJsonValue,
        whatToBring: "מים (2-3 ליטר), כובע, נעליים סגורות, חטיפים, קרם הגנה",
        sourceMaterialsVisibility: "preview",
      },
    });
    created++;
    console.log(`✓ ${t.title} — ${t.lengthKm}km ${shape} ${t.difficulty} ${t.price === 0 ? "חינם" : "₪" + t.price}${t.audio ? " 🔊" : ""} (${track.length} pts)`);
  }

  console.log(`✅ created ${created} self-guided trips`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1); });

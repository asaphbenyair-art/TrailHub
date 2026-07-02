import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Verified Unsplash portrait photo IDs (each returns 200) — one unique per guide.
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&q=80`;

// The 12 canonical guides — the ONLY guides that should exist on the platform.
const GUIDES = [
  { email: "doodu.katzin@trailhub.co.il", name: "דודו קצין",
    bio: "בוגר אוניברסיטת חיפה, גיאוגרפיה ולימודי ארץ ישראל. מורה דרך מטעם משרד התיירות. יותר מ-40 שנה בחברה להגנת הטבע.",
    headline: "מורה דרך מטעם משרד התיירות", location: "חיפה", yearsActive: 40,
    trainingInstitution: "אוניברסיטת חיפה", specialtyRegions: ["כרמל", "גליל עליון"], photoId: "1500648767791-00dcc994a43e" },
  { email: "sara.rotenberg@trailhub.co.il", name: "שרה רוטנברג",
    bio: "מדריכה 40 שנה, בוגרת גיאוגרפיה וארכיאולוגיה באוניברסיטת חיפה.",
    headline: "גיאוגרפיה וארכיאולוגיה", location: "חיפה", yearsActive: 40,
    trainingInstitution: "אוניברסיטת חיפה", specialtyRegions: ["גליל תחתון", "עמק יזרעאל"], photoId: "1494790108377-be9c29b29330" },
  { email: "tsahi.globin@trailhub.co.il", name: "צחי גלובין",
    bio: "מדריך שביל ישראל, מתמחה בטיולי שטח ואתגר.",
    headline: "מדריך שביל ישראל · טיולי שטח ואתגר", location: "מצפה רמון", yearsActive: 20,
    trainingInstitution: null, specialtyRegions: ["נגב", "ערבה"], photoId: "1519085360753-af0119f7cbe7" },
  { email: "gilad.talem@trailhub.co.il", name: "גלעד תלם",
    bio: "מדריך טבע ועתיקות, גדל בבתי ספר שדה חרמון ועין גדי.",
    headline: "מדריך טבע ועתיקות", location: "קצרין", yearsActive: 25,
    trainingInstitution: "בית ספר שדה חרמון", specialtyRegions: ["גולן", "ערבה"], photoId: "1502823403499-6ccfcf4fb453" },
  { email: "yonatan.meyrav@trailhub.co.il", name: "יהונתן מירב",
    bio: "מדריך הצפרות המנוסה ביותר בישראל.",
    headline: "מדריך צפרות מנוסה", location: "כפר רופין", yearsActive: 30,
    trainingInstitution: null, specialtyRegions: ["עמק יזרעאל", "שפלה"], photoId: "1506794778202-cad84cf45f1d" },
  { email: "dr.yosi.paz@trailhub.co.il", name: 'ד"ר יוסי פז',
    bio: "ארכיאולוג ומוסיקאי, מדריך טיולים מוסיקליים.",
    headline: "ארכיאולוג ומוסיקאי · טיולים מוסיקליים", location: "ירושלים", yearsActive: 20,
    trainingInstitution: "דוקטורט בארכיאולוגיה", specialtyRegions: ["ירושלים", "שפלה"], photoId: "1544005313-94ddf0286df2" },
  { email: "chen.katz@trailhub.co.il", name: "חן כץ",
    bio: "מדריך עם ידע עצום, ניהל בתי ספר שדה חצבה ובאר שבע.",
    headline: "ניהל בתי ספר שדה חצבה ובאר שבע", location: "באר שבע", yearsActive: 25,
    trainingInstitution: null, specialtyRegions: ["נגב", "ערבה"], photoId: "1633332755192-727a05c4013d" },
  { email: "omer.shapira@trailhub.co.il", name: "עומר שפירא",
    bio: "מורה דרך 25 שנה, איש המדבר, מרכז טיולי מבוגרים בחברה להגנת הטבע.",
    headline: "מורה דרך · איש המדבר · טיולי מבוגרים", location: "שדה בוקר", yearsActive: 25,
    trainingInstitution: "החברה להגנת הטבע", specialtyRegions: ["נגב"], photoId: "1607990281513-2c110a25bd8c" },
  { email: "menachem.marcus@trailhub.co.il", name: "מנחם מרקוס",
    bio: "מומחה לסיורים גיאולוגיים — מבנה הארץ, מכתשים, סלעים ותצורות נוף. מדריך טיולים בעקבות הגיאולוגיה של ישראל.",
    headline: "מומחה לסיורים גיאולוגיים", location: "מצפה רמון", yearsActive: 30,
    trainingInstitution: null, specialtyRegions: ["נגב", "ערבה"], photoId: "1492562080023-ab3db95bfbce" },
  { email: "shai.beitner@trailhub.co.il", name: "שי בייטנר",
    bio: "מומחה לאזור ים המלח — מדבר יהודה, מצדה, עין גדי והבקע. מדריך טיולים במקום הנמוך בעולם.",
    headline: "מומחה לאזור ים המלח", location: "עין גדי", yearsActive: 25,
    trainingInstitution: null, specialtyRegions: ["ערבה", "ירושלים"], photoId: "1557862921-37829c790f19" },
  { email: "yosi.shpanyer@trailhub.co.il", name: "יוסי שפנייר",
    bio: "מומחה לסיורים בעקבות התנ״ך — טיולים המשלבים מקורות, גיאוגרפיה מקראית וההיסטוריה של ארץ ישראל.",
    headline: "מומחה לסיורים בעקבות התנ״ך", location: "ירושלים", yearsActive: 30,
    trainingInstitution: null, specialtyRegions: ["ירושלים", "שפלה"], photoId: "1472099645785-5658abf4ff4e" },
  { email: "efrat.afarsemon@trailhub.co.il", name: "אפרת",
    bio: "מדריכה בעקבות האפרסמון — הצמח האגדי של עין גדי וים המלח, בשמים, היסטוריה ונוף מדברי.",
    headline: "סיורים בעקבות האפרסמון", location: "עין גדי", yearsActive: 20,
    trainingInstitution: null, specialtyRegions: ["ערבה", "שפלה"], photoId: "1438761681033-6461ffad8d80" },
];

const TWELVE = new Set(GUIDES.map((g) => g.email));

async function main() {
  const password = await bcrypt.hash("Trail2027!", 12);

  // 1) Upsert the 12 guides.
  for (const g of GUIDES) {
    const user = await prisma.user.upsert({
      where: { email: g.email },
      update: { name: g.name, image: photo(g.photoId), role: "GUIDE", password },
      create: { name: g.name, email: g.email, password, role: "GUIDE", image: photo(g.photoId) },
    });
    const data = {
      bio: g.bio, headline: g.headline, location: g.location, yearsActive: g.yearsActive,
      trainingInstitution: g.trainingInstitution ?? undefined, specialtyRegions: g.specialtyRegions, isVerified: true,
    };
    await prisma.guide.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
  }
  console.log(`✓ upserted ${GUIDES.length} guides`);

  // 2) Resolve Guide.id + regions for the 12.
  const users = await prisma.user.findMany({
    where: { email: { in: [...TWELVE] } },
    select: { email: true, name: true, guide: { select: { id: true } } },
  });
  const twelve = users.filter((u) => u.guide).map((u) => ({
    email: u.email!, name: u.name!, guideId: u.guide!.id,
    regions: GUIDES.find((g) => g.email === u.email)!.specialtyRegions,
  }));

  // 3) Reassign EVERY trip to one of the 12 — thematic by region, balanced by load.
  const trips = await prisma.trip.findMany({ select: { id: true, region: true }, orderBy: { id: "asc" } });
  const counts: Record<string, number> = Object.fromEntries(twelve.map((g) => [g.guideId, 0]));
  for (const trip of trips) {
    const candidates = twelve.filter((g) => g.regions.includes(trip.region));
    const poolG = candidates.length ? candidates : twelve;
    poolG.sort((a, b) => counts[a.guideId] - counts[b.guideId]);
    const pick = poolG[0];
    await prisma.trip.update({ where: { id: trip.id }, data: { guideId: pick.guideId } });
    counts[pick.guideId]++;
  }
  console.log(`✓ reassigned ${trips.length} trips`);

  // 4) Remove every OTHER guide account (safe now — their trips were reassigned,
  //    so no trip is cascade-deleted). Fall back to demotion if a hard delete
  //    is blocked by other references (e.g. reviews/registrations they authored).
  const others = await prisma.guide.findMany({
    where: { user: { email: { notIn: [...TWELVE] } } },
    select: { id: true, userId: true, user: { select: { email: true, name: true } } },
  });
  let deleted = 0, demoted = 0;
  for (const o of others) {
    try {
      await prisma.user.delete({ where: { id: o.userId } });
      deleted++;
    } catch {
      await prisma.guide.delete({ where: { id: o.id } });
      await prisma.user.update({ where: { id: o.userId }, data: { role: "USER" } });
      demoted++;
    }
  }
  console.log(`✓ removed ${others.length} other guides (${deleted} deleted, ${demoted} demoted)`);

  // 5) Report distribution.
  console.log(`\nDistribution across the 12 guides:`);
  for (const g of twelve) console.log(`  ${g.name}: ${counts[g.guideId]} trips  [${g.regions.join(", ")}]`);
  const remaining = await prisma.guide.count();
  console.log(`\nTotal guides on platform now: ${remaining} (expected 12). Password: Trail2027!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

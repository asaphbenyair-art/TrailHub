import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Verified Unsplash portrait photo IDs (each returns 200) — one per guide.
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&q=80`;

const GUIDES = [
  {
    email: "doodu.katzin@trailhub.co.il", name: "דודו קצין",
    bio: "בוגר אוניברסיטת חיפה, גיאוגרפיה ולימודי ארץ ישראל. מורה דרך מטעם משרד התיירות. יותר מ-40 שנה בחברה להגנת הטבע.",
    headline: "מורה דרך מטעם משרד התיירות", location: "חיפה", yearsActive: 40,
    trainingInstitution: "אוניברסיטת חיפה", specialtyRegions: ["כרמל", "גליל עליון"],
    photoId: "1500648767791-00dcc994a43e",
  },
  {
    email: "sara.rotenberg@trailhub.co.il", name: "שרה רוטנברג",
    bio: "מדריכה 40 שנה, בוגרת גיאוגרפיה וארכיאולוגיה באוניברסיטת חיפה.",
    headline: "גיאוגרפיה וארכיאולוגיה", location: "חיפה", yearsActive: 40,
    trainingInstitution: "אוניברסיטת חיפה", specialtyRegions: ["גליל תחתון", "עמק יזרעאל"],
    photoId: "1507003211169-0a1dd7228f2d",
  },
  {
    email: "tsahi.globin@trailhub.co.il", name: "צחי גלובין",
    bio: "מדריך שביל ישראל, מתמחה בטיולי שטח ואתגר.",
    headline: "מדריך שביל ישראל · טיולי שטח ואתגר", location: "מצפה רמון", yearsActive: 20,
    trainingInstitution: null, specialtyRegions: ["נגב", "ערבה"],
    photoId: "1519085360753-af0119f7cbe7",
  },
  {
    email: "gilad.talem@trailhub.co.il", name: "גלעד תלם",
    bio: "מדריך טבע ועתיקות, גדל בבתי ספר שדה חרמון ועין גדי.",
    headline: "מדריך טבע ועתיקות", location: "קצרין", yearsActive: 25,
    trainingInstitution: "בית ספר שדה חרמון", specialtyRegions: ["גולן", "ערבה"],
    photoId: "1502823403499-6ccfcf4fb453",
  },
  {
    email: "yonatan.meyrav@trailhub.co.il", name: "יהונתן מירב",
    bio: "מדריך הצפרות המנוסה ביותר בישראל.",
    headline: "מדריך צפרות מנוסה", location: "כפר רופין", yearsActive: 30,
    trainingInstitution: null, specialtyRegions: ["עמק יזרעאל", "שפלה"],
    photoId: "1506794778202-cad84cf45f1d",
  },
  {
    email: "dr.yosi.paz@trailhub.co.il", name: 'ד"ר יוסי פז',
    bio: "ארכיאולוג ומוסיקאי, מדריך טיולים מוסיקליים.",
    headline: "ארכיאולוג ומוסיקאי · טיולים מוסיקליים", location: "ירושלים", yearsActive: 20,
    trainingInstitution: "דוקטורט בארכיאולוגיה", specialtyRegions: ["ירושלים", "שפלה"],
    photoId: "1544005313-94ddf0286df2",
  },
  {
    email: "chen.katz@trailhub.co.il", name: "חן כץ",
    bio: "מדריך עם ידע עצום, ניהל בתי ספר שדה חצבה ובאר שבע.",
    headline: "ניהל בתי ספר שדה חצבה ובאר שבע", location: "באר שבע", yearsActive: 25,
    trainingInstitution: null, specialtyRegions: ["נגב", "ערבה"],
    photoId: "1633332755192-727a05c4013d",
  },
  {
    email: "omer.shapira@trailhub.co.il", name: "עומר שפירא",
    bio: "מורה דרך 25 שנה, איש המדבר, מרכז טיולי מבוגרים בחברה להגנת הטבע.",
    headline: "מורה דרך · איש המדבר · טיולי מבוגרים", location: "שדה בוקר", yearsActive: 25,
    trainingInstitution: "החברה להגנת הטבע", specialtyRegions: ["נגב"],
    photoId: "1607990281513-2c110a25bd8c",
  },
];

async function main() {
  const password = await bcrypt.hash("Trail2027!", 12);

  for (const g of GUIDES) {
    const image = photo(g.photoId);
    const user = await prisma.user.upsert({
      where: { email: g.email },
      update: { name: g.name, image, role: "GUIDE", password },
      create: { name: g.name, email: g.email, password, role: "GUIDE", image },
    });

    const guideData = {
      bio: g.bio,
      headline: g.headline,
      location: g.location,
      yearsActive: g.yearsActive,
      trainingInstitution: g.trainingInstitution ?? undefined,
      specialtyRegions: g.specialtyRegions,
      isVerified: true,
    };

    await prisma.guide.upsert({
      where: { userId: user.id },
      update: guideData,
      create: { userId: user.id, ...guideData },
    });

    console.log(`✓ ${g.name} <${g.email}>`);
  }

  console.log(`\nDone — ${GUIDES.length} guide accounts ready. Password: Trail2027!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

/**
 * Comprehensive QA seed — ~100 trip instances across every edge-case category.
 * Run: npx tsx prisma/seed-qa.ts
 *
 * Idempotent: wipes all trip-related content first, then rebuilds.
 * Prints account credentials + a scenario→tripId index at the end.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ── Dates ────────────────────────────────────────────────────────────────────
const TODAY = new Date("2026-06-30T00:00:00.000Z");
const addDays = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
const atTime = (d: Date, t: string) => { const [h, m] = t.split(":").map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
// Evenly spread upcoming dates across the next ~2 months (no later than Aug 31)
const upcomingOffsets: number[] = [];
for (let day = 1; day <= 61 && upcomingOffsets.length < 110; day++) { upcomingOffsets.push(day); if (day % 2 === 0) upcomingOffsets.push(day); }
let dateCursor = 0;
const nextUpcoming = (time = "07:00") => atTime(addDays(TODAY, upcomingOffsets[(dateCursor++) % upcomingOffsets.length]), time);

// ── Content pools (realistic Hebrew) ─────────────────────────────────────────
const IMAGES = fs.readdirSync(path.join(process.cwd(), "public", "uploads"))
  .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).map((f) => `/uploads/${f}`);
let imgCursor = 0;
const someImages = (n = 2) => IMAGES.length ? Array.from({ length: Math.min(n, IMAGES.length) }, () => IMAGES[(imgCursor++) % IMAGES.length]) : [];

const REGIONS = ["גליל עליון", "גליל תחתון", "כרמל", "ירושלים", "שפלה", "נגב", "ערבה", "גולן", "עמק יזרעאל"];
const DIFFS = ["EASY", "MEDIUM", "HARD", "EXTREME"] as const;
const REGION_ROUTES: Record<string, string[]> = {
  "גליל עליון": ["נחל כזיב", "הר מירון", "נחל עיון", "תל דן", "נחל חרמון"],
  "גליל תחתון": ["הר תבור", "נחל ציפורי", "הר ארבל", "נחל עמוד"],
  "כרמל": ["נחל מערות", "נחל כלך", "רכס הכרמל", "נחל אורן"],
  "ירושלים": ["נחל קלט", "עין פרת", "הרי ירושלים", "נחל שורק", "עמק רפאים"],
  "שפלה": ["פארק בריטניה", "נחל האלה", "מערות בית גוברין", "נחל גוברין"],
  "נגב": ["מכתש רמון", "עין עבדת", "נחל צין", "הר כרכום", "נחל ברק"],
  "ערבה": ["נחל ברק", "הר עמיר", "נחל שני", "מעלה עמרם"],
  "גולן": ["נחל זוויתן", "נחל יהודיה", "הר בנטל", "נחל גמלא", "נחל מג'רסה"],
  "עמק יזרעאל": ["הר הגלבוע", "עין חרוד", "נחל קיני", "נחל תבור"],
};
const SUBTITLES = ["מעיינות ובריכות", "נוף עוצר נשימה", "מסלול מים זורמים", "פריחה אביבית", "מורדות וצוקים", "טיול משפחתי קליל", "אתגר למתקדמים", "שקיעה מהרכס", "מערות ומסתורין", "ירק וצל לאורך הדרך"];
const DESCRIPTIONS = [
  "אחד הטיולים היפים באזור — מים זורמים, צוקים מרשימים ונופים עוצרי נשימה לאורך כל הדרך.",
  "מסלול מעגלי נעים המתאים לכל המשפחה, עם נקודות תצפית והרבה צל בקיץ.",
  "טיול אתגרי למתקדמים הכולל טיפוסים, ירידות תלולות ונוף פנורמי מהפסגה.",
  "מסלול מים קלאסי — נחל זורם רוב השנה, בריכות טבילה ופינות חמד להפסקה.",
  "טיול מדברי מרהיב בין מצוקים וערוצים, עם שכבות סלע צבעוניות וגיאולוגיה ייחודית.",
  "מסלול היסטורי לאורך שרידים עתיקים, מנזרים ומערות, עם הסבר על תולדות המקום.",
  "פריחה מרהיבה בעונה, שדות פתוחים ושבילים מתפתלים בין גבעות ירוקות.",
];
const CITIES = ["תל אביב", "חיפה", "ירושלים", "באר שבע", "מודיעין", "כפר סבא", "רעננה", "נתניה", "ראשון לציון", "פתח תקווה"];
const POLICY = "עד 72 שעות לפני — החזר 100%\nעד 24 שעות לפני — החזר 50%\nפחות מ-24 שעות — ללא החזר";
const EQUIP = "מים (2 ליטר), כובע, נעלי הליכה, קרם הגנה";
const pick = <T,>(arr: readonly T[], i: number) => arr[i % arr.length];

// ── Scenario index ───────────────────────────────────────────────────────────
const index: { n: string; id: string; title: string }[] = [];
const tagCount: Record<string, number> = {};
function recordTags(tags: string[]) { tags.forEach((t) => { tagCount[t] = (tagCount[t] ?? 0) + 1; }); }

async function main() {
  console.log("⏳ QA seed — clearing existing content...");
  // Order matters (FKs). Wipe all trip-related content.
  await prisma.rideshareClaim.deleteMany();
  await prisma.rideshareOffer.deleteMany();
  await prisma.selfGuidedPurchase.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.review.deleteMany();
  await prisma.tripQuestion.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.tripGuide.deleteMany();
  await prisma.tripManager.deleteMany();
  await prisma.tripDay.deleteMany();
  await prisma.favoriteTrip.deleteMany();
  await prisma.guideFollow.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.trip.deleteMany();

  const PW = await bcrypt.hash("password123", 12);

  // ── Accounts ────────────────────────────────────────────────────────────────
  async function upsertGuide(email: string, name: string, g: Record<string, unknown>) {
    const u = await prisma.user.upsert({
      where: { email }, update: { name, role: "GUIDE" },
      create: { email, name, password: PW, role: "GUIDE", image: someImages(1)[0] ?? null },
      include: { guide: true },
    });
    const guide = await prisma.guide.upsert({
      where: { userId: u.id },
      update: g,
      create: { userId: u.id, ...g },
    });
    return { user: u, guide };
  }
  async function upsertUser(email: string, name: string, extra: Record<string, unknown> = {}) {
    return prisma.user.upsert({
      where: { email }, update: { name, ...extra },
      create: { email, name, password: PW, role: "USER", image: someImages(1)[0] ?? null, ...extra },
    });
  }

  const roei = await upsertGuide("roei@trailhub.co.il", "רועי לוי", {
    bio: "מדריך טיולים מוסמך עם 10 שנות ניסיון. מתמחה בטיולי נחלים ומדבר.", location: "ירושלים",
    rating: 4.9, reviewCount: 127, isVerified: true, yearsActive: 10, headline: "מדריך טיולים מוסמך",
    specialtyRegions: ["ירושלים", "נגב"], interests: ["נחלים", "היסטוריה"], trainingInstitution: "מכללת לוינסקי",
  });
  const noa = await upsertGuide("noa@trailhub.co.il", "נועה שרון", {
    bio: "מדריכה ומורת דרך, מתמחה בגליל ובטיולי משפחות.", location: "כרמיאל",
    rating: 4.7, reviewCount: 64, isVerified: true, yearsActive: 6, headline: "מורת דרך מוסמכת",
    specialtyRegions: ["גליל עליון", "גולן"], interests: ["בוטניקה", "צפרות"],
  });
  const avi = await upsertGuide("avi@trailhub.co.il", "אבי כהן", {
    bio: "מוביל מסעות מדבר ומטיולי אתגר.", location: "מצפה רמון",
    rating: 4.6, reviewCount: 38, isVerified: false, yearsActive: 4, headline: "מוביל מסעות מדבר",
    specialtyRegions: ["נגב", "ערבה"], interests: ["מדבר", "ניווט"],
  });
  // #83 brand-new guide (no trips, no reviews, no rating)
  const newGuide = await upsertGuide("newguide@trailhub.co.il", "תמר אבני", {
    bio: "מדריכה חדשה בפלטפורמה.", location: "חיפה", rating: 0, reviewCount: 0, isVerified: false, yearsActive: 1,
  });
  // #84 improving trend (high overall, recent reviews even higher)
  const rising = await upsertGuide("rising@trailhub.co.il", "יonatan ברק", {
    bio: "מדריך בעלייה — חוות הדעת האחרונות מצוינות.", location: "צפת", rating: 4.5, reviewCount: 40, isVerified: true, yearsActive: 5,
  });
  // #85 declining trend
  const declining = await upsertGuide("declining@trailhub.co.il", "מירב גולן", {
    bio: "מדריכה ותיקה.", location: "טבריה", rating: 4.4, reviewCount: 55, isVerified: true, yearsActive: 8,
  });
  // #86 dual-mode (guide + active hiker)
  const dual = await upsertGuide("dualmode@trailhub.co.il", "אלון דביר", {
    bio: "מדריך שגם מטייל בעצמו.", location: "מודיעין", rating: 4.8, reviewCount: 22, isVerified: true, yearsActive: 3,
  });
  await prisma.user.update({ where: { id: dual.user.id }, data: {
    preferredRegions: ["גולן", "גליל עליון"], preferredDifficulties: ["HARD", "EXTREME"], birthYear: 1988, gender: "male", fitnessLevel: "high", activeMode: "hiker",
  } });

  // Main test hiker
  const tester = await upsertUser("user@trailhub.co.il", "דנה מזרחי", {
    preferredRegions: ["ירושלים", "כרמל"], preferredDifficulties: ["EASY", "MEDIUM"], birthYear: 1992, gender: "female", fitnessLevel: "medium", activeMode: "hiker",
  });
  // A hiker with NO age in profile (for #29 blocked case)
  const noAge = await upsertUser("noage@trailhub.co.il", "גיל בן-דוד", { birthYear: null });
  // A young hiker (below typical min age) for #29 warned case
  const youngHiker = await upsertUser("young@trailhub.co.il", "איתי כהן", { birthYear: 2016 });

  // Admins (#82 — multiple admin accounts)
  await upsertUser("admin@trailhub.co.il", "מנהל ראשי", {}); // ensure exists
  await prisma.user.update({ where: { email: "admin@trailhub.co.il" }, data: { role: "ADMIN" } });
  const admin2 = await upsertUser("admin2@trailhub.co.il", "מנהלת תוכן", {});
  await prisma.user.update({ where: { id: admin2.id }, data: { role: "ADMIN" } });
  const admin3 = await upsertUser("admin3@trailhub.co.il", "מנהל מערכת", {});
  await prisma.user.update({ where: { id: admin3.id }, data: { role: "ADMIN" } });

  // Filler hiker pool + co-managers
  const HIKERS = ["יוסי לוי", "מיכל אבן", "תומר נחום", "שירה גל", "איתן רז", "גלי שמש", "אורן דג", "רוני מור", "ליאת בר", "נדב חן", "עדי שוב", "מאיה רון", "יעל קים", "דור פז"];
  const hikers = [] as { id: string }[];
  for (let i = 0; i < HIKERS.length; i++) hikers.push(await upsertUser(`hiker${i + 1}@trailhub.co.il`, HIKERS[i], { birthYear: 1985 + (i % 15) }));
  const mgr1 = await upsertUser("manager1@trailhub.co.il", "צוות ניהול א", {});
  const mgr2 = await upsertUser("manager2@trailhub.co.il", "צוות ניהול ב", {});
  const mgr3 = await upsertUser("manager3@trailhub.co.il", "צוות ניהול ג", {});

  let hk = 0; const nextHiker = () => hikers[(hk++) % hikers.length];

  // ── Trip helper ──────────────────────────────────────────────────────────────
  let regionCursor = 0, diffCursor = 0, descCursor = 0;
  async function mkTrip(n: string, o: Partial<Record<string, unknown>> = {}) {
    const region = (o.region as string) ?? pick(REGIONS, regionCursor++);
    const route = pick(REGION_ROUTES[region] ?? ["מסלול"], descCursor);
    const title = (o.title as string) ?? `טיול ${route} — ${pick(SUBTITLES, descCursor++)}`;
    const tags = (o.attributeTags as string[]) ?? [];
    recordTags(tags);
    const isSG = o.tripType === "SELF_GUIDED";
    const trip = await prisma.trip.create({
      data: {
        title,
        description: (o.description as string) ?? pick(DESCRIPTIONS, descCursor++),
        region,
        difficulty: (o.difficulty as "EASY") ?? pick(DIFFS, diffCursor++),
        status: (o.status as "OPEN") ?? "OPEN",
        visibility: (o.visibility as "PUBLIC") ?? "PUBLIC",
        date: (o.date as Date) ?? (isSG ? TODAY : nextUpcoming((o.startTime as string) ?? "07:00")),
        endDate: (o.endDate as Date) ?? null,
        startTime: (o.startTime as string) ?? "07:00",
        durationMin: (o.durationMin as number) ?? 300,
        distanceKm: (o.distanceKm as number) ?? 10 + (descCursor % 8),
        price: (o.price as number) ?? 120,
        maxSpots: (o.maxSpots as number) ?? 20,
        spotsBooked: (o.spotsBooked as number) ?? 0,
        minSpots: (o.minSpots as number) ?? null,
        images: (o.images as string[]) ?? someImages(2 + (descCursor % 2)),
        meetingPoint: (o.meetingPoint as string) ?? `חניון ${route}`,
        whatToBring: (o.whatToBring as string) ?? EQUIP,
        cancellationPolicy: isSG ? null : (o.cancellationPolicy as string) ?? POLICY,
        tripType: (o.tripType as "DAY_HIKE") ?? "DAY_HIKE",
        registrationMode: (o.registrationMode as "FULL_ONLY") ?? "FULL_ONLY",
        registrationFields: (o.registrationFields as object) ?? undefined,
        attributeTags: tags,
        multiPersonMode: (o.multiPersonMode as string) ?? null,
        minAge: (o.minAge as number) ?? null,
        maxAge: (o.maxAge as number) ?? null,
        fitnessLevel: (o.fitnessLevel as string) ?? null,
        routeType: (o.routeType as string) ?? "one-way",
        waypointsJson: (o.waypointsJson as object) ?? undefined,
        sourceMaterials: (o.sourceMaterials as object) ?? undefined,
        sourceMaterialsVisibility: (o.sourceMaterialsVisibility as string) ?? null,
        unlimitedCapacity: (o.unlimitedCapacity as boolean) ?? false,
        accessWindowDays: (o.accessWindowDays as number) ?? null,
        postponeCategory: (o.postponeCategory as string) ?? null,
        postponeReason: (o.postponeReason as string) ?? null,
        approvalNote: (o.approvalNote as string) ?? null,
        individualDayPrice: (o.individualDayPrice as number) ?? null,
        guideId: (o.guideId as string) ?? roei.guide.id,
        createdAt: (o.createdAt as Date) ?? new Date(),
      } as never,
    });
    // primary TripGuide
    await prisma.tripGuide.create({ data: { tripId: trip.id, guideId: (o.guideId as string) ?? roei.guide.id, role: "PRIMARY" } }).catch(() => {});
    index.push({ n, id: trip.id, title: trip.title });
    return trip;
  }

  async function confirmRegs(tripId: string, count: number, opts: Record<string, unknown> = {}) {
    for (let i = 0; i < count; i++) {
      const u = nextHiker();
      await prisma.registration.create({ data: {
        tripId, userId: u.id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 120, participantCount: 1, signedPolicy: true, ...opts,
      } }).catch(() => {});
    }
  }
  async function waitlist(tripId: string, count: number, mode: "auto" | "manual") {
    for (let i = 0; i < count; i++) {
      const u = nextHiker();
      await prisma.registration.create({ data: {
        tripId, userId: u.id, status: "WAITLIST", paymentStatus: "PENDING", totalPrice: 120, waitlistPosition: i + 1,
        autoRegister: mode === "auto", notes: mode === "auto" ? "רשום אוטומטית כשמתפנה מקום" : "שלח התראה כשמתפנה מקום (תחרותי)",
      } }).catch(() => {});
    }
  }
  async function review(tripId: string, userId: string, rating: number, comment: string, createdAt: Date) {
    await prisma.review.create({ data: { tripId, userId, rating, comment, createdAt } }).catch(() => {});
  }
  async function notif(userId: string, type: string, title: string, body: string, opts: Record<string, unknown> = {}) {
    await prisma.notification.create({ data: { userId, type: type as "TRIP_UPDATED", title, body, ...opts } as never }).catch(() => {});
  }

  console.log("🏔  Building trips...");

  // ════════ A. Publication States (1-6) ════════
  await mkTrip("1", { title: "טיול נחל קלט — ממעיין פרת לעין פרת", status: "DRAFT", region: "ירושלים", attributeTags: ["water", "shaded"], waypointsJson: [{ lat: 31.83, lng: 35.32, name: "מעיין פרת", description: "מעיין נביעה" }] });
  await mkTrip("2", { title: "טיול הר תבור (טיוטה חסרה)", status: "DRAFT", region: "גליל תחתון", whatToBring: "", images: [] }); // missing GPX/equipment
  await mkTrip("3", { title: "טיול נחל עמוד (טיוטה ישנה)", status: "DRAFT", region: "גליל תחתון", createdAt: addDays(TODAY, -24) }); // stale draft
  await mkTrip("4", { title: "טיול עין עבדת — מעיינות במדבר", status: "OPEN", visibility: "PUBLIC", region: "נגב", difficulty: "MEDIUM", attributeTags: ["water", "scenic", "restrooms"] });
  await mkTrip("5", { title: "טיול נחל זוויתן (פרטי — בלינק בלבד)", status: "OPEN", visibility: "PRIVATE", region: "גולן", attributeTags: ["water", "swimming"] });
  const t6 = await mkTrip("6", { title: "טיול הר מירון — נדחה", status: "POSTPONED", region: "גליל עליון", postponeCategory: "מזג אוויר", postponeReason: "גשמים כבדים צפויים, נקבע תאריך חדש בקרוב.", spotsBooked: 1 });
  await prisma.registration.create({ data: { tripId: t6.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "AUTHORIZED", totalPrice: 120, notes: "בחר להישאר ולהמתין לתאריך חדש" } });
  await prisma.registration.create({ data: { tripId: t6.id, userId: nextHiker().id, status: "CANCELLED", paymentStatus: "REFUNDED", totalPrice: 120, refundedAt: new Date(), notes: "בחר לצאת עם החזר מלא" } });

  // ════════ B. Capacity & Waitlist (7-14) ════════
  await mkTrip("7", { title: "טיול נחל יהודיה — חדש", region: "גולן", maxSpots: 20, spotsBooked: 0, attributeTags: ["water", "swimming"] });
  const t8 = await mkTrip("8", { title: "טיול רכס הכרמל", region: "כרמל", maxSpots: 20, spotsBooked: 10, attributeTags: ["shaded", "scenic"] }); await confirmRegs(t8.id, 10);
  const t9 = await mkTrip("9", { title: "טיול נחל דרגות — כמעט מלא", region: "ירושלים", maxSpots: 18, spotsBooked: 16, attributeTags: ["water"] }); await confirmRegs(t9.id, 16);
  await prisma.registration.create({ data: { tripId: t9.id, userId: tester.id, status: "INTERESTED", paymentStatus: "PENDING", totalPrice: 0, interestThreshold: 2, notes: "התראה כשנותרו 2 מקומות" } });
  const t10 = await mkTrip("10", { title: "טיול מכתש רמון — מלא (המתנה אוטומטית)", region: "נגב", status: "FULL", maxSpots: 15, spotsBooked: 15, attributeTags: ["scenic", "climbing"] }); await confirmRegs(t10.id, 15); await waitlist(t10.id, 3, "auto");
  const t11 = await mkTrip("11", { title: "טיול נחל כזיב — מלא (המתנה ידנית)", region: "גליל עליון", status: "FULL", maxSpots: 15, spotsBooked: 15, attributeTags: ["water", "shaded"] }); await confirmRegs(t11.id, 15); await waitlist(t11.id, 3, "manual");
  const t12 = await mkTrip("12", { title: "טיול הר ארבל — מלא (המתנה מעורבת)", region: "גליל תחתון", status: "FULL", maxSpots: 12, spotsBooked: 12, difficulty: "HARD", attributeTags: ["climbing", "scenic"] }); await confirmRegs(t12.id, 12); await waitlist(t12.id, 2, "auto"); await waitlist(t12.id, 2, "manual");
  const t13 = await mkTrip("13", { title: "טיול נחל צין — מתחת למינימום", region: "נגב", date: nextUpcoming("06:30"), minSpots: 10, maxSpots: 20, spotsBooked: 4, attributeTags: ["scenic"] }); await confirmRegs(t13.id, 4);
  const t14 = await mkTrip("14", { title: "טיול נחל גמלא — קיבולת הוגדלה", region: "גולן", maxSpots: 25, spotsBooked: 20, attributeTags: ["water", "scenic"] }); await confirmRegs(t14.id, 20); await waitlist(t14.id, 3, "auto");

  // ════════ C. Guides & Management (15-20) ════════
  await mkTrip("15", { title: "טיול עין פרת — מדריך יחיד", region: "ירושלים", attributeTags: ["water", "shaded"] });
  const t16 = await mkTrip("16", { title: "טיול נחל מערות — שני מדריכים (ראשי+משני)", region: "כרמל", guideId: roei.guide.id, attributeTags: ["shaded", "scenic"] });
  await prisma.tripGuide.create({ data: { tripId: t16.id, guideId: noa.guide.id, role: "SECONDARY" } });
  const t17 = await mkTrip("17", { title: "טיול נחל יהודיה — שני מדריכים שווים", region: "גולן", attributeTags: ["water", "swimming"] });
  await prisma.tripGuide.updateMany({ where: { tripId: t17.id, guideId: roei.guide.id }, data: { role: "EQUAL" } });
  await prisma.tripGuide.create({ data: { tripId: t17.id, guideId: avi.guide.id, role: "EQUAL" } });
  const t18 = await mkTrip("18", { title: "טיול הר הגלבוע — עם מנהל-משנה", region: "עמק יזרעאל", attributeTags: ["scenic"] });
  await prisma.tripManager.create({ data: { tripId: t18.id, userId: mgr1.id } });
  const t19 = await mkTrip("19", { title: "טיול נחל שורק — שני מנהלי-משנה", region: "ירושלים", attributeTags: ["shaded"] });
  await prisma.tripManager.createMany({ data: [{ tripId: t19.id, userId: mgr2.id }, { tripId: t19.id, userId: mgr3.id }] });
  const t20 = await mkTrip("20", { title: "טיול נחל אורן — דחיית נרשם", region: "כרמל", spotsBooked: 3, attributeTags: ["shaded"] }); await confirmRegs(t20.id, 3);
  await prisma.registration.create({ data: { tripId: t20.id, userId: nextHiker().id, status: "CANCELLED", paymentStatus: "REFUNDED", totalPrice: 120, refundedAt: new Date(), notes: "נדחה ע״י המדריך: הטיול אינו מתאים לרמת הכושר שצוינה. (חסום מהרשמה חוזרת לטיול זה)" } });
  await prisma.registration.create({ data: { tripId: t20.id, userId: nextHiker().id, status: "PENDING", paymentStatus: "PENDING", totalPrice: 120, notes: "בבדיקת המדריך (pending review) — ממתין להחלטה" } });

  // ════════ D. Interest & Conditions (21-25) ════════
  const t21 = await mkTrip("21", { title: "טיול נחל ציפורי — עניין פשוט", region: "גליל תחתון", maxSpots: 20, spotsBooked: 8, attributeTags: ["water", "young_children"] }); await confirmRegs(t21.id, 8);
  for (const th of [3, 5, 8]) await prisma.registration.create({ data: { tripId: t21.id, userId: nextHiker().id, status: "INTERESTED", paymentStatus: "PENDING", totalPrice: 0, interestThreshold: th, notes: `התראה כשנותרו ${th} מקומות` } });
  const t22 = await mkTrip("22", { title: "טיול נחל האלה — עניין מותנה", region: "שפלה", attributeTags: ["scenic"] });
  for (const c of ["אם המחיר ירד ל-100 ₪", "אם הטיול יתקצר ל-8 ק\"מ"]) await prisma.registration.create({ data: { tripId: t22.id, userId: nextHiker().id, status: "CONDITIONAL", paymentStatus: "PENDING", totalPrice: 0, conditions: [c], autoRegister: false, notes: c } });
  const t23 = await mkTrip("23", { title: "טיול הר כרכום — תנאים מרובים", region: "נגב", difficulty: "HARD", attributeTags: ["scenic", "climbing"] });
  await prisma.registration.create({ data: { tripId: t23.id, userId: tester.id, status: "CONDITIONAL", paymentStatus: "PENDING", totalPrice: 0, conditions: ["אם יתווסף מדריך שני", "אם המחיר ירד ל-150 ₪", "אם התאריך יזוז לשישי"], autoRegister: true, notes: "3 תנאים — רישום אוטומטי" } });
  const t24 = await mkTrip("24", { title: "טיול עין חרוד — תנאי שהתקיים", region: "עמק יזרעאל", spotsBooked: 6, attributeTags: ["water"] }); await confirmRegs(t24.id, 5);
  await prisma.registration.create({ data: { tripId: t24.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 110, isComp: false, conditions: ["אם המחיר ירד ל-110 ₪"], autoRegister: true, notes: "נרשם אוטומטית — התנאי התקיים (המחיר ירד)" } });
  const t25 = await mkTrip("25", { title: "טיול נחל מג'רסה — אוטומטי + התראה", region: "גולן", attributeTags: ["water", "swimming"] });
  await prisma.registration.create({ data: { tripId: t25.id, userId: nextHiker().id, status: "CONDITIONAL", paymentStatus: "PENDING", totalPrice: 0, conditions: ["אם יתווסף יום נוסף"], autoRegister: true, notes: "אוטומטי" } });
  await prisma.registration.create({ data: { tripId: t25.id, userId: nextHiker().id, status: "CONDITIONAL", paymentStatus: "PENDING", totalPrice: 0, conditions: ["אם המחיר ירד ל-90 ₪"], autoRegister: false, notes: "שלח התראה בלבד" } });

  // ════════ E. Dynamic Fields & Requirements (26-30) ════════
  const healthField = [{ id: "health", label: "הצהרת בריאות — אני בריא/ה לטיול", type: "boolean", required: true, options: [] }];
  const expField = [{ id: "exp", label: "רמת ניסיון", type: "select", required: true, options: ["מתחיל", "בינוני", "מתקדם"] }];
  const t26 = await mkTrip("26", { title: "טיול נחל ברק — הצהרת בריאות", region: "ערבה", difficulty: "HARD", registrationFields: healthField, spotsBooked: 4, attributeTags: ["scenic"] });
  for (let i = 0; i < 4; i++) await prisma.registration.create({ data: { tripId: t26.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 120, signedPolicy: true, fieldAnswers: { health: "yes" } } });
  const t27 = await mkTrip("27", { title: "טיול מעלה עמרם — רמת ניסיון", region: "ערבה", difficulty: "EXTREME", registrationFields: expField, spotsBooked: 3, attributeTags: ["climbing"] });
  for (const lvl of ["מתחיל", "בינוני", "מתקדם"]) await prisma.registration.create({ data: { tripId: t27.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 150, signedPolicy: true, fieldAnswers: { exp: lvl } } });
  const t28 = await mkTrip("28", { title: "טיול נחל גוברין — שני סוגי שדות", region: "שפלה", registrationFields: [...healthField, ...expField], spotsBooked: 4, attributeTags: ["restrooms"] });
  for (const lvl of ["מתחיל", "בינוני", "מתקדם", "בינוני"]) await prisma.registration.create({ data: { tripId: t28.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 120, signedPolicy: true, fieldAnswers: { health: "yes", exp: lvl } } });
  const t29 = await mkTrip("29", { title: "טיול ארבל — הגבלת גיל", region: "גליל תחתון", difficulty: "HARD", minAge: 12, maxAge: 70, spotsBooked: 2, attributeTags: ["climbing", "scenic"] });
  await confirmRegs(t29.id, 1);
  await prisma.registration.create({ data: { tripId: t29.id, userId: youngHiker.id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 120, signedPolicy: true, notes: "מתחת לגיל המינימום — הותרה הרשמה עם אזהרה, המדריך עודכן" } });
  // noAge user is intentionally NOT registered (would be blocked) — documented in index notes
  const t30 = await mkTrip("30", { title: "טיול נחל קיני — הרשמה קבוצתית (פשוט)", region: "עמק יזרעאל", multiPersonMode: "simple", maxSpots: 30, spotsBooked: 7, attributeTags: ["young_children", "water"] });
  await prisma.registration.create({ data: { tripId: t30.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 360, participantCount: 3, signedPolicy: true } });
  await confirmRegs(t30.id, 4);
  const t30b = await mkTrip("30b", { title: "טיול עין פרת — הרשמה קבוצתית (מפורט)", region: "ירושלים", multiPersonMode: "detailed", maxSpots: 30, spotsBooked: 3, attributeTags: ["water", "young_children"] });
  await prisma.registration.create({ data: { tripId: t30b.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 360, participantCount: 3, signedPolicy: true, participantsDetail: [{ name: "אורי" }, { name: "מאיה" }, { name: "נועם" }] } });

  // ════════ F. Attribute Tags (31-34) ════════
  await mkTrip("31", { title: "טיול נחל שני — ידידותי לכל המשפחה", region: "ערבה", difficulty: "EASY", attributeTags: ["dog", "stroller", "shaded", "water"] });
  await mkTrip("32", { title: "טיול הר עמיר — אתגרי ולילה", region: "ערבה", difficulty: "EXTREME", attributeTags: ["climbing", "night"], startTime: "18:00" });
  await mkTrip("33", { title: "טיול נחל תבור — ללא תגיות", region: "עמק יזרעאל", attributeTags: [] });
  await mkTrip("34", { title: "טיול נחל דן — שפע מאפיינים", region: "גליל עליון", difficulty: "EASY", attributeTags: ["dog", "stroller", "young_children", "wheelchair", "restrooms", "shaded", "water", "scenic"] });

  // ════════ G. Reviews, Ratings & History (35-39) — past trips ════════
  const past = (d: number) => atTime(addDays(TODAY, -d), "07:00");
  const t35 = await mkTrip("35", { title: "טיול נחל פולג — הסתיים (ביקורות רבות)", region: "שפלה", status: "COMPLETED", date: past(40), attributeTags: ["water", "shaded"] });
  for (let i = 0; i < 12; i++) await review(t35.id, nextHiker().id, [5, 5, 4, 5, 3, 4, 5, 5, 4, 5, 4, 5][i], pick(["מדריך מעולה!", "טיול מושלם", "נהניתי מאוד", "מומלץ בחום", "חוויה נהדרת", "ארגון טוב"], i), past(40 - i));
  const t36 = await mkTrip("36", { title: "טיול הר בנטל — הסתיים (מגמה יורדת)", region: "גולן", status: "COMPLETED", date: past(60), guideId: declining.guide.id, attributeTags: ["scenic"] });
  // older high, recent low → declining
  for (let i = 0; i < 6; i++) await review(t36.id, nextHiker().id, 5, "היה מצוין", past(60 - i));
  for (let i = 0; i < 5; i++) await review(t36.id, nextHiker().id, 2, "פחות טוב לאחרונה, ארגון לקוי", past(8 - i));
  await mkTrip("37", { title: "טיול נחל קיני — הסתיים ללא ביקורות", region: "עמק יזרעאל", status: "COMPLETED", date: past(15), attributeTags: ["water"] });
  const t38 = await mkTrip("38", { title: "טיול נחל אורן — שרשור תגובות לביקורת", region: "כרמל", status: "COMPLETED", date: past(25), attributeTags: ["shaded"] });
  await review(t38.id, tester.id, 4, "טיול יפה אבל התחלנו באיחור.\n[תגובת המדריך]: תודה על המשוב! נשתפר בזמנים.\n[תגובת המטייל]: מעריך את ההתייחסות, אגיע שוב 🙂", past(24));
  const t39 = await mkTrip("39", { title: "טיול עין עבדת — נרשם שלא הגיע + ביקורת", region: "נגב", status: "COMPLETED", date: past(20), attributeTags: ["water", "scenic"] });
  await prisma.registration.create({ data: { tripId: t39.id, userId: tester.id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 120, notes: "נרשם ושילם אך לא הגיע (no-show) — ללא החזר" } });
  await review(t39.id, tester.id, 3, "לא הצלחתי להגיע בסוף, אבל התקשורת מול המדריך לפני הייתה טובה.", past(18));

  // ════════ H. Cancellations & Refunds (40-43) ════════
  const t40 = await mkTrip("40", { title: "טיול נחל עיון — בוטל ע״י המדריך", region: "גליל עליון", status: "CANCELLED", postponeCategory: "מחלה", postponeReason: "המדריך חלה — החזר מלא לכל הנרשמים.", attributeTags: ["water"] });
  for (let i = 0; i < 4; i++) await prisma.registration.create({ data: { tripId: t40.id, userId: nextHiker().id, status: "CANCELLED", paymentStatus: "REFUNDED", totalPrice: 120, refundedAt: new Date() } });
  const t41 = await mkTrip("41", { title: "טיול נחל שורק — ביטול לפני החלון", region: "ירושלים", spotsBooked: 5, attributeTags: ["water", "shaded"] }); await confirmRegs(t41.id, 5);
  await prisma.registration.create({ data: { tripId: t41.id, userId: nextHiker().id, status: "CANCELLED", paymentStatus: "REFUNDED", totalPrice: 120, refundedAt: new Date(), notes: "ביטל לפני חלון הביטול — החזר מלא" } });
  const t42 = await mkTrip("42", { title: "טיול מכתש רמון — ביטול אחרי החלון", region: "נגב", date: nextUpcoming("06:00"), spotsBooked: 6, attributeTags: ["scenic"] }); await confirmRegs(t42.id, 6);
  await prisma.registration.create({ data: { tripId: t42.id, userId: nextHiker().id, status: "CANCELLED", paymentStatus: "PAID", totalPrice: 120, notes: "ביטל אחרי חלון הביטול — החזר חלקי לפי מדרגה (50%)" } });
  const t43 = await mkTrip("43", { title: "טיול הר תבור — שינוי מהותי (תאריך)", region: "גליל תחתון", spotsBooked: 5, approvalNote: "שינוי מהותי: התאריך שונה. לנרשמים 24 שעות להחליט.", attributeTags: ["scenic"] });
  await prisma.registration.create({ data: { tripId: t43.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 120, notes: "אישר להישאר לאחר השינוי המהותי" } });
  await prisma.registration.create({ data: { tripId: t43.id, userId: nextHiker().id, status: "PENDING", paymentStatus: "AUTHORIZED", totalPrice: 120, alertThresholdHours: 24, notes: "ממתין להחלטה בחלון ה-24 שעות" } });
  await prisma.registration.create({ data: { tripId: t43.id, userId: nextHiker().id, status: "CANCELLED", paymentStatus: "REFUNDED", totalPrice: 120, refundedAt: new Date(), notes: "לא הגיב תוך 24 שעות — יציאה אוטומטית עם החזר מלא" } });

  // ════════ I. Journeys (44-49) ════════
  async function addDays3(tripId: string, days: { title: string; rest?: boolean; guides?: object; km?: number; price?: number; date: Date }[]) {
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      await prisma.tripDay.create({ data: {
        tripId, dayNumber: i + 1, title: d.title, description: d.rest ? "יום מנוחה" : "יום הליכה",
        isRestDay: !!d.rest, distanceKm: d.rest ? null : (d.km ?? 12), durationMin: d.rest ? null : 360,
        startPoint: d.rest ? null : "תחילת היום", endPoint: d.rest ? null : "סוף היום", date: d.date, startTime: "07:00",
        price: d.price ?? null, guides: d.guides as object ?? undefined,
      } as never });
    }
  }
  const jStart = nextUpcoming("07:00");
  const t44 = await mkTrip("44", { title: "מסע ים אל ים — 3 ימים", region: "גליל עליון", tripType: "EXPEDITION", registrationMode: "FULL_ONLY", endDate: addDays(jStart, 2), date: jStart, price: 850, difficulty: "HARD", distanceKm: 45, attributeTags: ["scenic", "water"], spotsBooked: 8 });
  await addDays3(t44.id, [{ title: "יום 1 — מהים", date: jStart }, { title: "יום 2 — הרים", date: addDays(jStart, 1) }, { title: "יום 3 — לכנרת", date: addDays(jStart, 2) }]);
  await confirmRegs(t44.id, 8, { totalPrice: 850, dayNumbers: [1, 2, 3] });
  const j5 = nextUpcoming("07:00");
  const t45 = await mkTrip("45", { title: "מסע הגולן — 5 ימים (ימים בודדים)", region: "גולן", tripType: "EXPEDITION", registrationMode: "INDIVIDUAL_DAYS", endDate: addDays(j5, 4), date: j5, price: 1200, individualDayPrice: 260, distanceKm: 70, attributeTags: ["water", "scenic"], spotsBooked: 0 });
  await addDays3(t45.id, [1, 2, 3, 4, 5].map((n) => ({ title: `יום ${n}`, date: addDays(j5, n - 1), price: 260 })));
  await prisma.registration.create({ data: { tripId: t45.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 260, dayNumbers: [1], notes: "נרשם ליום 1 בלבד" } });
  await prisma.registration.create({ data: { tripId: t45.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 520, dayNumbers: [1, 5], notes: "ימים 1+5" } });
  await prisma.registration.create({ data: { tripId: t45.id, userId: tester.id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 1200, dayNumbers: [1, 2, 3, 4, 5], notes: "כל 5 הימים" } });
  const j46 = nextUpcoming("07:00");
  const t46 = await mkTrip("46", { title: "מסע יהודה — גמיש", region: "ירושלים", tripType: "EXPEDITION", registrationMode: "FLEXIBLE", endDate: addDays(j46, 3), date: j46, price: 900, distanceKm: 50, attributeTags: ["scenic"], spotsBooked: 6 });
  await addDays3(t46.id, [1, 2, 3, 4].map((n) => ({ title: `יום ${n}`, date: addDays(j46, n - 1) })));
  await confirmRegs(t46.id, 5, { totalPrice: 900, dayNumbers: [1, 2, 3, 4] });
  await prisma.registration.create({ data: { tripId: t46.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 900, dayNumbers: [1, 2], notes: "שילם מראש, עזב באמצע המסע (יום 3) — ללא החזר על ימים שלא נוצלו" } });
  const j47 = nextUpcoming("07:00");
  const t47 = await mkTrip("47", { title: "מסע הכרמל — עם יום מנוחה ומדריך מתחלף", region: "כרמל", tripType: "EXPEDITION", endDate: addDays(j47, 3), date: j47, price: 800, attributeTags: ["shaded", "scenic"], spotsBooked: 7 });
  await addDays3(t47.id, [
    { title: "יום 1 — רועי", date: j47, guides: [{ guideId: roei.guide.id, role: "PRIMARY" }] },
    { title: "יום 2 — מנוחה", rest: true, date: addDays(j47, 1) },
    { title: "יום 3 — רועי + נועה", date: addDays(j47, 2), guides: [{ guideId: roei.guide.id, role: "PRIMARY" }, { guideId: noa.guide.id, role: "SECONDARY" }] },
    { title: "יום 4 — נועה", date: addDays(j47, 3), guides: [{ guideId: noa.guide.id, role: "PRIMARY" }] },
  ]);
  await confirmRegs(t47.id, 7, { totalPrice: 800 });
  const j48 = nextUpcoming("07:00");
  const t48 = await mkTrip("48", { title: "מסע הנגב — טרמפים ביום ראשון ואחרון", region: "נגב", tripType: "EXPEDITION", endDate: addDays(j48, 2), date: j48, price: 700, difficulty: "HARD", attributeTags: ["scenic"], spotsBooked: 6 });
  await addDays3(t48.id, [1, 2, 3].map((n) => ({ title: `יום ${n}`, date: addDays(j48, n - 1) })));
  await confirmRegs(t48.id, 6, { totalPrice: 700 });
  const ride48a = await prisma.rideshareOffer.create({ data: { tripId: t48.id, posterId: nextHiker().id, departureCity: "תל אביב", spots: 3, direction: "ONE_WAY", costSharing: true, note: "יום 1 — הגעה לנקודת ההתחלה" } });
  await prisma.rideshareClaim.create({ data: { offerId: ride48a.id, userId: nextHiker().id } });
  await prisma.rideshareOffer.create({ data: { tripId: t48.id, posterId: nextHiker().id, departureCity: "מצפה רמון", spots: 2, direction: "ONE_WAY", costSharing: false, note: "יום אחרון — חזרה הביתה" } });
  const j49 = nextUpcoming("07:00");
  const t49 = await mkTrip("49", { title: "מסע הגליל — יום מלא עם המתנה", region: "גליל עליון", tripType: "EXPEDITION", registrationMode: "INDIVIDUAL_DAYS", endDate: addDays(j49, 2), date: j49, price: 600, individualDayPrice: 220, attributeTags: ["water"], spotsBooked: 0, maxSpots: 12 });
  await addDays3(t49.id, [1, 2, 3].map((n) => ({ title: `יום ${n}`, date: addDays(j49, n - 1), price: 220 })));
  for (let i = 0; i < 12; i++) await prisma.registration.create({ data: { tripId: t49.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 220, dayNumbers: [1] } });
  await prisma.registration.create({ data: { tripId: t49.id, userId: nextHiker().id, status: "WAITLIST", paymentStatus: "PENDING", totalPrice: 220, dayNumbers: [1], waitlistPosition: 1, notes: "המתנה ליום 1 (מלא), בעוד ימים 2-3 פתוחים" } });

  // ════════ J. Self-Guided (50-61) ════════
  const sgWaypoints = (withSources = false) => [
    { lat: 31.77, lng: 35.21, name: "נקודת התחלה", description: "החניון", navInstructions: "צא מהחניון ופנה ימינה לשביל המסומן כחול", guidance: "ברוכים הבאים! המסלול מתחיל כאן. שימו לב לסימון הכחול.", safety: "היזהרו מתנועה בכביש הסמוך", ...(withSources ? { sources: [{ type: "link", url: "https://he.wikipedia.org", title: "רקע היסטורי", description: "על המקום" }] } : {}) },
    { lat: 31.78, lng: 35.22, name: "המעיין", description: "מעיין נביעה", navInstructions: "אחרי 300 מ' פנה שמאל ליד העץ הגדול", guidance: "המעיין שלפניכם פעיל כל השנה. זהו מקום מנוחה מצוין.", safety: "הסלעים חלקלקים — היזהרו" },
    { lat: 31.79, lng: 35.23, name: "נקודת סיום", description: "חזרה לחניון", navInstructions: "המשך ישר עד החניון", guidance: "סיימתם! מקווים שנהניתם.", safety: "" },
  ];
  const sgSrc = [{ type: "link", url: "https://he.wikipedia.org", title: "מאמר רקע", description: "קריאת רקע על האזור" }];
  const t50 = await mkTrip("50", { title: "טיול עצמאי — נחל קלט בקצב שלך", region: "ירושלים", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 30, price: 65, status: "OPEN", visibility: "PUBLIC", difficulty: "EASY", waypointsJson: sgWaypoints(true), sourceMaterials: sgSrc, sourceMaterialsVisibility: "preview", attributeTags: ["water", "shaded", "scenic"] });
  const t51start = TODAY;
  const t51 = await mkTrip("51", { title: "מסע עצמאי — שביל הגולן ב-4 ימים", region: "גולן", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 60, price: 180, difficulty: "MEDIUM", waypointsJson: sgWaypoints(), attributeTags: ["water", "scenic", "seasonal"] });
  await addDays3(t51.id, [{ title: "יום 1 — פעיל", date: t51start }, { title: "יום 2 — מנוחה", rest: true, date: addDays(t51start, 1) }, { title: "יום 3 — פעיל", date: addDays(t51start, 2) }, { title: "יום 4 — פעיל", date: addDays(t51start, 3) }]);
  await mkTrip("52", { title: "טיול עצמאי — נחל עמוד (טיוטה, ללא תחנות)", region: "גליל תחתון", tripType: "SELF_GUIDED", status: "DRAFT", unlimitedCapacity: true, accessWindowDays: 30, price: 50, waypointsJson: [], attributeTags: ["water"] });
  await mkTrip("53", { title: "טיול עצמאי — מסלול סודי (פרטי)", region: "כרמל", tripType: "SELF_GUIDED", status: "OPEN", visibility: "PRIVATE", unlimitedCapacity: true, accessWindowDays: 45, price: 70, waypointsJson: sgWaypoints(), attributeTags: ["shaded", "campfire"] });
  const t54 = await mkTrip("54", { title: "טיול עצמאי — עין פרת (נרכש, בתוקף)", region: "ירושלים", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 30, price: 60, waypointsJson: sgWaypoints(true), sourceMaterials: sgSrc, sourceMaterialsVisibility: "during", attributeTags: ["water", "sunrise_sunset"] });
  await prisma.selfGuidedPurchase.create({ data: { tripId: t54.id, userId: tester.id, price: 60, purchasedAt: addDays(TODAY, -3), accessExpiresAt: addDays(TODAY, 27) } });
  const t55 = await mkTrip("55", { title: "טיול עצמאי — נחל מערות (גישה מסתיימת)", region: "כרמל", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 30, price: 55, waypointsJson: sgWaypoints(), attributeTags: ["shaded", "scenic"] });
  await prisma.selfGuidedPurchase.create({ data: { tripId: t55.id, userId: tester.id, price: 55, purchasedAt: addDays(TODAY, -28), accessExpiresAt: addDays(TODAY, 2) } });
  const t56 = await mkTrip("56", { title: "טיול עצמאי — הר תבור (גישה פגה)", region: "גליל תחתון", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 14, price: 45, waypointsJson: sgWaypoints(), attributeTags: ["scenic"] });
  await prisma.selfGuidedPurchase.create({ data: { tripId: t56.id, userId: tester.id, price: 45, purchasedAt: addDays(TODAY, -20), accessExpiresAt: addDays(TODAY, -6) } });
  const t57 = await mkTrip("57", { title: "טיול עצמאי — נחל דרגות (משותף ל-3)", region: "ירושלים", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 30, price: 75, waypointsJson: sgWaypoints(), attributeTags: ["water", "scenic"] });
  await prisma.selfGuidedPurchase.create({ data: { tripId: t57.id, userId: tester.id, price: 75, purchasedAt: addDays(TODAY, -5), accessExpiresAt: addDays(TODAY, 25), sharedWith: ["young@trailhub.co.il", "noage@trailhub.co.il"] } });
  await mkTrip("58", { title: "טיול עצמאי — לילה במדבר ומדורה", region: "נגב", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 90, price: 90, difficulty: "MEDIUM", waypointsJson: sgWaypoints(), attributeTags: ["campfire", "night", "sunrise_sunset"], startTime: "17:00" });
  const t59 = await mkTrip("59", { title: "טיול עצמאי — נחל צין (תלונות מרובות)", region: "נגב", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 30, price: 60, waypointsJson: sgWaypoints(), attributeTags: ["water", "not_rainy"] });
  for (let i = 0; i < 4; i++) await prisma.complaint.create({ data: { tripId: t59.id, userId: nextHiker().id, category: "content", body: "תואר כמתאים לחורף אבל המסלול מוצף ולא עביר — לא תואם לתיאור.", status: "OPEN" } });
  const t60 = await mkTrip("60", { title: "טיול עצמאי — נחל יהודיה (תלונה בודדת)", region: "גולן", tripType: "SELF_GUIDED", unlimitedCapacity: true, accessWindowDays: 30, price: 65, waypointsJson: sgWaypoints(), attributeTags: ["water", "swimming"] });
  await prisma.complaint.create({ data: { tripId: t60.id, userId: nextHiker().id, category: "accidental", body: "רכשתי בטעות (לחיצה כפולה) — אשמח להחזר.", status: "OPEN" } });
  const t61 = await mkTrip("61", { title: "טיול עצמאי — מסלול שהוסר ע״י מנהל", region: "כרמל", tripType: "SELF_GUIDED", status: "CANCELLED", visibility: "PRIVATE", unlimitedCapacity: true, accessWindowDays: 30, price: 55, approvalNote: "הוסר ע\"י מנהל: תוכן שנמצא פגום.", waypointsJson: sgWaypoints(), attributeTags: ["shaded"] });
  await prisma.selfGuidedPurchase.create({ data: { tripId: t61.id, userId: tester.id, price: 55, purchasedAt: addDays(TODAY, -10), accessExpiresAt: addDays(TODAY, 20), revoked: true } });
  await prisma.complaint.create({ data: { tripId: t61.id, userId: tester.id, category: "content", body: "המסלול אינו תואם למתואר.", status: "RESOLVED" } });
  await notif(tester.id, "TRIP_CANCELLED", "תוכן הוסר", `הטיול העצמאי "${t61.title}" נמצא בעייתי והוסר. הגישה לתוכן בוטלה.`, { tripId: t61.id });

  // ════════ K. Comp Codes (62-65) ════════
  const t62 = await mkTrip("62", { title: "טיול נחל גוברין — קוד מתנדב פנוי", region: "שפלה", attributeTags: ["restrooms", "shaded"] });
  await prisma.coupon.create({ data: { code: "COMP-FREE01", discountPct: 100, isComp: true, guideId: roei.guide.id, tripId: t62.id } });
  const t63 = await mkTrip("63", { title: "טיול עין חרוד — קוד מתנדב מומש", region: "עמק יזרעאל", spotsBooked: 1, attributeTags: ["water"] });
  await prisma.coupon.create({ data: { code: "COMP-USED01", discountPct: 100, isComp: true, usedCount: 1, guideId: roei.guide.id, tripId: t63.id } });
  await prisma.registration.create({ data: { tripId: t63.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 0, isComp: true, notes: "מתנדב (קוד COMP) — מוצג כרגיל ללא תג מיוחד" } });
  const t64 = await mkTrip("64", { title: "טיול נחל האלה — קוד מתנדב בוטל", region: "שפלה", attributeTags: ["scenic"] });
  await prisma.coupon.create({ data: { code: "COMP-CANCELLED01", discountPct: 100, isComp: true, isActive: false, guideId: roei.guide.id, tripId: t64.id } });
  const j65 = nextUpcoming("07:00");
  const t65 = await mkTrip("65", { title: "מסע הגליל — קוד מתנדב ליום בודד", region: "גליל עליון", tripType: "EXPEDITION", registrationMode: "INDIVIDUAL_DAYS", endDate: addDays(j65, 2), date: j65, price: 600, individualDayPrice: 220, attributeTags: ["water"] });
  await addDays3(t65.id, [1, 2, 3].map((n) => ({ title: `יום ${n}`, date: addDays(j65, n - 1), price: 220 })));
  await prisma.coupon.create({ data: { code: "COMP-DAY01", discountPct: 100, isComp: true, guideId: roei.guide.id, tripId: t65.id } });
  await prisma.registration.create({ data: { tripId: t65.id, userId: nextHiker().id, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 0, isComp: true, dayNumbers: [2], notes: "מתנדב — יום 2 בלבד עם קוד" } });

  // ════════ L. Rideshare (66-69) ════════
  const t66 = await mkTrip("66", { title: "טיול נחל כלך — טרמפ פנוי", region: "כרמל", spotsBooked: 5, attributeTags: ["shaded"] }); await confirmRegs(t66.id, 5);
  await prisma.rideshareOffer.create({ data: { tripId: t66.id, posterId: nextHiker().id, departureCity: pick(CITIES, 0), spots: 4, direction: "ROUND_TRIP", costSharing: false, note: "יש מקום, בואו!" } });
  const t67 = await mkTrip("67", { title: "טיול נחל שורק — טרמפ עם השתתפות בדלק", region: "ירושלים", spotsBooked: 5, attributeTags: ["water"] }); await confirmRegs(t67.id, 5);
  const r67 = await prisma.rideshareOffer.create({ data: { tripId: t67.id, posterId: nextHiker().id, departureCity: pick(CITIES, 3), spots: 3, direction: "ROUND_TRIP", costSharing: true, note: "השתתפות ~30 ₪" } });
  await prisma.rideshareClaim.create({ data: { offerId: r67.id, userId: nextHiker().id } });
  const t68 = await mkTrip("68", { title: "טיול הר תבור — טרמפ מלא", region: "גליל תחתון", spotsBooked: 5, attributeTags: ["scenic"] }); await confirmRegs(t68.id, 5);
  const r68 = await prisma.rideshareOffer.create({ data: { tripId: t68.id, posterId: nextHiker().id, departureCity: pick(CITIES, 2), spots: 2, direction: "ROUND_TRIP", costSharing: true } });
  await prisma.rideshareClaim.createMany({ data: [{ offerId: r68.id, userId: nextHiker().id }, { offerId: r68.id, userId: nextHiker().id }] });
  const t69 = await mkTrip("69", { title: "טיול מכתש רמון — טרמפ כיוון אחד", region: "נגב", spotsBooked: 5, attributeTags: ["scenic"] }); await confirmRegs(t69.id, 5);
  await prisma.rideshareOffer.create({ data: { tripId: t69.id, posterId: nextHiker().id, departureCity: pick(CITIES, 4), spots: 3, direction: "ONE_WAY", costSharing: false, note: "כיוון אחד בלבד — הלוך" } });

  // ════════ M. Search & Discovery edges (70-74) ════════
  await mkTrip("70", { title: "טיול נחל אורן — יוצא היום", region: "כרמל", date: atTime(TODAY, "16:00"), startTime: "16:00", attributeTags: ["shaded"] });
  await mkTrip("71", { title: "טיול עין פרת — יוצא מחר", region: "ירושלים", date: atTime(addDays(TODAY, 1), "07:00"), attributeTags: ["water"] });
  await mkTrip("72", { title: "טיול מכתש רמון — בעוד 3 חודשים", region: "נגב", date: atTime(addDays(TODAY, 90), "06:00"), attributeTags: ["scenic"] });
  await mkTrip("73", { title: "טיול הר ארבל — קיצוני", region: "גליל תחתון", difficulty: "EXTREME", attributeTags: ["climbing"] });
  await mkTrip("74", { title: "טיול חינמי — סיור עירוני ירושלים", region: "ירושלים", price: 0, difficulty: "EASY", cancellationPolicy: null, attributeTags: ["wheelchair", "restrooms"] });

  // ════════ N. Notifications for the test hiker (75-80) ════════
  const someTrip = t8;
  await notif(tester.id, "TRIP_UPDATED", "עדכון בטיול", `פרטי הטיול "${someTrip.title}" עודכנו.`, { tripId: someTrip.id, read: false });
  await notif(tester.id, "TRIP_UPDATED", "התקדמת ברשימת ההמתנה", "התפנה מקום והתקדמת לראש רשימת ההמתנה.", { tripId: t10.id, read: false });
  await notif(tester.id, "TRIP_CANCELLED", "טיול בוטל", `הטיול "${t40.title}" בוטל ע"י המדריך — בוצע החזר מלא.`, { tripId: t40.id, read: false });
  await notif(tester.id, "NEW_TRIP_FROM_GUIDE", "טיול חדש ממדריך שאתה עוקב אחריו", `רועי לוי פרסם טיול חדש.`, { tripId: someTrip.id, read: false });
  await notif(tester.id, "NEW_MESSAGE", "שאלה נענתה", "המדריך ענה לשאלתך בטיול.", { read: false });
  await notif(tester.id, "TRIP_UPDATED", "עדכון ישן", "התראה ישנה (מעל 90 יום) — לבדיקת מדיניות שמירה.", { read: true, createdAt: addDays(TODAY, -120) });
  // follow relationship so the followed-guide notif is realistic
  await prisma.guideFollow.create({ data: { userId: tester.id, guideId: roei.guide.id } }).catch(() => {});

  // ════════ O. Admin queue (81) — already seeded complaints in #59/#60/#61; add an accidental one ════════
  await prisma.complaint.create({ data: { tripId: t60.id, userId: tester.id, category: "accidental", body: "רכישה כפולה בטעות.", status: "OPEN" } }).catch(() => {});

  // ════════ Favorites for the test hiker (heart) ════════
  for (const t of [t8, t9, t35, t50]) await prisma.favoriteTrip.create({ data: { userId: tester.id, tripId: t.id } }).catch(() => {});

  // ════════ P. Guide profile trips (84-85 need trips so profiles are visible) ════════
  await mkTrip("84a", { title: "טיול הר מירון — מדריך בעלייה", region: "גליל עליון", guideId: rising.guide.id, attributeTags: ["scenic"] });
  // rising: recent reviews higher than historical
  const t84r = await mkTrip("84b", { title: "טיול נחל עיון — הסתיים", region: "גליל עליון", status: "COMPLETED", date: past(50), guideId: rising.guide.id, attributeTags: ["water"] });
  for (let i = 0; i < 6; i++) await review(t84r.id, nextHiker().id, 4, "טוב", past(50 - i));
  for (let i = 0; i < 5; i++) await review(t84r.id, nextHiker().id, 5, "מעולה לאחרונה!", past(7 - i));
  await mkTrip("85a", { title: "טיול נחל יהודיה — מדריכה ותיקה", region: "גולן", guideId: declining.guide.id, attributeTags: ["water"] });

  // ════════ Remaining slack — fill toward ~100 + guarantee tag/difficulty/region coverage ════════
  const ALL_TAGS = ["dog", "stroller", "young_children", "wheelchair", "restrooms", "shaded", "water", "swimming", "cycling", "scenic", "climbing", "night"];
  let slack = 0;
  // top up any tag under 3
  for (const tag of ALL_TAGS) {
    while ((tagCount[tag] ?? 0) < 3) {
      slack++;
      await mkTrip(`slack-${slack}`, { region: pick(REGIONS, slack), difficulty: pick(DIFFS, slack), attributeTags: [tag, pick(ALL_TAGS, slack + 3)], guideId: pick([roei, noa, avi, dual], slack).guide.id });
    }
  }
  // ensure each region + difficulty has a few, and reach ~100 total
  while (index.filter((x) => !x.n.startsWith("slack")).length + slack < 100 - 6) {
    slack++;
    await mkTrip(`slack-${slack}`, {
      region: pick(REGIONS, slack), difficulty: pick(DIFFS, slack + 1),
      attributeTags: [pick(ALL_TAGS, slack), pick(ALL_TAGS, slack * 2 + 1)],
      guideId: pick([roei, noa, avi, dual], slack + 1).guide.id,
      price: [0, 80, 100, 120, 150, 200][slack % 6],
    });
  }

  // ── Recompute guide rating aggregates from seeded reviews ────────────────────
  for (const g of [roei, noa, avi, rising, declining, dual]) {
    const reviews = await prisma.review.findMany({ where: { trip: { guideId: g.guide.id, tripType: { not: "SELF_GUIDED" } } }, select: { rating: true } });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : g.guide.rating;
    await prisma.guide.update({ where: { id: g.guide.id }, data: { rating: reviews.length ? avg : g.guide.rating, reviewCount: reviews.length || g.guide.reviewCount } });
  }

  // ── Output ───────────────────────────────────────────────────────────────────
  const total = await prisma.trip.count();
  console.log(`\n✅ Seeded ${total} trips.\n`);
  console.log("════════ TEST ACCOUNTS (password: password123) ════════");
  console.log("HIKER (main test account): user@trailhub.co.il  (דנה מזרחי) — has purchases, favorites, notifications, registrations");
  console.log("GUIDE: roei@trailhub.co.il (רועי לוי) · noa@trailhub.co.il (נועה שרון) · avi@trailhub.co.il (אבי כהן)");
  console.log("GUIDE — new/no-reviews: newguide@trailhub.co.il (תמר אבני)");
  console.log("GUIDE — improving trend: rising@trailhub.co.il · declining trend: declining@trailhub.co.il");
  console.log("GUIDE+HIKER dual mode: dualmode@trailhub.co.il (אלון דביר)");
  console.log("ADMIN: admin@trailhub.co.il · admin2@trailhub.co.il · admin3@trailhub.co.il");
  console.log("CO-MANAGERS: manager1/2/3@trailhub.co.il");
  console.log("EDGE hikers: noage@trailhub.co.il (no age → blocked on age-restricted) · young@trailhub.co.il (under min age → warned)");
  console.log("FILLER hikers: hiker1..14@trailhub.co.il");
  console.log("\n════════ SCENARIO → TRIP ID INDEX ════════");
  const seen = new Set<string>();
  for (const e of index) {
    if (e.n.startsWith("slack")) continue;
    if (seen.has(e.n)) continue; seen.add(e.n);
    console.log(`#${e.n.padEnd(4)} ${e.id}  ${e.title}`);
  }
  console.log(`\n(+ ${slack} additional variety trips for filter/region/difficulty coverage)`);
  console.log("\nNotes on approximations (schema-limited):");
  console.log("- 'Rejected'/'pending-review' registrant states use CANCELLED/PENDING + an explanatory note (no dedicated enum).");
  console.log("- Review threads (#38) are stored inline in the comment text (no separate reply model).");
  console.log("- Stale-draft auto-delete and major-change 24h timers are seeded as data states, not running jobs.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

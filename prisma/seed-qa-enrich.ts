/**
 * Enrich Q&A: 5–8 questions per guided trip — mix of public/private,
 * answered/unanswered, plus 2–3 long back-and-forth threads. Realistic questions.
 *
 * Run:  npx tsx prisma/seed-qa-enrich.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const QUESTIONS = [
  "האם כלבים מותרים במסלול?",
  "מה רמת הקושי לילדים בני 8?",
  "האם יש צל לאורך המסלול?",
  "מה לגבי חניה בנקודת המפגש?",
  "כמה מים כדאי להביא?",
  "האם המסלול מתאים לעגלת תינוק?",
  "יש שירותים בנקודת ההתחלה?",
  "כמה זמן לוקח המסלול בקצב רגוע?",
  "האם יש קטעים חשופים או מסוכנים?",
  "אפשר להצטרף עם קבוצה גדולה?",
  "האם יש מים לאורך הדרך (מעיין/בריכה)?",
  "מה השעה המומלצת להתחיל בקיץ?",
  "האם צריך נעליים גבוהות או שרגילות מספיקות?",
  "יש קליטה סלולרית לאורך המסלול?",
  "המסלול מעגלי או שצריך שני רכבים?",
];

const ANSWERS_SHORT = [
  "כן, בהחלט.", "לא, לצערי לא בקטע הזה.", "מומלץ מאוד — נתראה שם!",
  "אין בעיה, מוזמנים.", "כדאי להגיע מוקדם.",
];
const ANSWERS_LONG = [
  "שאלה מצוינת. המסלול מתאים למשפחות עם ילדים מגיל 6 ומעלה, בקצב רגוע לוקח כשלוש שעות. יש כמה קטעים סלעיים קצרים שדורשים תשומת לב אבל שום דבר מסוכן. מומלץ להביא כובע, מים בשפע ונעליים סגורות. נשמח לראות אתכם!",
  "לגבי הצל — רוב המסלול חשוף לשמש, ולכן בקיץ אני ממליץ לצאת מוקדם, עד השעה 8 בבוקר. יש חורשה מוצלת בערך באמצע הדרך שמתאימה להפסקה. חשוב להביא לפחות 2.5 ליטר מים לאדם וכובע רחב שוליים. בחורף השעה פחות קריטית.",
  "החניה בנקודת המפגש חופשית ומרווחת, אין צורך לשלם. אם מגיעים בסופ״ש כדאי להקדים כי מתמלא. מי שמגיע בתחבורה ציבורית — יש תחנה במרחק הליכה של כ-15 דקות. אשמח לתאם טרמפים דרך לוח הטרמפים של הטיול.",
  "המסלול מעגלי אז אין צורך בשני רכבים — חוזרים לאותה נקודה. אורך המסלול כ-9 ק״מ והוא לוקח בין 3 ל-4 שעות תלוי בקצב ובהפסקות. יש נקודת מים אחת בערך בשני שליש הדרך. מומלץ מאוד לילדים מגיל 8.",
];
const FOLLOWUPS = [
  "תודה! ועוד שאלה — יש מקום לפיקניק בסוף?",
  "מעולה. והאם כדאי להביא מקלות הליכה?",
  "הבנתי. ומה לגבי מזג האוויר הצפוי?",
];
const GUIDE_REPLIES = [
  "בשמחה — יש שולחנות פיקניק בחניון הסיום, מושלם לארוחה.",
  "מקלות הליכה יעזרו בירידה, אבל לא חובה.",
  "התחזית טובה, בסביבות 24 מעלות. אעדכן אם משהו משתנה.",
];

function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff; return h >>> 0; }

async function main() {
  const password = await bcrypt.hash("password123", 12);
  // Ensure a pool of hiker askers.
  let hikers = await prisma.user.findMany({ where: { role: "USER" }, select: { id: true }, take: 30 });
  if (hikers.length < 6) {
    for (let i = 0; i < 8; i++) {
      const u = await prisma.user.upsert({
        where: { email: `qa.hiker${i}@trailhub.co.il` },
        update: {},
        create: { email: `qa.hiker${i}@trailhub.co.il`, name: `מטייל ${i + 1}`, password, role: "USER", gender: i % 2 ? "נקבה" : "זכר" },
      });
      hikers.push({ id: u.id });
    }
  }
  const hikerIds = hikers.map((h) => h.id);

  const trips = await prisma.trip.findMany({
    where: { tripType: { not: "SELF_GUIDED" } },
    select: { id: true, title: true, guide: { select: { userId: true } } },
  });

  let qCount = 0, threadCount = 0;
  for (const trip of trips) {
    const r = rng(hashStr(trip.id));
    const guideUserId = trip.guide.userId;
    const total = 5 + Math.floor(r() * 4); // 5–8
    const qs = [...QUESTIONS].sort(() => r() - 0.5).slice(0, total);

    for (let i = 0; i < qs.length; i++) {
      const askerId = hikerIds[Math.floor(r() * hikerIds.length)] || hikerIds[0];
      if (askerId === guideUserId) continue;
      const isPrivate = r() < 0.3;
      const answered = r() < 0.6;
      const longThread = i < 3 && r() < 0.5; // 2–3 long back-and-forths per trip
      const answerText = answered ? (r() < 0.5 ? ANSWERS_LONG[Math.floor(r() * ANSWERS_LONG.length)] : ANSWERS_SHORT[Math.floor(r() * ANSWERS_SHORT.length)]) : null;

      const q = await prisma.tripQuestion.create({
        data: {
          tripId: trip.id, userId: askerId, body: qs[i], isPrivate,
          answer: answerText, answeredAt: answerText ? new Date() : null,
        },
      });
      qCount++;

      if (answered && longThread) {
        // hiker follow-up → guide reply → hiker follow-up → guide reply
        const rounds = 1 + Math.floor(r() * 2); // 1–2 extra exchanges
        for (let k = 0; k < rounds; k++) {
          await prisma.tripQuestionReply.create({ data: { questionId: q.id, userId: askerId, body: FOLLOWUPS[k % FOLLOWUPS.length] } });
          await prisma.tripQuestionReply.create({ data: { questionId: q.id, userId: guideUserId, body: GUIDE_REPLIES[k % GUIDE_REPLIES.length] } });
        }
        threadCount++;
      }
    }
  }
  console.log(`✅ ${qCount} questions across ${trips.length} trips · ${threadCount} long threads`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1); });

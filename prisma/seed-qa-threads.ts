/**
 * Seed long, realistic threaded Q&A conversations (up to 6 exchanges each):
 *   hiker asks → guide answers → hiker follows up → guide answers → …
 * Applies to several guided trips so the threaded UI has real depth to show.
 *
 * Run:  npx tsx prisma/seed-qa-threads.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Each thread: opening question + first answer, then alternating follow-ups
// (hiker, guide, hiker, guide …). Together they form up to 6 exchanges.
interface Thread {
  isPrivate: boolean;
  q: string;        // hiker's opening question
  a: string;        // guide's first answer
  turns: string[];  // alternating, starting with the HIKER's follow-up
}

const THREADS: Thread[] = [
  {
    isPrivate: false,
    q: "שלום! אני שוקל להביא את הילדים (בני 8 ו-11). המסלול מתאים לגילאים האלה?",
    a: "שלום וברוך הבא! בהחלט מתאים. רוב המסלול קל ומהנה, יש רק ירידה סלעית קצרה שבה כדאי לתת יד לקטן. בקצב משפחתי מדובר בכ-3 שעות כולל הפסקות.",
    turns: [
      "נשמע מצוין. יש מקומות צל בדרך להפסקה עם הילדים?",
      "יש חורשה מוצלת בערך באמצע המסלול — מקום מושלם לפיקניק. מעבר לזה רוב הדרך חשופה, אז כובעים ומים בשפע הם חובה.",
      "כמה מים כדאי להביא לכל אחד בקיץ?",
      "לילדים לפחות 1.5 ליטר, למבוגרים 2 עד 2.5 ליטר. אני תמיד ממליץ גם על חטיף מלוח קטן לדרך.",
      "מעולה. ונקודת המפגש — יש חניה נוחה?",
      "כן, חניון גדול וחינמי בכניסה. הגיעו כ-10 דקות לפני כדי שנספיק תדריך בטיחות קצר לפני היציאה.",
      "תודה רבה על התשובות המפורטות! נרשמנו, נתראה בשטח 😊",
      "שמח לשמוע! נתראה, יהיה טיול מקסים 🙂",
    ],
  },
  {
    isPrivate: false,
    q: "מה רמת הקושי האמיתית? אני חוזר לפעילות אחרי תקופה בלי טיולים.",
    a: "שאלה טובה. הייתי מדרג את זה כבינוני — בעיקר בגלל אורך המסלול ולא בגלל קטעים טכניים. אין טיפוסים חשופים או חבלים, רק הליכה רציפה.",
    turns: [
      "יש עליות משמעותיות בדרך?",
      "יש עלייה מתונה אחת בהתחלה שנמשכת כ-20 דקות, אחר כך המסלול מיישר ונעשה נעים מאוד. מי שהולך בקצב סביר לא ירגיש קושי מיוחד.",
      "כמה זמן לוקח המסלול בקצב רגוע עם הפסקות?",
      "בין 3.5 ל-4 שעות בקצב נינוח. אנחנו לא ממהרים ועוצרים בנקודות התצפית לצילומים ולהסברים.",
      "יופי, זה בדיוק מה שחיפשתי. תודה!",
      "בכיף! תבוא עם נעליים סגורות טובות וזה יהיה חלק לגמרי.",
    ],
  },
  {
    isPrivate: false,
    q: "האם מותר להביא כלב? יש לי כלב רגוע שרגיל למסלולים.",
    a: "אפשר בהחלט, בתנאי שהוא ברצועה לאורך כל הדרך ומחזיק מים משלו. יש קטע אחד ליד המעיין שבו נבקש להרחיק אותו מהמים כדי לשמור על הניקיון.",
    turns: [
      "אין בעיה עם הרצועה. יש מקורות מים בדרך שהוא יוכל לשתות מהם?",
      "יש מעיין אחד בערך בשני שליש הדרך, אבל אל תסמוך עליו בקיץ — לפעמים הוא דל. עדיף להביא מים ייעודיים וקערה מתקפלת.",
      "מובן. והקרקע — יש הרבה קטעים של סלעים חדים שעלולים לפצוע כפות רגליים?",
      "רוב הדרך קרקע כבושה ונוחה. יש קטע קצר סלעי בירידה; אם הכלב רגיש, נעלי הגנה לכפות יכולות לעזור שם.",
      "תודה על ההתחשבות! נשמע שנסתדר מצוין.",
      "בשמחה, נשמח לראות אתכם. תזכיר לי בשטח שניתן לו לנוח בצל בהפסקה.",
    ],
  },
  {
    isPrivate: true,
    q: "שלום, יש לי בעיה קלה בברך. אני מעדיף לא לפרסם — האם המסלול כולל ירידות תלולות שיכולות להכביד?",
    a: "תודה שעדכנת, זה נשאר בינינו. יש ירידה תלולה אחת קצרה בערך באמצע המסלול. עם מקלות הליכה והליכה זהירה רוב האנשים עם רגישות קלה מסתדרים בלי בעיה.",
    turns: [
      "כמה זמן נמשכת הירידה התלולה הזו בערך?",
      "כ-10 דקות בסך הכל. אפשר לקחת אותה לאט, ואני תמיד עוצר שם לוודא שכולם יורדים בנוחות.",
      "אם ארגיש שזה קשה מדי, יש מסלול חלופי לעקוף אותה?",
      "יש שביל עוקף מעט ארוך יותר אך מתון בהרבה. נוכל לתאם בשטח שתלך בו ואצטרף אליך — אין שום בעיה.",
      "זה מרגיע מאוד, תודה על הגישה. נרשמתי.",
      "מצוין, אל תדאג. נשים על זה עין ותיהנה מהטיול בראש שקט.",
    ],
  },
];

async function main() {
  const password = await bcrypt.hash("password123", 12);

  // A small pool of distinct hiker askers.
  const askers: string[] = [];
  for (let i = 0; i < THREADS.length; i++) {
    const u = await prisma.user.upsert({
      where: { email: `qa.thread${i}@trailhub.co.il` },
      update: {},
      create: { email: `qa.thread${i}@trailhub.co.il`, name: `מטייל שרשור ${i + 1}`, password, role: "USER", gender: i % 2 ? "נקבה" : "זכר" },
    });
    askers.push(u.id);
  }

  // Pick several guided trips (skip self-guided — they have no Q&A channel).
  const trips = await prisma.trip.findMany({
    where: { tripType: { not: "SELF_GUIDED" } },
    select: { id: true, title: true, guide: { select: { userId: true } } },
    orderBy: { createdAt: "asc" },
    take: THREADS.length,
  });

  let made = 0;
  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    const t = THREADS[i % THREADS.length];
    const guideUserId = trip.guide.userId;
    let askerId = askers[i % askers.length];
    if (askerId === guideUserId) askerId = askers[(i + 1) % askers.length];

    const q = await prisma.tripQuestion.create({
      data: {
        tripId: trip.id, userId: askerId, body: t.q, isPrivate: t.isPrivate,
        answer: t.a, answeredAt: new Date(),
      },
    });
    // Alternating follow-ups: hiker, guide, hiker, guide, …
    for (let k = 0; k < t.turns.length; k++) {
      const isHiker = k % 2 === 0;
      await prisma.tripQuestionReply.create({
        data: { questionId: q.id, userId: isHiker ? askerId : guideUserId, body: t.turns[k] },
      });
    }
    made++;
    console.log(`✓ ${trip.title.slice(0, 30)} — thread with ${t.turns.length + 2} messages${t.isPrivate ? " (private)" : ""}`);
  }

  console.log(`✅ seeded ${made} long threaded conversations`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); await pool.end(); process.exit(1); });

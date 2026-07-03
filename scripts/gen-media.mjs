// Generate short Hebrew guidance AUDIO (macOS `say` → AAC) and short Hebrew PDFs
// (pdf-lib + system Hebrew font), all as self-contained base64 data URLs, and
// attach ≥2 audio + ≥2 PDFs to every self-guided trip. Invented content, no user files.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const ONLY_TEST = process.argv.includes("--test");
const FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf";
const fontBytes = readFileSync(FONT);
const tmp = mkdtempSync(join(tmpdir(), "thmedia-"));

// ── Hebrew audio scripts (short, ≤ ~30s each) ──
const AUDIO = [
  { name: "פתיחה ובטיחות", text: "ברוכים הבאים למסלול. לפני היציאה ודאו שיש לכם מספיק מים, כובע ונעליים סגורות. שמרו על השבילים המסומנים ואל תקצרו דרך." },
  { name: "תצפית ונוף", text: "בנקודה זו כדאי לעצור, לשתות מים ולהתבונן בנוף שסביבכם. שימו לב לצמחייה המיוחדת של האזור ולציפורים שמעליכם." },
  { name: "ירידה תלולה", text: "לפניכם ירידה תלולה בין סלעים. רדו לאט, פזרו את המשקל על הרגליים והיעזרו בידיים במקומות התלולים. אל תמהרו." },
  { name: "רקע היסטורי", text: "האזור הזה עשיר בהיסטוריה. השרידים שלפניכם הם עדות ליישוב קדום ששכן כאן לפני מאות שנים. הקפידו לא לגעת ולא לטפס עליהם." },
  { name: "מקור מים", text: "אתם מתקרבים למקור מים. בעונה הוא זורם וקריר, אך אל תסתמכו עליו בקיץ. שמרו על ניקיון המקום ואל תשאירו פסולת." },
  { name: "לקראת סיום", text: "הגעתם כמעט לסוף המסלול, כל הכבוד. לפני הנסיעה חזרה שתו מים, נוחו בצל ובדקו שלא שכחתם דבר." },
];

// ── Hebrew PDF documents (short, ≤ ~half page). Digits avoided (spelled out). ──
const PDFS = [
  { title: "בטיחות במסלול", lines: ["הביאו מים בכמות מספקת לכל אדם, לפחות שני ליטר.", "צאו מוקדם בבוקר והימנעו משעות החום.", "הישארו בשביל המסומן ואל תקצרו דרך.", "הודיעו למישהו לאן אתם יוצאים ומתי חוזרים.", "במקרה חירום התקשרו למוקד וציינו את שם המסלול."] },
  { title: "כללי התנהגות בטבע", lines: ["קחו עמכם חזרה את כל הפסולת שלכם.", "אל תקטפו צמחים ואל תפריעו לבעלי החיים.", "שמרו על שקט ואל תשמיעו מוזיקה בקול.", "אל תדליקו אש אלא במקומות המותרים בלבד.", "השאירו את הטבע נקי ויפה עבור הבאים אחריכם."] },
  { title: "מדריך צמחייה", lines: ["באזור צומחים אלון מצוי, אלה ובר זית.", "בעונת האביב פורחים כלנית, נורית ורקפת.", "שיחי הלוטם מכסים את המדרונות בוורוד.", "היזהרו מצמחים קוצניים לאורך השביל.", "אל תטעמו פירות בר שאינכם מזהים בוודאות."] },
  { title: "רקע גיאולוגי", lines: ["הסלע הבולט באזור הוא גיר וקירטון.", "לאורך השנים חרתו המים ערוצים עמוקים.", "שכבות הסלע מספרות על ים קדום ששכן כאן.", "שימו לב למאובנים הקטנים בתוך הגיר.", "התצורות הצבעוניות נוצרו ממינרלים שונים."] },
  { title: "רקע היסטורי", lines: ["במקום התקיים יישוב כבר בתקופת המקרא.", "נמצאו כאן בורות מים חצובים וגתות עתיקות.", "דרך קדומה עברה כאן וחיברה בין ערים.", "השרידים משמרים סיפור של דורות רבים.", "הקפידו לשמור על האתר ולא לפגוע בו."] },
  { title: "המלצות עונתיות", lines: ["בחורף המסלול ירוק ופורח אך עלול להיות בוצי.", "באביב מזג האוויר נעים והפריחה בשיאה.", "בקיץ צאו עם אור ראשון והביאו מים רבים.", "בסתיו הצבעים מתחלפים והחום מתמתן.", "בדקו תחזית לפני היציאה, במיוחד סכנת שיטפונות."] },
];

function pdfDataUrl(doc) {
  return doc;
}

// Build a small right-aligned Hebrew PDF and return a data URL.
async function makePdf(def) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const W = 440, H = 300, margin = 34;
  const page = pdf.addPage([W, H]);
  const green = rgb(0.1, 0.42, 0.29);
  const dark = rgb(0.13, 0.13, 0.13);
  const rtl = (s) => s.normalize("NFC"); // NO reversal test
  const drawRight = (text, y, size, color) => {
    const t = rtl(text);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: W - margin - w, y, size, font, color });
  };
  drawRight(def.title, H - margin - 6, 20, green);
  page.drawLine({ start: { x: margin, y: H - margin - 16 }, end: { x: W - margin, y: H - margin - 16 }, thickness: 1, color: green });
  let y = H - margin - 44;
  for (const line of def.lines) {
    drawRight("•  " + line, y, 12.5, dark);
    y -= 26;
  }
  drawRight("בשבילי נברא העולם — דרך אחרת לטייל", 22, 9, rgb(0.5, 0.5, 0.5));
  const bytes = await pdf.save();
  return "data:application/pdf;base64," + Buffer.from(bytes).toString("base64");
}

function makeAudio(def, idx) {
  const out = join(tmp, `a${idx}.m4a`);
  execFileSync("say", ["-v", "Carmit", "-o", out, "--data-format=aac", def.text]);
  const b64 = readFileSync(out).toString("base64");
  unlinkSync(out);
  return "data:audio/mp4;base64," + b64;
}

async function main() {
  console.log("Generating audio pool via say…");
  const audioUrls = AUDIO.map((a, i) => ({ name: a.name, url: makeAudio(a, i) }));
  console.log("Generating PDF pool via pdf-lib…");
  const pdfUrls = [];
  for (const p of PDFS) pdfUrls.push({ title: p.title, url: await makePdf(p) });

  const aKB = audioUrls.map((a) => Math.round(a.url.length / 1024));
  const pKB = pdfUrls.map((p) => Math.round(p.url.length / 1024));
  console.log("audio sizes (KB):", aKB.join(","), "| pdf sizes (KB):", pKB.join(","));

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(
    `select id, title, "waypointsJson", "sourceMaterials" from "Trip"
     where "tripType"='SELF_GUIDED' and "waypointsJson" is not null
       and jsonb_array_length("waypointsJson") >= 2
     order by "createdAt" asc`
  );
  console.log(`Updating ${rows.length} self-guided trips${ONLY_TEST ? " (TEST: first 1 only)" : ""}…`);

  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    if (ONLY_TEST && i >= 1) break;
    const t = rows[i];
    const wps = Array.isArray(t.waypointsJson) ? t.waypointsJson : [];
    // Pick two distinct audio clips + two distinct PDFs, rotating per trip.
    const a1 = audioUrls[i % audioUrls.length];
    const a2 = audioUrls[(i + 3) % audioUrls.length];
    const p1 = pdfUrls[i % pdfUrls.length];
    const p2 = pdfUrls[(i + 2) % pdfUrls.length];

    // Attach audio to two waypoints (first content stop + a middle stop).
    const idxA = Math.min(1, wps.length - 1);
    const idxB = Math.min(Math.max(2, Math.floor(wps.length / 2)), wps.length - 1);
    const targets = idxA === idxB ? [idxA] : [idxA, idxB];
    const clips = [a1, a2];
    targets.forEach((wi, k) => {
      wps[wi] = { ...wps[wi], audioUrl: clips[k % 2].url, audioName: clips[k % 2].name + ".m4a", audioDuration: 0 };
    });
    // If only one distinct target, ensure a second waypoint still gets the 2nd clip.
    if (targets.length === 1 && wps.length >= 2) {
      const other = idxA === 0 ? 1 : 0;
      wps[other] = { ...wps[other], audioUrl: a2.url, audioName: a2.name + ".m4a", audioDuration: 0 };
    }

    // Trip-level source materials: keep existing non-pdf links + our 2 PDFs.
    const existing = Array.isArray(t.sourceMaterials) ? t.sourceMaterials.filter((m) => m && m.type !== "pdf") : [];
    const sources = [
      { type: "pdf", url: p1.url, title: p1.title, description: "חומר הדרכה קצר להורדה ולעיון." },
      { type: "pdf", url: p2.url, title: p2.title, description: "חומר הדרכה קצר להורדה ולעיון." },
      ...existing,
    ];

    await client.query(`update "Trip" set "waypointsJson"=$1::jsonb, "sourceMaterials"=$2::jsonb where id=$3`, [JSON.stringify(wps), JSON.stringify(sources), t.id]);
    n++;
    if (ONLY_TEST) {
      writeFileSync("/tmp/th_sample.pdf", Buffer.from(p1.url.split(",")[1], "base64"));
      console.log(`  ✓ ${t.title} — audio→wps[${targets.join(",")}], pdfs: ${p1.title}, ${p2.title}`);
      console.log("  wrote /tmp/th_sample.pdf for inspection");
    }
  }
  console.log(`✅ updated ${n} trips`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

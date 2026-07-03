import { NextRequest, NextResponse } from "next/server";

// On-demand translation of USER-GENERATED content (never stored). Triggered by the
// per-item "Translate" button. Uses the public Google translate endpoint (no key).
export async function POST(req: NextRequest) {
  const { text, to } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  const target = to === "he" ? "he" : "en";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text.slice(0, 4000))}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("upstream " + res.status);
    const data = await res.json();
    // data[0] is an array of [translatedChunk, originalChunk, ...] segments.
    const translated = Array.isArray(data?.[0]) ? data[0].map((seg: unknown[]) => seg?.[0] ?? "").join("") : "";
    const detected = typeof data?.[2] === "string" ? data[2] : undefined;
    if (!translated) throw new Error("no translation");
    return NextResponse.json({ translated, detected });
  } catch {
    return NextResponse.json({ error: "translate_failed" }, { status: 502 });
  }
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { googleCalendarUrl } from "@/lib/calendar";
import { coverImages } from "@/lib/tripImage";
import { useDateFmt } from "@/components/CalendarModeProvider";
import {
  ArrowRight, Check, ChevronDown, Lock, CalendarPlus, Search, CreditCard, Backpack, Bell, FileText,
} from "lucide-react";

interface RegField { id: string; label: string; type: "text" | "boolean" | "select"; required: boolean; options: string[] }

interface Trip {
  id: string; title: string; region: string; difficulty: string; status: string;
  date: string; startTime: string; price: number; maxSpots: number; spotsBooked: number;
  images: string[]; cancellationPolicy: string | null; registrationFields: RegField[] | null;
  healthDeclarationUrl: string | null;
  priceTiers: { label: string; price: string | number }[] | null;
  multiPersonMode: string | null; tripType: string | null; accessWindowDays: number | null;
  guide: { user: { name: string | null } };
}

interface Participant {
  name: string; age: string; gender: string; fitness: string; special: string;
  tier: string;        // price-category label ("" = base price)
  userEmail?: string;  // set when an existing platform user is picked
}

// Compact autocomplete to attach an existing platform user to a participant slot.
function ExistingUserSearch({ onPick }: { onPick: (u: { name: string; email: string }) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
        setRes(r.ok ? await r.json() : []); setOpen(true);
      } catch { setRes([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="או בחר משתמש קיים (שם / אימייל)…"
        className="w-full rounded-lg px-3 py-2 text-xs bg-surface-2 border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent" />
      {open && res.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
          {res.map((u) => (
            <button key={u.id} type="button"
              onClick={() => { onPick({ name: u.name ?? u.email, email: u.email }); setQ(""); setRes([]); setOpen(false); }}
              className="w-full text-right px-3 py-2 text-xs hover:bg-surface-2 flex justify-between gap-2">
              <span className="text-fg">{u.name ?? u.email}</span>
              <span className="text-[10px] text-fg-faint">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FULL_GREG = { weekday: "long", day: "numeric", month: "long" } as const;

// ── Card form (saved card option + save new card) ──
function CardForm({ note }: { note: string }) {
  const [mode, setMode] = useState<"saved" | "new">("saved");
  const [saveNew, setSaveNew] = useState(false);
  const input = "w-full rounded-lg px-3 py-2 text-sm bg-surface-2 border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent";
  return (
    <div className="flex flex-col gap-2.5">
      {/* Saved card option */}
      <button type="button" onClick={() => setMode("saved")}
        className="flex items-center gap-3 rounded-xl p-3 border text-right"
        style={{ borderColor: mode === "saved" ? "var(--accent)" : "var(--border)", background: mode === "saved" ? "rgba(61,143,95,0.08)" : "transparent" }}>
        <CreditCard size={18} style={{ color: "var(--fg-muted)" }} />
        <div className="flex-1">
          <div className="text-sm text-fg">כרטיס שמור</div>
          <div className="text-[11px] text-fg-faint" dir="ltr">Visa •••• 4242</div>
        </div>
        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: mode === "saved" ? "var(--accent)" : "var(--border)" }}>
          {mode === "saved" && <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
        </div>
      </button>

      <button type="button" onClick={() => setMode("new")}
        className="flex items-center gap-3 rounded-xl p-3 border text-right"
        style={{ borderColor: mode === "new" ? "var(--accent)" : "var(--border)", background: mode === "new" ? "rgba(61,143,95,0.08)" : "transparent" }}>
        <CreditCard size={18} style={{ color: "var(--fg-muted)" }} />
        <div className="flex-1 text-sm text-fg">כרטיס חדש</div>
        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: mode === "new" ? "var(--accent)" : "var(--border)" }}>
          {mode === "new" && <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
        </div>
      </button>

      {mode === "new" && (
        <div className="flex flex-col gap-2.5 pt-1">
          <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} dir="ltr" className={input} />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="text" placeholder="MM/YY" maxLength={5} dir="ltr" className={input} />
            <input type="text" placeholder="CVV" maxLength={4} dir="ltr" className={input} />
          </div>
          <input type="text" placeholder="שם בעל הכרטיס" className={input} />
          <button type="button" onClick={() => setSaveNew((v) => !v)} className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="w-4 h-4 rounded flex items-center justify-center border" style={{ borderColor: saveNew ? "var(--accent)" : "var(--border)", background: saveNew ? "var(--accent)" : "transparent" }}>
              {saveNew && <Check size={11} color="#fff" />}
            </span>
            שמור כרטיס זה להרשמות עתידיות
          </button>
        </div>
      )}

      <div className="flex items-start gap-1.5 text-[11px] text-fg-faint rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
        <Lock size={12} className="mt-0.5 shrink-0" /> {note}
      </div>
    </div>
  );
}

function TripSummary({ trip }: { trip: Trip }) {
  const dfmt = useDateFmt();
  const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 0);
  const isSG = trip.tripType === "SELF_GUIDED";
  return (
    <div className="flex items-center gap-3 p-4 border-b border-border">
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverImages(trip.images, trip.id, { region: trip.region, title: trip.title })[0]} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-fg leading-snug mb-0.5 truncate">{trip.title}</div>
        <div className="text-xs text-fg-muted">
          {isSG ? `טיול עצמאי · ${trip.guide?.user?.name || "מדריך"}`
            : `${dfmt(trip.date, { long: true, weekday: true, greg: FULL_GREG })} · ${trip.startTime} · ${spotsLeft} מקומות נותרו`}
        </div>
      </div>
      <div className="text-left shrink-0">
        <div className="text-lg font-semibold" style={trip.price === 0 ? { color: "var(--accent)" } : { color: "var(--fg)" }}>{trip.price === 0 ? "חינם" : `₪${trip.price}`}</div>
        <div className="text-[11px] text-fg-faint">{isSG ? "לחבילה" : "לאדם"}</div>
      </div>
    </div>
  );
}

// ── Full registration flow ──
function RegisterFlow({ trip, onSuccess }: { trip: Trip; onSuccess: (alertHours: number) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [policyOpen, setPolicyOpen] = useState(false);
  const fields = trip.registrationFields ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState(false);
  const [healthText, setHealthText] = useState("");
  const [alertHours, setAlertHours] = useState("24");
  const [anonymous, setAnonymous] = useState(false);
  const [compCode, setCompCode] = useState("");

  const isMulti = trip.multiPersonMode === "simple" || trip.multiPersonMode === "detailed";
  const isDetailed = trip.multiPersonMode === "detailed";
  const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 1);
  const [count, setCount] = useState(1);
  const emptyPart = (): Participant => ({ name: "", age: "", gender: "", fitness: "", special: "", tier: "" });
  const [participants, setParticipants] = useState<Participant[]>([emptyPart()]);

  // Price categories: base price + guide-defined tiers (ילדים / סטודנטים / גמלאים…)
  const priceTiers = trip.priceTiers ?? [];
  const hasTiers = priceTiers.length > 0;
  const categories = [
    { label: "מחיר רגיל", value: "", price: trip.price },
    ...priceTiers.map((t) => ({ label: t.label, value: t.label, price: Number(t.price) || 0 })),
  ];
  const tierPrice = (tier: string) => categories.find((c) => c.value === tier)?.price ?? trip.price;

  const policy = trip.cancellationPolicy ? trip.cancellationPolicy.split("\n").filter(Boolean)
    : ["עד 72 שעות לפני — החזר 100%", "עד 24 שעות לפני — החזר 50%", "פחות מ-24 שעות — ללא החזר"];

  // Total = sum of each participant's chosen category (one combined payment).
  // Platform fee is NOT added — the hiker pays exactly the guide's price.
  const total = (isMulti || hasTiers)
    ? participants.slice(0, count).reduce((s, p) => s + tierPrice(p.tier), 0)
    : trip.price * count;
  const input = "rounded-lg px-3 py-2 text-sm bg-surface-2 border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent";

  function setAnswer(id: string, val: string) { setAnswers((a) => ({ ...a, [id]: val })); }
  function patchPart(i: number, patch: Partial<Participant>) {
    setParticipants((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function changeCount(n: number) {
    const c = Math.max(1, Math.min(n, spotsLeft));
    setCount(c);
    setParticipants((prev) => Array.from({ length: c }, (_, i) => prev[i] ?? emptyPart()));
  }

  async function confirm() {
    for (const f of fields) {
      if (f.required && !(answers[f.id] ?? "").trim()) { setError(`נא למלא: ${f.label}`); return; }
    }
    if (isDetailed) {
      for (let i = 0; i < count; i++) if (!(participants[i]?.name ?? "").trim()) { setError(`נא להזין שם משתתף ${i + 1}`); return; }
    }
    if (trip.healthDeclarationUrl && !healthText.trim()) { setError("נא לחתום על הצהרת הבריאות"); return; }
    if (!signed) { setError("נא לאשר את מדיניות הביטולים"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/registrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id, type: "REGISTER", fieldAnswers: answers, signedPolicy: signed,
          healthDeclaration: trip.healthDeclarationUrl ? healthText.trim() : undefined,
          alertThresholdHours: Number(alertHours) || 24, compCode: compCode.trim() || undefined,
          anonymous,
          participantCount: count,
          participantsDetail: (isMulti || hasTiers)
            ? participants.slice(0, count).map((p) => ({
                name: p.name.trim(), age: p.age || undefined, gender: p.gender || undefined,
                fitness: p.fitness || undefined, special: p.special || undefined,
                tier: p.tier || undefined, userEmail: p.userEmail,
              }))
            : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "שגיאה בהרשמה"); setSaving(false); return; }
      onSuccess(Number(alertHours) || 24);
    } catch { setError("שגיאת רשת"); setSaving(false); }
  }

  return (
    <>
      {/* Step 1: cancellation policy + confirmation checkbox */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2"><StepDot n={1} /><span className="text-sm font-medium text-fg">מדיניות ביטולים</span></div>
        <div className="rounded-xl p-3 border border-border" style={{ background: "var(--surface-2)" }}>
          {policy.map((line, i) => {
            const dash = line.indexOf("—");
            const left = dash >= 0 ? line.slice(0, dash).trim() : line;
            const right = dash >= 0 ? line.slice(dash + 1).trim() : "";
            return (
              <div key={i} className="flex justify-between text-xs py-1">
                <span className="text-fg-muted">{left}</span>
                {right && <span className="text-fg font-medium">{right}</span>}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setSigned((v) => !v)} className="flex items-start gap-2.5 text-right mt-3">
          <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border" style={{ borderColor: signed ? "var(--accent)" : "var(--border)", background: signed ? "var(--accent)" : "transparent" }}>
            {signed && <Check size={13} color="#fff" />}
          </span>
          <span className="text-xs text-fg-muted leading-relaxed">קראתי ואני מאשר/ת את מדיניות הביטולים של הטיול</span>
        </button>
      </div>

      {/* Multi-person + per-participant price category */}
      {(isMulti || hasTiers) && (
        <div className="p-4 border-b border-border flex flex-col gap-3">
          {isMulti && (
            <>
              <div className="text-sm font-medium text-fg">כמה משתתפים?</div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => changeCount(count - 1)} className="w-8 h-8 rounded-full border border-border text-lg text-fg">−</button>
                <span className="text-lg font-semibold w-8 text-center text-fg">{count}</span>
                <button type="button" onClick={() => changeCount(count + 1)} className="w-8 h-8 rounded-full border border-border text-lg text-fg">+</button>
                <span className="text-[11px] text-fg-faint mr-2">עד {spotsLeft} מקומות פנויים</span>
              </div>
            </>
          )}

          {/* Detailed: full form per participant */}
          {isDetailed && (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: count }).map((_, i) => {
                const p = participants[i] ?? emptyPart();
                return (
                  <div key={i} className="border border-border rounded-xl p-3 flex flex-col gap-2">
                    <div className="text-xs font-medium text-fg-muted">משתתף {i + 1}</div>
                    <input type="text" value={p.name} onChange={(e) => patchPart(i, { name: e.target.value })} placeholder="שם מלא" className={input} />
                    <ExistingUserSearch onPick={(u) => patchPart(i, { name: u.name, userEmail: u.email })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min="0" value={p.age} onChange={(e) => patchPart(i, { age: e.target.value })} placeholder="גיל" className={input} dir="ltr" />
                      <select value={p.gender} onChange={(e) => patchPart(i, { gender: e.target.value })} className={`${input} bg-surface-2`}>
                        <option value="">מין</option><option value="זכר">זכר</option><option value="נקבה">נקבה</option><option value="אחר">אחר</option>
                      </select>
                      <select value={p.fitness} onChange={(e) => patchPart(i, { fitness: e.target.value })} className={`${input} bg-surface-2`}>
                        <option value="">כושר גופני</option><option value="נמוך">נמוך</option><option value="בינוני">בינוני</option><option value="גבוה">גבוה</option><option value="מצוין">מצוין</option>
                      </select>
                      <input type="text" value={p.special} onChange={(e) => patchPart(i, { special: e.target.value })} placeholder="צרכים מיוחדים (אופ')" className={input} />
                    </div>
                    {hasTiers && (
                      <select value={p.tier} onChange={(e) => patchPart(i, { tier: e.target.value })} className={`${input} bg-surface-2`}>
                        {categories.map((c) => <option key={c.value} value={c.value}>{c.label} — ₪{c.price}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Simple (quantity) or single — a price category per participant */}
          {!isDetailed && hasTiers && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-medium text-fg-muted">קטגוריית מחיר לכל משתתף</div>
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-fg-muted w-16 shrink-0">משתתף {i + 1}</span>
                  <select value={participants[i]?.tier ?? ""} onChange={(e) => patchPart(i, { tier: e.target.value })} className={`${input} bg-surface-2 flex-1`}>
                    {categories.map((c) => <option key={c.value} value={c.value}>{c.label} — ₪{c.price}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-sm pt-1 border-t border-border">
            <span className="text-fg-muted">סה״כ לתשלום</span>
            <span className="font-semibold text-fg">₪{total.toLocaleString("he-IL")}</span>
          </div>
        </div>
      )}

      {/* Health declaration — view/download the PDF + sign a confirmation */}
      {trip.healthDeclarationUrl && (
        <div className="p-4 border-b border-border flex flex-col gap-2">
          <div className="text-sm font-medium text-fg">הצהרת בריאות</div>
          <a href={trip.healthDeclarationUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-accent border border-border rounded-lg px-3 py-2 hover:bg-surface-2 w-fit">
            <FileText size={14} /> צפה / הורד את הצהרת הבריאות (PDF)
          </a>
          <label className="text-xs text-fg-muted mt-1">אני חותם על כך ש… <span className="text-danger">*</span></label>
          <textarea value={healthText} onChange={(e) => setHealthText(e.target.value)} rows={2}
            placeholder="קראתי את הצהרת הבריאות ואני מאשר/ת שאין לי מגבלה רפואית להשתתפות…"
            className={`${input} resize-none`} />
        </div>
      )}

      {/* Step 2: dynamic fields (only if defined) */}
      {fields.length > 0 && (
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <div className="flex items-center gap-2"><StepDot n={2} /><span className="text-sm font-medium text-fg">שאלות לפני הרשמה</span></div>
          {fields.map((f) => (
            <div key={f.id} className="flex flex-col gap-1">
              <label className="text-xs text-fg-muted">{f.label}{f.required && <span className="text-danger"> *</span>}</label>
              {f.type === "text" && <input type="text" value={answers[f.id] ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} className={input} />}
              {f.type === "boolean" && (
                <div className="flex gap-2">
                  {[["yes", "כן"], ["no", "לא"]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setAnswer(f.id, val)}
                      className="flex-1 py-2 rounded-lg border text-xs"
                      style={answers[f.id] === val ? { borderColor: "var(--accent)", background: "rgba(61,143,95,0.1)", color: "var(--fg)" } : { borderColor: "var(--border)", color: "var(--fg-muted)" }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {f.type === "select" && (
                <select value={answers[f.id] ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} className={`${input} bg-surface-2`}>
                  <option value="">בחר…</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comp code */}
      <div className="p-4 border-b border-border">
        <label className="text-xs text-fg-muted">קוד מתנדב (אופציונלי)</label>
        <input type="text" value={compCode} onChange={(e) => setCompCode(e.target.value)} placeholder="COMP-XXXXXX" dir="ltr" className={`w-full mt-1 ${input}`} />
        {compCode.trim() && <p className="text-[11px] text-accent mt-1">עם קוד מתנדב ההרשמה ללא תשלום</p>}
      </div>

      {/* Step 3: payment */}
      <div className={`p-4 border-b border-border ${compCode.trim() ? "hidden" : ""}`}>
        <div className="flex items-center gap-2 mb-3"><StepDot n={3} /><span className="text-sm font-medium text-fg">תשלום</span></div>
        <CardForm note="הכרטיס יאושר עכשיו אך לא יחויב — החיוב יתבצע רק לאחר סגירת חלון הביטול." />
      </div>

      {/* Price summary — no service fee (hiker pays exactly the guide's price) */}
      <div className="p-4 border-b border-border">
        <div className="rounded-xl p-3 border border-border" style={{ background: "var(--surface-2)" }}>
          <div className="flex justify-between text-sm py-1">
            <span className="text-fg-muted">מחיר לאדם{count > 1 ? ` × ${count}` : ""}</span><span className="text-fg">₪{trip.price * count}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-border">
            <span className="text-fg">סה״כ לאישור</span><span className="text-fg">₪{total}</span>
          </div>
        </div>
        <button type="button" onClick={() => setPolicyOpen((v) => !v)} className="flex items-center justify-between w-full mt-3 text-xs text-fg-muted">
          <span>מדיניות ביטולים מלאה</span>
          <ChevronDown size={14} className={`transition-transform ${policyOpen ? "rotate-180" : ""}`} />
        </button>
        {policyOpen && (
          <div className="mt-2 rounded-xl p-3 border border-border" style={{ background: "var(--surface-2)" }}>
            {policy.map((line, i) => <div key={i} className="text-xs text-fg-muted py-0.5">{line}</div>)}
          </div>
        )}
      </div>

      {/* Step 4: cancellation threshold alert (per-trip) */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1"><StepDot n={4} /><span className="text-sm font-medium text-fg">התראת סף ביטול</span></div>
        <div className="text-xs text-fg-muted mb-2">קבל התראה לפני כניסה לחלון ללא החזר (הגדרה לטיול זה)</div>
        <div className="flex items-center gap-2 text-sm text-fg">
          שלח לי התראה
          <input type="number" min="1" value={alertHours} onChange={(e) => setAlertHours(e.target.value)}
            className={`w-16 text-center ${input}`} dir="ltr" />
          שעות לפני
        </div>
      </div>

      {/* Privacy: visibility in the fellow-registrants list */}
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-fg mb-1">פרטיות ברשימת המשתתפים</div>
        <div className="text-xs text-fg-muted mb-2">נרשמים אחרים רואים את רשימת המשתתפים</div>
        <div className="grid grid-cols-2 gap-2">
          {[[false, "הירשם גלוי", "השם שלך יוצג"], [true, "הירשם אנונימי", "יוצג \"משתתף אנונימי\""]].map(([val, t, s]) => (
            <button key={String(val)} type="button" onClick={() => setAnonymous(val as boolean)}
              className="py-2.5 px-2 border rounded-xl text-xs text-center"
              style={anonymous === val ? { borderColor: "var(--accent)", background: "rgba(61,143,95,0.1)", color: "var(--fg)" } : { borderColor: "var(--border)", color: "var(--fg-muted)" }}>
              <div className="font-medium mb-0.5">{t as string}</div>
              <div className="text-[10px] text-fg-faint">{s as string}</div>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="px-4 pt-3 text-xs text-danger">{error}</div>}

      <div className="p-4">
        <button type="button" onClick={confirm} disabled={saving}
          className="w-full py-3 rounded-full text-sm font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {saving ? "מאשר…" : "אשר הרשמה ←"}
        </button>
      </div>
    </>
  );
}

function StepDot({ n }: { n: number }) {
  return <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>{n}</span>;
}

// ── Step 5: confirmation screen ──
function SuccessScreen({ trip, alertHours }: { trip: Trip; alertHours: number }) {
  const router = useRouter();
  const dfmt = useDateFmt();
  const total = trip.price;
  const chargeDate = dfmt(new Date(new Date(trip.date).getTime() - 24 * 3600 * 1000), { greg: { day: "numeric", month: "short" } });
  return (
    <div className="p-6 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(61,143,95,0.15)" }}>
        <Check size={26} style={{ color: "var(--accent)" }} />
      </div>
      <div className="text-lg font-semibold text-fg mb-1">נרשמת בהצלחה!</div>
      <div className="text-sm text-fg-muted mb-4 leading-relaxed">אישור נשלח למייל. הכרטיס יחויב לאחר סגירת חלון ביטול מלא.</div>
      <div className="rounded-xl p-3 text-right mb-4 border border-border" style={{ background: "var(--surface-2)" }}>
        {[
          ["טיול", trip.title],
          ["תאריך ושעה", `${dfmt(trip.date, { long: true, weekday: true, greg: FULL_GREG })} · ${trip.startTime}`],
          ["מדריך", trip.guide?.user?.name || "מדריך"],
          ["סכום", total === 0 ? "חינם" : `₪${total}`],
          ["מועד חיוב", `${chargeDate} · אם לא בוטל`],
          ["התראת ביטול", `${alertHours} שעות לפני חלון החיוב`],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm py-1">
            <span className="text-fg-muted">{label}</span>
            <span className="text-fg font-medium">{val}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <a href={googleCalendarUrl({ title: trip.title, dateISO: trip.date, startTime: trip.startTime, location: trip.region })}
          target="_blank" rel="noreferrer"
          className="w-full py-3 rounded-full text-sm font-medium flex items-center justify-center gap-1.5" style={{ border: "1px solid var(--border)", color: "var(--fg)" }}>
          <CalendarPlus size={15} /> הוסף ליומן Google
        </a>
        <button type="button" onClick={() => router.push("/trips")}
          className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          <Search size={15} /> חזרה לחיפוש
        </button>
      </div>
    </div>
  );
}

// ── Conditional interest flow ──
function InterestFlow({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [conditions, setConditions] = useState<string[]>([""]);
  const [autoRegister, setAutoRegister] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(true);
  const [spotThreshold, setSpotThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const input = "rounded-lg px-3 py-2 text-sm bg-surface-2 border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent";

  async function save() {
    const filled = conditions.filter((c) => c.trim());
    setSaving(true);
    const notes = filled.length > 0
      ? `תנאי: ${filled.join(" וגם ")} | ${autoRegister ? "רשום אוטומטית" : "שלח התראה"}`
      : `מתעניין${spotThreshold ? ` · התראה כשנותרו ${spotThreshold} מקומות` : ""}`;
    try {
      await fetch("/api/registrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id, type: "INTEREST", notes, conditions: filled,
          autoRegister: filled.length > 0 ? autoRegister : false,
          interestThreshold: spotThreshold ? Number(spotThreshold) : undefined,
        }),
      });
      setDone(true);
    } finally { setSaving(false); }
  }

  if (done) return <DoneScreen title="העניין שלך נשמר!" body="תקבל עדכון כשהתנאים מתקיימים." />;

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-fg mb-1">עניין פשוט</div>
        <div className="flex items-center gap-2 text-sm text-fg">
          <Bell size={14} style={{ color: "var(--accent)" }} /> שלח לי התראה כשנותרו
          <input type="number" min="1" value={spotThreshold} onChange={(e) => setSpotThreshold(e.target.value)} placeholder="5" className={`w-16 text-center ${input}`} dir="ltr" />
          מקומות
        </div>
        <div className="text-[11px] text-fg-faint mt-1">או הגדר תנאים מתקדמים למטה</div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-fg mb-1">עניין מותנה</div>
        <div className="text-xs text-fg-muted mb-3">אירשם לטיול רק כש<strong>כל</strong> התנאים הבאים מתקיימים:</div>
        <div className="flex flex-col gap-2 mb-3">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
              <span className="text-[10px] font-medium rounded px-1.5 py-0.5" style={i === 0 ? { background: "var(--border)", color: "var(--fg-muted)" } : { background: "var(--accent)", color: "#fff" }}>
                {i === 0 ? "אם" : "וגם"}
              </span>
              <input type="text" value={cond} onChange={(e) => { const next = [...conditions]; next[i] = e.target.value; setConditions(next); }}
                placeholder="הוסף תנאי…" className="flex-1 bg-transparent border-none outline-none text-sm text-fg" />
              {conditions.length > 1 && <button type="button" onClick={() => setConditions(conditions.filter((_, j) => j !== i))} className="text-fg-faint">✕</button>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setConditions([...conditions, ""])} className="text-accent text-sm">＋ הוסף תנאי נוסף</button>
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-fg mb-3">כשהתנאים מתקיימים</div>
        <div className="grid grid-cols-2 gap-2">
          {[[true, "רשום אותי אוטומטית", "יחויב מיד ללא החזר"], [false, "שלח לי התראה", "תחרות עם ממתינים אחרים"]].map(([val, t, s]) => (
            <button key={String(val)} type="button" onClick={() => setAutoRegister(val as boolean)}
              className="py-2.5 px-2 border rounded-xl text-xs text-center"
              style={autoRegister === val ? { borderColor: "var(--accent)", background: "rgba(61,143,95,0.1)", color: "var(--fg)" } : { borderColor: "var(--border)", color: "var(--fg-muted)" }}>
              <div className="font-medium mb-0.5">{t as string}</div>
              <div className="text-[10px] text-fg-faint">{s as string}</div>
            </button>
          ))}
        </div>
      </div>

      {autoRegister && (
        <div className="p-4 border-b border-border">
          <div className="text-sm font-medium text-fg mb-3">פרטי כרטיס לחיוב אוטומטי</div>
          <CardForm note="הכרטיס יאושר עכשיו ויחויב אוטומטית כשהתנאים מתקיימים — ללא אפשרות החזר." />
        </div>
      )}

      <div className="p-4 border-b border-border">
        <button type="button" onClick={() => setNotifyChanges((v) => !v)} className="flex items-center gap-3">
          <span className="w-5 h-5 rounded flex items-center justify-center border" style={{ borderColor: notifyChanges ? "var(--accent)" : "var(--border)", background: notifyChanges ? "var(--accent)" : "transparent" }}>
            {notifyChanges && <Check size={13} color="#fff" />}
          </span>
          <span className="text-sm text-fg">עדכן אותי על כל שינוי בטיול</span>
        </button>
      </div>

      <div className="p-4">
        <button type="button" onClick={save} disabled={saving}
          className="w-full py-3 rounded-full text-sm font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {saving ? "שומר…" : autoRegister ? "שמור עניין על תנאי + אשר כרטיס ←" : "שמור עניין על תנאי ←"}
        </button>
      </div>
    </>
  );
}

// ── Waitlist flow ──
function WaitlistFlow({ trip }: { trip: Trip }) {
  const [autoJoin, setAutoJoin] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function join() {
    setSaving(true);
    const notes = autoJoin ? "רשום אוטומטית כשמתפנה מקום" : "שלח התראה כשמתפנה מקום";
    try {
      await fetch("/api/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId: trip.id, type: "WAITLIST", notes }) });
      setDone(true);
    } finally { setSaving(false); }
  }

  if (done) return <DoneScreen title="הצטרפת לרשימת ההמתנה!" body="נודיע לך ברגע שיתפנה מקום." />;

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-fg mb-2">הצטרף לרשימת ההמתנה</div>
        <div className="text-xs text-fg-muted mb-3">הטיול מלא. כשיתפנה מקום:</div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setAutoJoin(true)} className="p-3 border rounded-xl text-right"
            style={autoJoin ? { borderColor: "var(--accent)", background: "rgba(61,143,95,0.1)" } : { borderColor: "var(--border)" }}>
            <div className="text-sm font-medium mb-0.5 text-fg">⚡ רשום אותי אוטומטית</div>
            <div className="text-xs text-fg-muted leading-relaxed">כשמתפנה מקום — נרשם ומחויב מיד. מובטח מקום.</div>
            {autoJoin && <div className="mt-2 rounded-lg px-2 py-1.5 text-xs" style={{ background: "rgba(217,83,79,0.15)", color: "#e88" }}>⚠️ הכרטיס יחויב ב-₪{trip.price} ללא אפשרות החזר</div>}
          </button>
          <button type="button" onClick={() => setAutoJoin(false)} className="p-3 border rounded-xl text-right"
            style={!autoJoin ? { borderColor: "var(--accent)", background: "rgba(61,143,95,0.1)" } : { borderColor: "var(--border)" }}>
            <div className="text-sm font-medium mb-0.5 text-fg">🔔 שלח לי התראה</div>
            <div className="text-xs text-fg-muted leading-relaxed">כשמתפנה מקום — התראה לכל הממתינים בו-זמנית. מי שרושם ראשון זוכה.</div>
          </button>
        </div>
      </div>

      {autoJoin && (
        <div className="p-4 border-b border-border">
          <div className="text-sm font-medium text-fg mb-3">פרטי כרטיס לחיוב אוטומטי</div>
          <CardForm note={`הכרטיס יאושר עכשיו ויחויב אוטומטית ב-₪${trip.price} כשיתפנה מקום — ללא אפשרות החזר.`} />
        </div>
      )}

      <div className="p-4 border-b border-border">
        <button type="button" onClick={() => setNotifyChanges((v) => !v)} className="flex items-center gap-3">
          <span className="w-5 h-5 rounded flex items-center justify-center border" style={{ borderColor: notifyChanges ? "var(--accent)" : "var(--border)", background: notifyChanges ? "var(--accent)" : "transparent" }}>
            {notifyChanges && <Check size={13} color="#fff" />}
          </span>
          <span className="text-sm text-fg">עדכן אותי על כל שינוי בטיול</span>
        </button>
      </div>

      <div className="p-4">
        <button type="button" onClick={join} disabled={saving}
          className="w-full py-3 rounded-full text-sm font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {saving ? "מצטרף…" : autoJoin ? "הצטרף + אשר כרטיס ←" : "הצטרף לרשימת ההמתנה ←"}
        </button>
      </div>
    </>
  );
}

// ── Self-guided purchase flow ──
function SelfGuidedPurchaseFlow({ trip }: { trip: Trip }) {
  const router = useRouter();
  const dfmt = useDateFmt();
  const [buying, setBuying] = useState(false);
  const [done, setDone] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function buy() {
    setBuying(true);
    const res = await fetch(`/api/trips/${trip.id}/purchase`, { method: "POST" });
    setBuying(false);
    if (res.ok) { const d = await res.json().catch(() => ({})); setExpiresAt(d.purchase?.accessExpiresAt ?? null); setDone(true); }
  }

  const fmt = (iso: string | null) => iso ? dfmt(iso, { long: true, greg: { day: "numeric", month: "long", year: "numeric" } }) : "";

  const isFree = trip.price === 0;

  if (done) {
    return (
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(61,143,95,0.15)" }}><Backpack size={24} style={{ color: "var(--accent)" }} /></div>
        <div className="text-lg font-semibold text-fg mb-1">{isFree ? "נרשמת לטיול" : "הטיול נרכש"}</div>
        <div className="text-sm text-fg-muted mb-4 leading-relaxed">{isFree ? "התוכן זמין לך תמיד, ללא הגבלת זמן." : expiresAt ? `התוכן זמין לך מהיום ועד ${fmt(expiresAt)}.` : `התוכן זמין לך למשך ${trip.accessWindowDays ?? 30} ימים.`}</div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => router.push(`/trips/${trip.id}/start`)} className="w-full py-3 rounded-full text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>▶ התחל טיול</button>
          <button type="button" onClick={() => router.push("/my-trips")} className="w-full py-2.5 text-sm rounded-full" style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}>הטיולים שלי</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="rounded-xl p-3 text-xs text-fg-muted mb-3" style={{ background: "var(--surface-2)" }}>
          {isFree
            ? "טיול עצמאי חינם — תוכן הדרכה מלא, ללא תשלום, גישה חופשית ללא הגבלת זמן וללא הגבלת משתתפים."
            : "טיול עצמאי — תוכן הדרכה מלא לרכישה. תשלום מיידי וסופי, ללא תאריך וללא הגבלת משתתפים."}
        </div>
        <div className="rounded-xl p-3 border border-border" style={{ background: "var(--surface-2)" }}>
          <div className="flex justify-between text-sm py-1"><span className="text-fg-muted">מחיר לחבילה</span><span className="font-medium text-fg">{isFree ? "חינם" : `₪${trip.price}`}</span></div>
          {!isFree && <div className="flex justify-between text-xs py-1 text-fg-faint"><span>חלון גישה</span><span>{trip.accessWindowDays ?? 30} ימים מרגע הרכישה</span></div>}
          {isFree && <div className="flex justify-between text-xs py-1 text-fg-faint"><span>גישה</span><span>חופשית, ללא הגבלת זמן</span></div>}
        </div>
      </div>
      {!isFree && (
        <div className="p-4 border-b border-border">
          <div className="text-sm font-medium text-fg mb-3">פרטי תשלום</div>
          <CardForm note="תשלום מיידי וסופי — לאחר הרכישה התוכן המלא ייפתח לך מיד." />
        </div>
      )}
      <div className="p-4">
        <button type="button" onClick={buy} disabled={buying} className="w-full py-3 rounded-full text-sm font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {buying ? (isFree ? "נרשם…" : "רוכש…") : isFree ? "הירשם בחינם" : `רכוש עכשיו · ₪${trip.price}`}
        </button>
      </div>
    </>
  );
}

function DoneScreen({ title, body }: { title: string; body: string }) {
  const router = useRouter();
  return (
    <div className="p-6 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(61,143,95,0.15)" }}><Check size={26} style={{ color: "var(--accent)" }} /></div>
      <div className="text-lg font-semibold text-fg mb-1">{title}</div>
      <div className="text-sm text-fg-muted mb-4">{body}</div>
      <button type="button" onClick={() => router.push("/my-trips")} className="w-full py-3 rounded-full text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>הטיולים שלי</button>
    </div>
  );
}

// ── Main page ──
export default function RegisterPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const flow = searchParams.get("flow") ?? "register";

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [successAlert, setSuccessAlert] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${id}`).then((r) => r.json()).then((d) => { if (!d.error) setTrip(d); }).finally(() => setLoading(false));
  }, [id]);

  if (status === "loading" || loading) {
    return <div dir="rtl" className="min-h-screen bg-bg flex items-center justify-center"><div className="text-fg-faint text-sm">טוען…</div></div>;
  }
  if (!session) {
    router.replace(`/auth/login?callbackUrl=/trips/${id}/register${flow !== "register" ? `?flow=${flow}` : ""}`);
    return null;
  }
  if (!trip) {
    return <div dir="rtl" className="min-h-screen bg-bg flex items-center justify-center"><div className="text-fg-muted text-sm">הטיול לא נמצא</div></div>;
  }

  const isFull = trip.status === "FULL" || trip.spotsBooked >= trip.maxSpots;
  const isSelfGuided = trip.tripType === "SELF_GUIDED";

  function flowTitle() {
    if (isSelfGuided) return "רכישת טיול עצמאי";
    if (flow === "interest") return "מתעניין על תנאי";
    if (flow === "waitlist") return "הצטרף לרשימת המתנה";
    return "הרשמה לטיול";
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg py-4 px-3">
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => router.back()} className="text-fg-muted flex items-center gap-1 text-sm"><ArrowRight size={16} /> חזרה</button>
          <h1 className="text-sm font-semibold text-fg">{flowTitle()}</h1>
        </div>

        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <TripSummary trip={trip} />
          {isSelfGuided ? <SelfGuidedPurchaseFlow trip={trip} />
            : successAlert != null ? <SuccessScreen trip={trip} alertHours={successAlert} />
            : flow === "interest" ? <InterestFlow trip={trip} />
            : flow === "waitlist" || isFull ? <WaitlistFlow trip={trip} />
            : <RegisterFlow trip={trip} onSuccess={(h) => setSuccessAlert(h)} />}
        </div>
      </div>
    </div>
  );
}

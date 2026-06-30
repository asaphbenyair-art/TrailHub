"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };
const SERVICE_FEE = 9; // flat platform service fee (₪)

interface RegField {
  id: string;
  label: string;
  type: "text" | "boolean" | "select";
  required: boolean;
  options: string[];
}

interface Trip {
  id: string;
  title: string;
  region: string;
  difficulty: string;
  status: string;
  date: string;
  startTime: string;
  price: number;
  maxSpots: number;
  spotsBooked: number;
  images: string[];
  cancellationPolicy: string | null;
  registrationFields: RegField[] | null;
  multiPersonMode: string | null;
  tripType: string | null;
  accessWindowDays: number | null;
  guide: { user: { name: string | null } };
}

function formatDateFull(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}

function TripSummary({ trip }: { trip: Trip }) {
  const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 0);
  const isSG = trip.tripType === "SELF_GUIDED";
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
        {trip.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(160deg,#3d6b35,#1a3d16)" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 leading-snug mb-0.5 truncate">{trip.title}</div>
        <div className="text-xs text-gray-500">
          {isSG
            ? `🎒 טיול עצמאי · ${trip.guide?.user?.name || "מדריך"}`
            : `${formatDateFull(trip.date)} · ${trip.startTime} · ${trip.guide?.user?.name || "מדריך"} · ${spotsLeft} מקומות נותרו`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-lg font-semibold text-gray-900">₪{trip.price}</div>
        <div className="text-[11px] text-gray-400">{isSG ? "לחבילה" : "לאדם"}</div>
      </div>
    </div>
  );
}


// ── Normal registration flow ──────────────────────────────────────────────────
function RegisterFlow({ trip, onSuccess }: { trip: Trip; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [policyOpen, setPolicyOpen] = useState(false);
  const fields = trip.registrationFields ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState(false);
  const [alertHours, setAlertHours] = useState("24");
  const [compCode, setCompCode] = useState("");

  const isMulti = trip.multiPersonMode === "simple" || trip.multiPersonMode === "detailed";
  const isDetailed = trip.multiPersonMode === "detailed";
  const spotsLeft = Math.max(trip.maxSpots - trip.spotsBooked, 1);
  const [count, setCount] = useState(1);
  const [names, setNames] = useState<string[]>([""]);

  const policy = trip.cancellationPolicy
    ? trip.cancellationPolicy.split("\n").filter(Boolean)
    : ["עד 72 שעות לפני — החזר 100%", "עד 24 שעות לפני — החזר 50%", "פחות מ-24 שעות — ללא החזר"];

  const serviceFee = SERVICE_FEE;
  const total = trip.price * count + serviceFee;

  function setAnswer(id: string, val: string) {
    setAnswers((a) => ({ ...a, [id]: val }));
  }
  function changeCount(n: number) {
    const c = Math.max(1, Math.min(n, spotsLeft));
    setCount(c);
    setNames((prev) => Array.from({ length: c }, (_, i) => prev[i] ?? ""));
  }

  async function confirm() {
    // Validate required dynamic fields
    for (const f of fields) {
      if (f.required && !(answers[f.id] ?? "").trim()) {
        setError(`נא למלא: ${f.label}`);
        return;
      }
    }
    if (isDetailed) {
      for (let i = 0; i < count; i++) {
        if (!(names[i] ?? "").trim()) { setError(`נא להזין שם משתתף ${i + 1}`); return; }
      }
    }
    if (!signed) { setError("נא לאשר את מדיניות הביטולים"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id, type: "REGISTER", fieldAnswers: answers, signedPolicy: signed,
          alertThresholdHours: Number(alertHours) || 24, compCode: compCode.trim() || undefined,
          participantCount: count,
          participantsDetail: isDetailed ? names.slice(0, count).map((n) => ({ name: n.trim() })) : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "שגיאה בהרשמה");
        setSaving(false);
        return;
      }
      onSuccess();
    } catch {
      setError("שגיאת רשת");
      setSaving(false);
    }
  }

  return (
    <>
      {/* Multi-person quantity */}
      {isMulti && (
        <div className="p-4 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900 mb-2">כמה משתתפים?</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => changeCount(count - 1)} className="w-8 h-8 rounded-full border border-gray-200 text-lg">−</button>
            <span className="text-lg font-semibold w-8 text-center">{count}</span>
            <button type="button" onClick={() => changeCount(count + 1)} className="w-8 h-8 rounded-full border border-gray-200 text-lg">+</button>
            <span className="text-[11px] text-gray-400 mr-2">עד {spotsLeft} מקומות פנויים</span>
          </div>
          {isDetailed && (
            <div className="flex flex-col gap-1.5 mt-3">
              {Array.from({ length: count }).map((_, i) => (
                <input key={i} type="text" value={names[i] ?? ""}
                  onChange={(e) => setNames((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`שם משתתף ${i + 1}`}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dynamic registration fields */}
      {fields.length > 0 && (
        <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
          <div className="text-sm font-medium text-gray-900">שאלות לפני הרשמה</div>
          {fields.map((f) => (
            <div key={f.id} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">
                {f.label}{f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "text" && (
                <input type="text" value={answers[f.id] ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
              )}
              {f.type === "boolean" && (
                <div className="flex gap-2">
                  {[["yes", "כן"], ["no", "לא"]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setAnswer(f.id, val)}
                      className={`flex-1 py-2 rounded-lg border text-xs transition-colors ${
                        answers[f.id] === val ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {f.type === "select" && (
                <select value={answers[f.id] ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white">
                  <option value="">בחר...</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comp code (free volunteer invite) */}
      <div className="p-4 border-b border-gray-100">
        <label className="text-xs text-gray-500">קוד מתנדב (אופציונלי)</label>
        <input type="text" value={compCode} onChange={(e) => setCompCode(e.target.value)}
          placeholder="COMP-XXXXXX" dir="ltr"
          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
        {compCode.trim() && <p className="text-[11px] text-[#0F5038] mt-1">עם קוד מתנדב ההרשמה ללא תשלום</p>}
      </div>

      {/* Payment form */}
      <div className={`p-4 border-b border-gray-100 ${compCode.trim() ? "hidden" : ""}`}>
        <div className="text-sm font-medium text-gray-900 mb-3">פרטי כרטיס אשראי</div>
        <CardForm note="הכרטיס יאושר עכשיו אך לא יחויב — החיוב יתבצע רק לאחר סגירת חלון הביטול." />
      </div>

      {/* Price summary */}
      <div className="p-4 border-b border-gray-100">
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">מחיר לאדם{count > 1 ? ` × ${count}` : ""}</span><span>₪{trip.price * count}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">עמלת שירות</span><span>₪{serviceFee}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-gray-200">
            <span>סה"כ לאישור</span><span>₪{total}</span>
          </div>
        </div>

        {/* Cancellation policy — collapsible */}
        <button
          type="button"
          onClick={() => setPolicyOpen((v) => !v)}
          className="flex items-center justify-between w-full mt-3 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>🧾 מדיניות ביטולים</span>
          <span>{policyOpen ? "▲" : "▼"}</span>
        </button>
        {policyOpen && (
          <div className="mt-2 bg-[#FDF3DC] rounded-xl p-3">
            {policy.map((line, i) => {
              const dash = line.indexOf("—");
              const left = dash >= 0 ? line.slice(0, dash).trim() : line;
              const right = dash >= 0 ? line.slice(dash + 1).trim() : "";
              return (
                <div key={i} className="flex justify-between text-xs py-1">
                  <span className="text-amber-700">{left}</span>
                  {right && <span className="text-amber-900 font-medium">{right}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation-window threshold alert */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900 mb-1">התראת סף ביטול</div>
        <div className="text-xs text-gray-500 mb-2">קבל התראה לפני כניסה לחלון ללא החזר</div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          שלח לי התראה
          <input type="number" min="1" value={alertHours} onChange={(e) => setAlertHours(e.target.value)}
            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
          שעות לפני
        </div>
      </div>

      {/* Sign cancellation policy */}
      <div className="px-4 pt-3">
        <button type="button" onClick={() => setSigned((v) => !v)} className="flex items-start gap-2.5 text-right">
          <div className={`w-5 h-5 rounded flex items-center justify-center border-[1.5px] shrink-0 mt-0.5 transition-colors ${
            signed ? "bg-[#1A6B4A] border-[#1A6B4A] text-white text-xs" : "border-gray-300"}`}>
            {signed && "✓"}
          </div>
          <span className="text-xs text-gray-600 leading-relaxed">קראתי ואני מאשר/ת את מדיניות הביטולים של הטיול</span>
        </button>
      </div>

      {error && <div className="px-4 pt-3 text-xs text-red-500">{error}</div>}

      <div className="p-4">
        <button type="button" onClick={confirm} disabled={saving}
          className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60">
          {saving ? "מאשר..." : "אשר הרשמה ←"}
        </button>
      </div>
    </>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ trip }: { trip: Trip }) {
  const router = useRouter();
  const total = trip.price + SERVICE_FEE;
  return (
    <div className="p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[#D6EDE3] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
      <div className="text-lg font-semibold text-gray-900 mb-1">נרשמת בהצלחה!</div>
      <div className="text-sm text-gray-500 mb-4 leading-relaxed">אישור נשלח למייל. הכרטיס יחויב לאחר סגירת חלון ביטול מלא.</div>
      <div className="bg-gray-50 rounded-xl p-3 text-right mb-4">
        {[
          ["טיול", trip.title],
          ["תאריך", `${formatDateFull(trip.date)} · ${trip.startTime}`],
          ["מדריך", trip.guide?.user?.name || "מדריך"],
          ["סכום שאושר", `₪${total}`],
          ["חיוב בפועל", `${new Date(new Date(trip.date).getTime() - 24 * 3600 * 1000).toLocaleDateString("he-IL", { day: "numeric", month: "short" })} · אם לא בוטל`],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm py-1">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium">{val}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => router.push("/trips")}
        className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium hover:bg-[#155a3e] transition-colors">
        חזרה לחיפוש טיולים
      </button>
    </div>
  );
}

// ── Reusable card form ────────────────────────────────────────────────────────
function CardForm({ note }: { note: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <label className="block text-xs text-gray-500 mb-1">מספר כרטיס</label>
        <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} dir="ltr"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs text-gray-500 mb-1">תוקף</label>
          <input type="text" placeholder="MM/YY" maxLength={5} dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">CVV</label>
          <input type="text" placeholder="•••" maxLength={4} dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">שם בעל הכרטיס</label>
        <input type="text" placeholder="כפי שמופיע על הכרטיס"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
      </div>
      <div className="flex items-start gap-1.5 text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
        🔒 {note}
      </div>
    </div>
  );
}

// ── Conditional interest flow ─────────────────────────────────────────────────
function InterestFlow({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [conditions, setConditions] = useState<string[]>([""]);
  const [autoRegister, setAutoRegister] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(true);
  const [spotThreshold, setSpotThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    const filled = conditions.filter((c) => c.trim());
    setSaving(true);
    const notes = filled.length > 0
      ? `תנאי: ${filled.join(" וגם ")} | ${autoRegister ? "רשום אוטומטית" : "שלח התראה"}`
      : `מתעניין${spotThreshold ? ` · התראה כשנותרו ${spotThreshold} מקומות` : ""}`;
    try {
      await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id, type: "INTEREST", notes,
          conditions: filled,
          autoRegister: filled.length > 0 ? autoRegister : false,
          interestThreshold: spotThreshold ? Number(spotThreshold) : undefined,
        }),
      });
      setDone(true);
    } finally { setSaving(false); }
  }

  if (done) {
    return (
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#D6EDE3] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <div className="text-lg font-semibold text-gray-900 mb-1">העניין שלך נשמר!</div>
        <div className="text-sm text-gray-500 mb-4">תקבל עדכון כשהתנאים מתקיימים.</div>
        <button type="button" onClick={() => router.push("/my-trips")}
          className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium">
          הטיולים שלי
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Simple interest — notify when fewer than X spots remain */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900 mb-1">עניין פשוט</div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          🔔 שלח לי התראה כשנותרו
          <input type="number" min="1" value={spotThreshold} onChange={(e) => setSpotThreshold(e.target.value)}
            placeholder="5" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
          מקומות
        </div>
        <div className="text-[11px] text-gray-400 mt-1">או הגדר תנאים מתקדמים למטה</div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900 mb-1">עניין מותנה</div>
        <div className="text-xs text-gray-500 mb-3">אירשם לטיול רק כש<strong>כל</strong> התנאים הבאים מתקיימים:</div>
        <div className="flex flex-col gap-2 mb-3">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${i === 0 ? "bg-gray-200 text-gray-500" : "bg-[#1A6B4A] text-white"}`}>
                {i === 0 ? "אם" : "וגם"}
              </span>
              <input
                type="text"
                value={cond}
                onChange={(e) => {
                  const next = [...conditions];
                  next[i] = e.target.value;
                  setConditions(next);
                }}
                placeholder="הוסף תנאי..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
              />
              {conditions.length > 1 && (
                <button type="button" onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400 text-base">✕</button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setConditions([...conditions, ""])}
          className="text-[#1A6B4A] text-sm flex items-center gap-1">
          ＋ הוסף תנאי נוסף
        </button>
        <div className="text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2 mt-3 leading-relaxed">
          כל התנאים חייבים להתקיים יחד. המדריך יראה את הבקשות המצטברות.
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900 mb-3">כשהתנאים מתקיימים</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAutoRegister(true)}
            className={`py-2.5 px-2 border rounded-xl text-xs text-center transition-colors ${
              autoRegister ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
            <div className="font-medium mb-0.5">רשום אותי אוטומטית</div>
            <div className="text-[10px] text-gray-400">יחויב מיד ללא החזר</div>
          </button>
          <button type="button" onClick={() => setAutoRegister(false)}
            className={`py-2.5 px-2 border rounded-xl text-xs text-center transition-colors ${
              !autoRegister ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#0F5038]" : "border-gray-200 text-gray-600"}`}>
            <div className="font-medium mb-0.5">שלח לי התראה</div>
            <div className="text-[10px] text-gray-400">תחרות עם ממתינים אחרים</div>
          </button>
        </div>
      </div>

      {/* Card form when auto-register is chosen */}
      {autoRegister && (
        <div className="p-4 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900 mb-3">פרטי כרטיס לחיוב אוטומטי</div>
          <CardForm note="הכרטיס יאושר עכשיו ויחויב אוטומטית כשהתנאים מתקיימים — ללא אפשרות החזר." />
        </div>
      )}

      <div className="p-4 border-b border-gray-100">
        <button type="button" onClick={() => setNotifyChanges((v) => !v)}
          className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded flex items-center justify-center border-[1.5px] transition-colors ${
            notifyChanges ? "bg-[#1A6B4A] border-[#1A6B4A] text-white text-xs" : "border-gray-300"}`}>
            {notifyChanges && "✓"}
          </div>
          <span className="text-sm text-gray-700">עדכן אותי על כל שינוי בטיול</span>
        </button>
      </div>

      <div className="p-4">
        <button type="button" onClick={save} disabled={saving}
          className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60">
          {saving ? "שומר..." : autoRegister ? "שמור עניין על תנאי + אשר כרטיס ←" : "שמור עניין על תנאי ←"}
        </button>
      </div>
    </>
  );
}

// ── Waitlist flow ──────────────────────────────────────────────────────────────
function WaitlistFlow({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [autoJoin, setAutoJoin] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function join() {
    setSaving(true);
    const notes = autoJoin ? "רשום אוטומטית כשמתפנה מקום" : "שלח התראה כשמתפנה מקום";
    try {
      await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id, type: "WAITLIST", notes }),
      });
      setDone(true);
    } finally { setSaving(false); }
  }

  if (done) {
    return (
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#D6EDE3] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <div className="text-lg font-semibold text-gray-900 mb-1">הצטרפת לרשימת ההמתנה!</div>
        <div className="text-sm text-gray-500 mb-4">נודיע לך ברגע שיתפנה מקום.</div>
        <button type="button" onClick={() => router.push("/my-trips")}
          className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium">
          הטיולים שלי
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900 mb-2">הצטרף לרשימת ההמתנה</div>
        <div className="text-xs text-gray-500 mb-3">הטיול מלא. כשיתפנה מקום:</div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setAutoJoin(true)}
            className={`p-3 border rounded-xl text-right transition-colors ${
              autoJoin ? "border-[#1A6B4A] bg-[#D6EDE3]" : "border-gray-200"}`}>
            <div className={`text-sm font-medium mb-0.5 ${autoJoin ? "text-[#0F5038]" : "text-gray-900"}`}>⚡ רשום אותי אוטומטית</div>
            <div className="text-xs text-gray-500 leading-relaxed">כשמתפנה מקום — נרשם ומחויב מיד. מובטח מקום.</div>
            {autoJoin && (
              <div className="mt-2 bg-[#FADBD8] rounded-lg px-2 py-1.5 text-xs text-[#791F1F]">
                ⚠️ הכרטיס יחויב ב-₪{trip.price + SERVICE_FEE} ללא אפשרות החזר
              </div>
            )}
          </button>
          <button type="button" onClick={() => setAutoJoin(false)}
            className={`p-3 border rounded-xl text-right transition-colors ${
              !autoJoin ? "border-[#1A6B4A] bg-[#D6EDE3]" : "border-gray-200"}`}>
            <div className={`text-sm font-medium mb-0.5 ${!autoJoin ? "text-[#0F5038]" : "text-gray-900"}`}>🔔 שלח לי התראה</div>
            <div className="text-xs text-gray-500 leading-relaxed">כשמתפנה מקום — התראה לכל הממתינים בו-זמנית. מי שרושם ראשון זוכה.</div>
          </button>
        </div>
      </div>

      {/* Card form when auto-join is chosen */}
      {autoJoin && (
        <div className="p-4 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900 mb-3">פרטי כרטיס לחיוב אוטומטי</div>
          <CardForm note={`הכרטיס יאושר עכשיו ויחויב אוטומטית ב-₪${trip.price + SERVICE_FEE} כשיתפנה מקום — ללא אפשרות החזר.`} />
        </div>
      )}

      <div className="p-4 border-b border-gray-100">
        <button type="button" onClick={() => setNotifyChanges((v) => !v)} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded flex items-center justify-center border-[1.5px] transition-colors ${
            notifyChanges ? "bg-[#1A6B4A] border-[#1A6B4A] text-white text-xs" : "border-gray-300"}`}>
            {notifyChanges && "✓"}
          </div>
          <span className="text-sm text-gray-700">עדכן אותי על כל שינוי בטיול</span>
        </button>
      </div>

      <div className="p-4">
        <button type="button" onClick={join} disabled={saving}
          className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60">
          {saving ? "מצטרף..." : autoJoin ? "הצטרף + אשר כרטיס ←" : "הצטרף לרשימת ההמתנה ←"}
        </button>
      </div>
    </>
  );
}

// ── Self-guided purchase flow (single fixed price, immediate final payment) ──────
function SelfGuidedPurchaseFlow({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const [done, setDone] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function buy() {
    setBuying(true);
    const res = await fetch(`/api/trips/${trip.id}/purchase`, { method: "POST" });
    setBuying(false);
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      setExpiresAt(d.purchase?.accessExpiresAt ?? null);
      setDone(true);
    }
  }

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

  if (done) {
    return (
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#D6EDE3] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <div className="text-lg font-semibold text-gray-900 mb-1">הטיול נרכש 🎒</div>
        <div className="text-sm text-gray-500 mb-4 leading-relaxed">
          {expiresAt ? `התוכן זמין לך מהיום ועד ${fmt(expiresAt)}.` : `התוכן זמין לך למשך ${trip.accessWindowDays ?? 30} ימים.`}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => router.push(`/trips/${trip.id}/start`)}
            className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium hover:bg-[#155a3e]">▶ התחל טיול</button>
          <button type="button" onClick={() => router.push("/my-trips")}
            className="w-full py-2.5 text-sm text-gray-500 border border-gray-200 rounded-full">הטיולים שלי</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b border-gray-100">
        <div className="bg-[#EEF5FC] rounded-xl p-3 text-xs text-[#185FA5] mb-3">
          🎒 טיול עצמאי — תוכן הדרכה מלא לרכישה. תשלום מיידי וסופי, ללא תאריך וללא הגבלת משתתפים.
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">מחיר לחבילה</span><span className="font-medium">₪{trip.price}</span>
          </div>
          <div className="flex justify-between text-xs py-1 text-gray-400">
            <span>חלון גישה</span><span>{trip.accessWindowDays ?? 30} ימים מרגע הרכישה</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-gray-200">
            <span>סה"כ לתשלום</span><span>₪{trip.price}</span>
          </div>
        </div>
      </div>
      <div className="p-4 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900 mb-3">פרטי תשלום</div>
        <CardForm note="תשלום מיידי וסופי — לאחר הרכישה התוכן המלא ייפתח לך מיד." />
      </div>
      <div className="p-4">
        <button type="button" onClick={buy} disabled={buying}
          className="w-full py-3 bg-[#1A6B4A] text-white rounded-full text-sm font-medium hover:bg-[#155a3e] disabled:opacity-60">
          {buying ? "רוכש..." : `רכוש עכשיו · ₪${trip.price}`}
        </button>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const flow = searchParams.get("flow") ?? "register";

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setTrip(d); })
      .finally(() => setLoading(false));
  }, [id]);

  if (status === "loading" || loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-gray-400 text-sm">טוען...</div>
      </div>
    );
  }

  if (!session) {
    router.replace(`/auth/login?callbackUrl=/trips/${id}/register${flow !== "register" ? `?flow=${flow}` : ""}`);
    return null;
  }

  if (!trip) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-gray-500 text-sm">הטיול לא נמצא</div>
      </div>
    );
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
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5] py-4 px-3">
      <div className="max-w-[480px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 text-sm">← חזרה</button>
          <h1 className="text-sm font-semibold text-gray-900">{flowTitle()}</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <TripSummary trip={trip} />

          {isSelfGuided ? (
            <SelfGuidedPurchaseFlow trip={trip} />
          ) : success ? (
            <SuccessScreen trip={trip} />
          ) : flow === "interest" ? (
            <InterestFlow trip={trip} />
          ) : flow === "waitlist" || isFull ? (
            <WaitlistFlow trip={trip} />
          ) : (
            <RegisterFlow trip={trip} onSuccess={() => setSuccess(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

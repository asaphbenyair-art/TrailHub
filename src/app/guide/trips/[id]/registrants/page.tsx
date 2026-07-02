"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { googleCalendarUrl } from "@/lib/calendar";
import RegistrantsModal from "@/components/RegistrantsModal";

interface RegField { id: string; label: string; type: string; required: boolean; options: string[] }
interface Registrant {
  id: string;
  status: string;
  paymentStatus: string;
  notes: string | null;
  fieldAnswers: Record<string, string> | null;
  signedPolicy: boolean;
  participantCount: number;
  waitlistPosition: number | null;
  conditions: string[] | null;
  interestThreshold: number | null;
  autoRegister: boolean;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

const STATUS_UI: Record<string, { label: string; bg: string; color: string }> = {
  CONFIRMED:   { label: "רשום", bg: "#D6EDE3", color: "#0F5038" },
  PENDING:     { label: "מתעניין", bg: "#f0f0f0", color: "#555" },
  WAITLIST:    { label: "רשימת המתנה", bg: "#D4E4F0", color: "#185FA5" },
  CONDITIONAL: { label: "עניין מותנה", bg: "#FDF3DC", color: "#7A5010" },
  INTERESTED:  { label: "מתעניין", bg: "#f0f0f0", color: "#555" },
  CANCELLED:   { label: "בוטל", bg: "#f5f5f5", color: "#999" },
};
const PAY_UI: Record<string, string> = {
  PAID: "שולם", AUTHORIZED: "מאושר", PENDING: "ממתין", REFUNDED: "הוחזר", FAILED: "נכשל",
};

export default function RegistrantsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [fields, setFields] = useState<RegField[]>([]);
  const [regs, setRegs] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  interface Broadcast { id: string; body: string; createdAt: string; sender: { name: string | null } }
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  interface TripMeta { title: string; date: string; startTime: string; region: string; status: string; visibility: string }
  const [trip, setTrip] = useState<TripMeta | null>(null);
  const [showRegistrants, setShowRegistrants] = useState(false);
  const [copied, setCopied] = useState(false);

  function loadBroadcasts() {
    fetch(`/api/trips/${id}/broadcasts`).then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (Array.isArray(d)) setBroadcasts(d); }).catch(() => {});
  }

  useEffect(() => {
    fetch(`/api/guide/trips/${id}/registrants`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setFields(d.registrationFields ?? []);
        setRegs(d.registrations ?? []);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
    loadBroadcasts();
    fetch(`/api/trips/${id}`).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !d.error) setTrip(d); }).catch(() => {});
  }, [id]);

  async function postpone() {
    const category = window.prompt("סיבת הדחייה (מזג אוויר / מחלה / אישי / אחר):");
    if (!category?.trim()) return;
    const reason = window.prompt("פירוט (אופציונלי):") ?? "";
    const res = await fetch(`/api/guide/trips/${id}/postpone`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, reason }),
    });
    window.alert(res.ok ? "הטיול סומן כנדחה" : "שגיאה");
  }

  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/trips/${id}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  const active = regs.filter((r) => r.status !== "CANCELLED");
  const conditional = active.filter((r) => r.conditions && r.conditions.length > 0);

  async function broadcast() {
    const message = window.prompt("הודעה לכל הנרשמים:");
    if (!message?.trim()) return;
    const res = await fetch(`/api/guide/trips/${id}/broadcast`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const d = await res.json().catch(() => ({}));
    window.alert(res.ok ? `ההודעה נשלחה ל-${d.sent ?? 0} נרשמים` : (d.error ?? "שגיאה"));
    if (res.ok) loadBroadcasts();
  }

  async function generateCompCode() {
    const res = await fetch(`/api/guide/trips/${id}/comp-codes`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.code) {
      navigator.clipboard?.writeText(d.code).catch(() => {});
      window.alert(`קוד מתנדב נוצר והועתק: ${d.code}\n(הרשמה חינם, מחוץ למכסת המקומות)`);
    } else {
      window.alert(d.error ?? "שגיאה");
    }
  }

  function answerLabel(f: RegField, val: string) {
    if (f.type === "boolean") return val === "yes" ? "כן" : val === "no" ? "לא" : val;
    return val;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg py-4 px-3">
      <div className="max-w-[560px] mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => router.back()} className="text-fg-faint hover:text-fg-muted text-sm">← חזרה</button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-fg truncate">ניהול הטיול{trip?.title ? ` — ${trip.title}` : ""}</h1>
            <span className="text-xs text-fg-faint">{active.length} משתתפים פעילים</span>
          </div>
        </div>

        {/* Management actions — everything the guide can do for this trip */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={() => setShowRegistrants(true)}
            className="text-xs text-[#0F5038] border border-[#1A6B4A]/30 bg-[#F0FAF5] rounded-lg px-3 py-1.5 hover:bg-[#D6EDE3]">👥 רשימת משתתפים</button>
          <Link href={`/guide/trips/${id}/qa`}
            className="text-xs text-[#1A6B4A] border border-[#1A6B4A]/25 rounded-lg px-3 py-1.5 hover:bg-[#D6EDE3]">💬 שאלות</Link>
          <Link href={`/guide/trips/${id}/chat`}
            className="text-xs text-[#185FA5] border border-[#185FA5]/25 rounded-lg px-3 py-1.5 hover:bg-[#EEF5FC]">✉️ הודעות</Link>
          <button type="button" onClick={broadcast}
            className="text-xs text-fg-muted border border-border rounded-lg px-3 py-1.5 hover:bg-surface-2">📢 הודעה לקבוצה</button>
          <button type="button" onClick={postpone}
            className="text-xs text-[#7A5010] border border-[#E8A020]/40 rounded-lg px-3 py-1.5 hover:bg-[#FDF6E8]">⏸ דחה טיול</button>
          {trip && (
            <a href={googleCalendarUrl({ title: trip.title, dateISO: trip.date, startTime: trip.startTime, location: trip.region })}
              target="_blank" rel="noreferrer"
              className="text-xs text-[#185FA5] border border-[#185FA5]/30 rounded-lg px-3 py-1.5 hover:bg-[#EEF5FC]">📅 ליומן</a>
          )}
          <button type="button" onClick={generateCompCode}
            className="text-xs text-[#7A5010] border border-[#E8A020]/40 rounded-lg px-3 py-1.5 hover:bg-[#FDF6E8]">🎟 קוד מתנדב</button>
          <Link href={`/guide/trips/${id}/edit`}
            className="text-xs text-fg-muted border border-border rounded-lg px-3 py-1.5 hover:bg-surface-2">✏️ עריכה</Link>
          {trip?.visibility === "PRIVATE" && (
            <button type="button" onClick={copyLink}
              className="text-xs text-[#185FA5] border border-[#185FA5]/25 rounded-lg px-3 py-1.5 hover:bg-[#EEF5FC]">{copied ? "✓ הועתק" : "🔗 העתק לינק"}</button>
          )}
        </div>

        {/* Aggregated conditional requests */}
        {conditional.length > 0 && (
          <div className="bg-[#FDF3DC] border border-[#E8A020]/30 rounded-2xl p-4 mb-3">
            <div className="text-xs font-semibold text-[#7A5010] mb-2">⚙ בקשות על תנאי ({conditional.length})</div>
            <div className="flex flex-col gap-1.5">
              {conditional.map((r) => (
                <div key={r.id} className="text-xs text-[#633806]">
                  <span className="font-medium">{r.user.name ?? "מטייל"}</span> — {r.autoRegister ? "יירשם אוטומטית אם" : "התראה אם"}: {(r.conditions ?? []).join(" וגם ")}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Broadcast history */}
        {broadcasts.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 mb-3">
            <div className="text-xs font-semibold text-fg-muted mb-2">📢 הודעות ששלחתי ({broadcasts.length})</div>
            <div className="flex flex-col gap-2">
              {broadcasts.map((b) => (
                <div key={b.id} className="border-b border-border last:border-0 pb-2 last:pb-0">
                  <div className="text-[10px] text-fg-faint mb-0.5">{new Date(b.createdAt).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  <p className="text-xs text-fg-muted whitespace-pre-wrap">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <div className="text-center py-12 text-fg-faint text-sm">טוען...</div>}
        {error && <div className="text-center py-12 text-red-500 text-sm">{error}</div>}

        {!loading && !error && active.length === 0 && (
          <div className="text-center py-14 text-fg-faint text-sm">עדיין אין נרשמים</div>
        )}

        <div className="flex flex-col gap-3">
          {active.map((r) => {
            const su = STATUS_UI[r.status] ?? STATUS_UI.PENDING;
            return (
              <div key={r.id} className="bg-surface rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[#D6EDE3] flex items-center justify-center text-sm font-medium text-[#1A6B4A]">
                    {(r.user.name ?? "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-fg">{r.user.name ?? "—"}</div>
                    <div className="text-[11px] text-fg-faint">{r.user.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: su.bg, color: su.color }}>
                      {su.label}{r.status === "WAITLIST" && r.waitlistPosition ? ` #${r.waitlistPosition}` : ""}
                    </span>
                    <span className="text-[10px] text-fg-faint">{PAY_UI[r.paymentStatus] ?? r.paymentStatus}</span>
                  </div>
                </div>

                {r.notes && (
                  <div className="text-xs text-fg-muted bg-surface-2 rounded-lg px-3 py-2 mb-2">{r.notes}</div>
                )}

                {fields.length > 0 && r.fieldAnswers && Object.keys(r.fieldAnswers).length > 0 && (
                  <div className="border-t border-border pt-2 mt-1 flex flex-col gap-1">
                    {fields.map((f) => {
                      const val = r.fieldAnswers?.[f.id];
                      if (!val) return null;
                      return (
                        <div key={f.id} className="flex justify-between text-xs">
                          <span className="text-fg-faint">{f.label}</span>
                          <span className="text-fg font-medium">{answerLabel(f, val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="text-[10px] text-fg-faint">
                    {r.signedPolicy ? "✓ אישר מדיניות ביטולים" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/guide/trips/${id}/chat?to=${r.user.id}`)}
                    className="text-xs text-[#1A6B4A] border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors"
                  >
                    שלח הודעה
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showRegistrants && (
        <RegistrantsModal tripId={id} tripTitle={trip?.title ?? "הטיול"} onClose={() => setShowRegistrants(false)} />
      )}
    </div>
  );
}

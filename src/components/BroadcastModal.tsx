"use client";

import { useEffect, useState } from "react";
import { X, Megaphone, Plus } from "lucide-react";
import { useDualDate } from "@/components/CalendarModeProvider";

interface Broadcast {
  id: string; body: string; isCancellation: boolean; createdAt: string;
  sender: { name: string | null };
}

/**
 * Guide "הודעות קבוצתיות" modal: history of past broadcasts (newest first) with
 * a "+ הודעה חדשה" composer. The composer has an optional "הטיול בוטל" checkbox
 * that requires a reason; cancellation broadcasts are rendered in red.
 */
export default function BroadcastModal({
  tripId, tripTitle, onClose,
}: {
  tripId: string; tripTitle: string; onClose: () => void;
}) {
  const dd = useDualDate();
  const [list, setList] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [isCancellation, setIsCancellation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/trips/${tripId}/broadcasts`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tripId]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function send() {
    setError(null);
    if (!body.trim()) { setError("יש לכתוב הודעה"); return; }
    if (isCancellation && !body.trim()) { setError("ביטול טיול מחייב לציין סיבה"); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/guide/trips/${tripId}/broadcast`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body.trim(), isCancellation }),
      });
      if (res.ok) { setBody(""); setIsCancellation(false); setComposing(false); load(); }
      else setError("שליחה נכשלה");
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[460px] max-h-[86vh] bg-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <button type="button" onClick={onClose} className="text-fg-faint hover:text-fg-muted order-first"><X size={20} /></button>
          <div className="flex-1 text-sm text-fg truncate">
            <span className="inline-flex items-center gap-1.5"><Megaphone size={15} className="text-[#1A6B4A]" /> הודעות קבוצתיות</span>
            <span className="text-fg-faint"> — {tripTitle}</span>
          </div>
        </div>

        {/* Body: history */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {loading && <div className="text-center py-8 text-fg-faint text-xs">טוען…</div>}
          {!loading && list.length === 0 && (
            <p className="text-xs text-fg-faint text-center py-6">עוד לא נשלחו הודעות</p>
          )}
          {list.map((b) => (
            <div key={b.id} className="rounded-xl p-3 border"
              style={b.isCancellation
                ? { background: "rgba(192,57,43,0.08)", borderColor: "rgba(192,57,43,0.4)" }
                : { background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-1">
                {b.isCancellation && <span className="text-[10px] font-bold text-[#C0392B]">⚠ ביטול טיול</span>}
                <span className="text-[10px] text-fg-faint mr-auto">{dd(b.createdAt, { time: true })}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: b.isCancellation ? "#C0392B" : "var(--fg)" }}>{b.body}</p>
            </div>
          ))}
        </div>

        {/* Footer: composer */}
        <div className="border-t border-border p-3 shrink-0">
          {!composing ? (
            <button type="button" onClick={() => setComposing(true)}
              className="w-full py-2.5 rounded-full text-sm font-medium text-white flex items-center justify-center gap-1"
              style={{ background: "#1A6B4A" }}>
              <Plus size={15} /> הודעה חדשה
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
                placeholder={isCancellation ? "פרט את סיבת הביטול…" : "כתוב הודעה לקבוצה…"}
                className="w-full rounded-xl px-3 py-2 text-sm resize-none bg-surface border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent" />
              <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer">
                <input type="checkbox" checked={isCancellation} onChange={(e) => setIsCancellation(e.target.checked)}
                  className="w-4 h-4 accent-[#C0392B]" />
                <span className={isCancellation ? "text-[#C0392B] font-medium" : ""}>הטיול בוטל (שליחת הודעת ביטול)</span>
              </label>
              {error && <div className="text-[11px] text-[#C0392B]">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={send} disabled={sending || !body.trim()}
                  className="flex-1 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: isCancellation ? "#C0392B" : "#1A6B4A" }}>
                  {sending ? "שולח…" : isCancellation ? "שלח הודעת ביטול" : "שלח הודעה"}
                </button>
                <button type="button" onClick={() => { setComposing(false); setError(null); setIsCancellation(false); }}
                  className="px-4 py-2 rounded-full text-sm font-medium border border-border text-fg-muted">ביטול</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

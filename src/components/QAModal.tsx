"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, MessageCircle } from "lucide-react";
import { useDualDate } from "@/components/CalendarModeProvider";
import { useTranslations } from "next-intl";

interface QReply { id: string; body: string; createdAt: string; userId: string; user: { name: string | null; image: string | null } }
interface Question {
  id: string; userId: string; body: string; answer: string | null; answeredAt: string | null;
  createdAt: string; official?: boolean; isPrivate?: boolean;
  user: { name: string | null; image: string | null }; replies?: QReply[];
}

const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];
function avatarColor(name: string | null) {
  if (!name) return "#999";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

/**
 * Q&A as a modal overlay (same pattern as the rideshare / registrant modals).
 * Opened from the trip-card Q&A indicator — never navigates away, so closing
 * returns to the exact scroll position. Includes the שלי/אחרים toggle, the full
 * threaded list, and an ask box (with public/private choice).
 */
export default function QAModal({
  tripId, tripTitle, onClose,
}: {
  tripId: string; tripTitle: string; onClose: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const dd = useDualDate();
  const tq = useTranslations("qa");
  const tc = useTranslations("common");
  const meId = (session?.user as { id?: string } | undefined)?.id;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"mine" | "others">("mine");
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);

  function load() {
    fetch(`/api/trips/${tripId}/questions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setQuestions(data);
          try {
            const answered = data.filter((q: Question) => !q.isPrivate && q.answer).length;
            window.localStorage.setItem(`qa-ans-seen-${tripId}`, String(answered));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tripId]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function submitQuestion() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), isPrivate }),
      });
      if (res.ok) { setBody(""); setIsPrivate(false); load(); }
    } finally { setSending(false); }
  }

  async function submitReply(qid: string) {
    const text = (replyBody[qid] ?? "").trim();
    if (!text || replyBusy) return;
    setReplyBusy(qid);
    try {
      const res = await fetch(`/api/trips/${tripId}/questions/${qid}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) { setReplyBody((p) => ({ ...p, [qid]: "" })); load(); }
    } finally { setReplyBusy(null); }
  }

  // Defense-in-depth: never render a private question that isn't the viewer's own.
  const visible = questions
    .filter((q) => !q.isPrivate || (!!meId && q.userId === meId))
    .sort((a, b) => {
      const ao = a.official ? 1 : 0, bo = b.official ? 1 : 0;
      if (ao !== bo) return bo - ao;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const shown = view === "mine" ? visible.filter((q) => q.userId === meId) : visible.filter((q) => q.userId !== meId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[460px] max-h-[86vh] bg-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <button type="button" onClick={onClose} className="text-fg-faint hover:text-fg-muted order-first"><X size={20} /></button>
          <div className="flex-1 text-sm text-fg truncate">
            <span className="inline-flex items-center gap-1.5"><MessageCircle size={15} className="text-[#1A6B4A]" /> {tq("title")}</span>
            <span className="text-fg-faint"> — {tripTitle}</span>
          </div>
        </div>

        {/* שלי / אחרים toggle */}
        <div className="px-4 pt-3 shrink-0">
          <div className="inline-flex bg-surface-2 rounded-full p-0.5 text-[11px]">
            {(["mine", "others"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${view === v ? "bg-[#1A6B4A] text-white" : "text-fg-muted"}`}>
                {v === "mine" ? tc("mine") : tc("others")}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading && <div className="text-center py-8 text-fg-faint text-xs">טוען…</div>}
          {!loading && shown.length === 0 && (
            <p className="text-xs text-fg-faint text-center py-6">
              {view === "mine" ? tq("noneMine") : tq("noneOthers")}
            </p>
          )}
          {shown.map((q) => (
            <div key={q.id} className="rounded-2xl p-3.5 border border-border bg-surface">
              {q.official && <div className="text-[10px] font-semibold text-amber mb-1.5">★ {tq("officialAnswer")}</div>}
              {q.isPrivate && <div className="text-[10px] font-semibold text-[#185FA5] mb-1.5">🔒 {tq("privateNote")}</div>}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white" style={{ background: avatarColor(q.user.name) }}>{initials(q.user.name)}</div>
                <span className="text-xs font-medium text-fg">{q.user.name ?? "מטייל"}</span>
                <span className="text-[10px] text-fg-faint mr-auto">{dd(q.createdAt)}</span>
              </div>
              <p className="text-sm text-fg mb-1">{q.body}</p>
              {q.answer && (
                <div className="mt-2 pr-3 border-r-2" style={{ borderColor: "var(--accent)" }}>
                  <div className="text-[10px] text-accent font-medium mb-0.5">{tq("guideAnswer")}</div>
                  <p className="text-xs text-fg-muted">{q.answer}</p>
                </div>
              )}
              {q.replies && q.replies.length > 0 && (
                <div className="mt-2 pr-3 border-r border-border flex flex-col gap-2">
                  {q.replies.map((rp) => (
                    <div key={rp.id}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white" style={{ background: avatarColor(rp.user.name) }}>{initials(rp.user.name)}</div>
                        <span className="text-[11px] font-medium text-fg">{rp.userId === meId ? "אתה" : (rp.user.name ?? "מטייל")}</span>
                        <span className="text-[9px] text-fg-faint mr-auto">{dd(rp.createdAt)}</span>
                      </div>
                      <p className="text-xs text-fg-muted pr-6 mt-0.5">{rp.body}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* The asker can continue the thread once answered */}
              {session && q.answer && meId === q.userId && (
                <div className="mt-2 flex gap-2">
                  <input value={replyBody[q.id] ?? ""} onChange={(e) => setReplyBody((p) => ({ ...p, [q.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitReply(q.id); }}
                    placeholder={tq("replyPlaceholder")}
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-surface-2 border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent" />
                  <button type="button" onClick={() => submitReply(q.id)} disabled={!(replyBody[q.id] ?? "").trim() || replyBusy === q.id}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
                    {replyBusy === q.id ? "…" : tq("reply")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ask a question (footer) */}
        <div className="border-t border-border p-3 shrink-0">
          {session ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={tq("askPlaceholder")} rows={2}
                  className="flex-1 rounded-xl px-3 py-2 text-sm resize-none bg-surface border border-border text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent" />
                <button type="button" onClick={submitQuestion} disabled={!body.trim() || sending}
                  className="px-3 py-2 text-xs rounded-xl self-end font-medium disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
                  {sending ? "…" : tq("askQuestion")}
                </button>
              </div>
              <div className="inline-flex bg-surface-2 rounded-full p-0.5 self-start text-[11px]">
                <button type="button" onClick={() => setIsPrivate(false)}
                  className={`px-2.5 py-1 rounded-full font-medium ${!isPrivate ? "bg-[#1A6B4A] text-white" : "text-fg-muted"}`}>{tq("publicQuestion")}</button>
                <button type="button" onClick={() => setIsPrivate(true)}
                  className={`px-2.5 py-1 rounded-full font-medium ${isPrivate ? "bg-[#185FA5] text-white" : "text-fg-muted"}`}>🔒 {tq("privateQuestion")}</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-fg-faint text-center">
              <button type="button" onClick={() => router.push("/auth/login")} className="text-accent underline">{tq("loginToAsk")}</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

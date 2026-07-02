"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Question {
  id: string;
  body: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  user: { name: string | null; image: string | null };
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

export default function GuideQAPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [tripTitle, setTripTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    fetch(`/api/trips/${tripId}`)
      .then((r) => r.json())
      .then((d) => { if (d.title) setTripTitle(d.title); })
      .catch(() => {});

    fetch(`/api/trips/${tripId}/questions`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setQuestions(data); })
      .catch(() => {});
  }, [tripId]);

  async function submitAnswer(qid: string) {
    const answer = answers[qid]?.trim();
    if (!answer) return;
    setSaving((prev) => ({ ...prev, [qid]: true }));
    try {
      const res = await fetch(`/api/trips/${tripId}/questions/${qid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (res.ok) {
        const updated = await res.json();
        setQuestions((prev) => prev.map((q) => (q.id === qid ? updated : q)));
        setAnswers((prev) => { const n = { ...prev }; delete n[qid]; return n; });
      }
    } finally {
      setSaving((prev) => ({ ...prev, [qid]: false }));
    }
  }

  const unanswered = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);

  return (
    <div dir="rtl" className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="text-fg-faint hover:text-fg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div>
          <div className="text-sm font-semibold text-fg">שאלות ותשובות</div>
          {tripTitle && <div className="text-xs text-fg-faint">{tripTitle}</div>}
        </div>
        {unanswered.length > 0 && (
          <span className="mr-auto bg-red-100 text-red-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {unanswered.length} ממתינות
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4 max-w-xl mx-auto">
        {questions.length === 0 && (
          <div className="py-16 text-center text-sm text-fg-faint">אין שאלות עדיין</div>
        )}

        {/* Unanswered */}
        {unanswered.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2 px-1">
              ממתינות לתשובה
            </div>
            {unanswered.map((q) => (
              <div key={q.id} className="bg-surface rounded-2xl p-4 mb-3 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ background: avatarColor(q.user.name) }}
                  >
                    {initials(q.user.name)}
                  </div>
                  <span className="text-xs font-medium text-fg">{q.user.name ?? "מטייל"}</span>
                  <span className="text-[10px] text-fg-faint mr-auto">
                    {new Date(q.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
                <p className="text-sm text-fg mb-3">{q.body}</p>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="כתוב תשובה..."
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1A6B4A] mb-2"
                />
                <button
                  type="button"
                  onClick={() => submitAnswer(q.id)}
                  disabled={!answers[q.id]?.trim() || saving[q.id]}
                  className="w-full py-2 bg-[#1A6B4A] text-white text-sm rounded-xl disabled:opacity-50 hover:bg-[#155a3e] transition-colors"
                >
                  {saving[q.id] ? "שומר..." : "פרסם תשובה"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Answered */}
        {answered.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2 px-1">
              נענו
            </div>
            {answered.map((q) => (
              <div key={q.id} className="bg-surface rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ background: avatarColor(q.user.name) }}
                  >
                    {initials(q.user.name)}
                  </div>
                  <span className="text-xs font-medium text-fg">{q.user.name ?? "מטייל"}</span>
                </div>
                <p className="text-sm text-fg mb-2">{q.body}</p>
                <div className="pr-3 border-r-2 border-[#1A6B4A]">
                  <div className="text-[10px] text-[#1A6B4A] font-medium mb-0.5">תשובתך</div>
                  <p className="text-xs text-fg">{q.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

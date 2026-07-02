"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface HikerThread {
  id: string;
  body: string;
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  read: boolean;
  fromUser: { id: string; name: string | null; image: string | null };
  toUser: { id: string; name: string | null; image: string | null };
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  read: boolean;
  fromUserId: string;
  fromUser: { name: string | null };
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}
const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];
function avatarColor(name: string | null) {
  if (!name) return "#999";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "עכשיו";
  if (diff < 3600) return `${Math.floor(diff / 60)} דק׳`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} שע׳`;
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export default function GuideChatPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const meId = (session?.user as { id?: string })?.id;

  const [threads, setThreads] = useState<HikerThread[]>([]);
  const [activeHiker, setActiveHiker] = useState<{ id: string; name: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [tripTitle, setTripTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    fetch(`/api/trips/${tripId}`)
      .then((r) => r.json())
      .then((d) => { if (d.title) setTripTitle(d.title); })
      .catch(() => {});
  }, [tripId]);

  function loadThreads() {
    fetch(`/api/trips/${tripId}/chat`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setThreads(data); })
      .catch(() => {});
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    loadThreads();
  }, [status, tripId]);

  function loadConversation(hikerId: string) {
    fetch(`/api/trips/${tripId}/chat?userId=${hikerId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {});
  }

  useEffect(() => {
    if (!activeHiker) return;
    loadConversation(activeHiker.id);
    pollRef.current = setInterval(() => loadConversation(activeHiker.id), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeHiker, tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!body.trim() || sending || !activeHiker) return;
    setSending(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, toUserId: activeHiker.id }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setBody("");
      }
    } finally {
      setSending(false);
    }
  }

  function getHiker(thread: HikerThread) {
    return thread.fromUserId === meId ? thread.toUser : thread.fromUser;
  }

  if (!activeHiker) {
    return (
      <div dir="rtl" className="min-h-screen bg-bg">
        <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="text-fg-faint hover:text-fg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <div className="text-sm font-semibold text-fg">הודעות</div>
            {tripTitle && <div className="text-xs text-fg-faint">{tripTitle}</div>}
          </div>
        </div>

        <div className="bg-surface mt-2">
          {threads.length === 0 && (
            <div className="py-16 text-center text-sm text-fg-faint">אין הודעות עדיין</div>
          )}
          {threads.map((thread) => {
            const hiker = getHiker(thread);
            const isUnread = !thread.read && thread.fromUserId !== meId;
            return (
              <button
                key={`${thread.fromUserId}-${thread.toUserId}`}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-surface-2 transition-colors text-right ${isUnread ? "bg-accent/10" : ""}`}
                onClick={() => {
                  setActiveHiker({ id: hiker.id, name: hiker.name });
                  loadConversation(hiker.id);
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white shrink-0"
                  style={{ background: avatarColor(hiker.name) }}
                >
                  {initials(hiker.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isUnread ? "font-semibold text-fg" : "font-medium text-fg"}`}>
                      {hiker.name ?? "מטייל"}
                    </span>
                    <span className="text-[10px] text-fg-faint">{relativeTime(thread.createdAt)}</span>
                  </div>
                  <p className="text-xs text-fg-muted truncate mt-0.5">{thread.body}</p>
                </div>
                {isUnread && <div className="w-2 h-2 rounded-full bg-[#1A6B4A] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg flex flex-col">
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button type="button" onClick={() => { setActiveHiker(null); setMessages([]); if (pollRef.current) clearInterval(pollRef.current); }} className="text-fg-faint hover:text-fg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
          style={{ background: avatarColor(activeHiker.name) }}
        >
          {initials(activeHiker.name)}
        </div>
        <div>
          <div className="text-sm font-semibold text-fg">{activeHiker.name ?? "מטייל"}</div>
          <div className="text-xs text-fg-faint">{tripTitle}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 pb-24">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-fg-faint py-20">
            אין הודעות עדיין
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.fromUserId === meId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"} mb-1`}>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-[#1A6B4A] text-white rounded-br-sm"
                    : "bg-surface text-fg rounded-bl-sm shadow-sm border border-border"
                }`}
              >
                <p>{msg.body}</p>
                <p className={`text-[9px] mt-0.5 text-left ${isMe ? "text-white/60" : "text-fg-faint"}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 py-3 flex gap-2 items-end" dir="rtl">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="כתוב הודעה..."
          rows={1}
          className="flex-1 border border-border rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1A6B4A] max-h-24 overflow-y-auto"
        />
        <button
          type="button"
          onClick={send}
          disabled={!body.trim() || sending}
          className="w-10 h-10 bg-[#1A6B4A] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#155a3e] transition-colors"
        >
          <svg className="w-4 h-4 text-white rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

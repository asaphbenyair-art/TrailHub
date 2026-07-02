"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  body: string;
  createdAt: string;
  read: boolean;
  fromUserId: string;
  fromUser: { name: string | null; image: string | null };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}

export default function HikerChatPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const withUserId = search.get("with");
  const { data: session, status } = useSession();
  const meId = (session?.user as { id?: string })?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [guideUserId, setGuideUserId] = useState<string | null>(null);
  const [counterpartName, setCounterpartName] = useState<string | null>(null);
  const [tripTitle, setTripTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    // Fetch trip title
    fetch(`/api/trips/${tripId}`)
      .then((r) => r.json())
      .then((d) => { if (d.title) setTripTitle(d.title); })
      .catch(() => {});
  }, [tripId]);

  function loadMessages() {
    const url = withUserId
      ? `/api/trips/${tripId}/chat?with=${withUserId}`
      : `/api/trips/${tripId}/chat`;
    fetch(url)
      .then((r) => r.json())
      .then((data: {
        messages: Message[];
        guideUserId: string;
        counterpart?: { id: string; name: string | null; image: string | null } | null;
      }) => {
        if (data.messages) {
          setMessages(data.messages);
          setGuideUserId(data.guideUserId);
          if (data.counterpart) setCounterpartName(data.counterpart.name);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tripId, withUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withUserId ? { body, toUserId: withUserId } : { body }),
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

  // Group messages by day
  let lastDay = "";

  return (
    <div dir="rtl" className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button type="button" onClick={() => router.back()} className="text-fg-faint hover:text-fg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-fg">
            {withUserId ? (counterpartName ?? "שיחה") : "שיחה עם המדריך"}
          </div>
          {tripTitle && <div className="text-xs text-fg-faint truncate">{tripTitle}</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 pb-24">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-fg-faint py-20">
            שלח הודעה ראשונה למדריך!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.fromUserId === meId;
          const dayStr = formatDay(msg.createdAt);
          const showDay = dayStr !== lastDay;
          lastDay = dayStr;

          return (
            <div key={msg.id}>
              {showDay && (
                <div className="text-center text-[10px] text-fg-faint my-3">{dayStr}</div>
              )}
              <div className={`flex ${isMe ? "justify-start" : "justify-end"} mb-1`}>
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
                    {isMe && msg.read && " · נקרא"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 py-3 flex gap-2 items-end"
        dir="rtl"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="כתוב הודעה..."
          rows={1}
          className="flex-1 border border-border rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1A6B4A] max-h-24 overflow-y-auto"
          style={{ lineHeight: "1.4" }}
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

"use client";

import { useEffect, useState } from "react";
import { X, Users, Mars, Venus } from "lucide-react";
import { useDualDate } from "@/components/CalendarModeProvider";
import { useTranslations } from "next-intl";

interface Registrant {
  id: string; name: string | null; image: string | null; gender: string | null;
  slogan: string | null; anonymous: boolean; participantCount: number; createdAt: string;
}

function GenderIcon({ gender }: { gender: string | null }) {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m" || gender === "זכר") return <Mars size={12} className="text-[#185FA5]" />;
  if (g === "female" || g === "f" || gender === "נקבה") return <Venus size={12} className="text-[#B0324D]" />;
  return null;
}

const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];
function avatarColor(name: string | null) {
  if (!name) return "#9ca3af";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

function Row({ r }: { r: Registrant }) {
  const dd = useDualDate();
  const trg = useTranslations("registrants");
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-border last:border-b-0">
      {r.image && !r.anonymous ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.image} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
          style={{ background: r.anonymous ? "#9ca3af" : avatarColor(r.name) }}>
          {r.anonymous ? "?" : initials(r.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-fg flex items-center gap-1">
          <span className="truncate">{r.anonymous ? trg("anonymous") : (r.name ?? "מטייל")}{r.participantCount > 1 ? ` +${r.participantCount - 1}` : ""}</span>
          {!r.anonymous && <GenderIcon gender={r.gender} />}
        </div>
        {r.slogan && <div className="text-[11px] text-fg-faint truncate">{r.slogan}</div>}
      </div>
      <span className="text-[10px] text-fg-faint shrink-0">
        {dd(r.createdAt)}
      </span>
    </div>
  );
}

export default function RegistrantsModal({
  tripId, tripTitle, onClose,
}: {
  tripId: string; tripTitle: string; onClose: () => void;
}) {
  const trg = useTranslations("registrants");
  const [data, setData] = useState<{ confirmed: Registrant[]; waitlist: Registrant[] } | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/registrants`, { cache: "no-store" })
      .then((r) => { if (r.status === 401 || r.status === 403) { setAllowed(false); return null; } return r.json(); })
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [tripId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[440px] max-h-[82vh] bg-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <button type="button" onClick={onClose} className="text-fg-faint hover:text-fg-muted order-first"><X size={20} /></button>
          <div className="flex-1 text-sm text-fg truncate">
            <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-[#1A6B4A]" /> {trg("title")}</span>
            <span className="text-fg-faint"> — {tripTitle}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-fg-faint text-xs">טוען…</div>
          ) : !allowed ? (
            <div className="text-center py-8 text-fg-faint text-sm">{trg("accessNote")}</div>
          ) : (
            <>
              <div className="text-xs font-semibold text-fg-muted mb-1">{trg("registered")} ({data?.confirmed.length ?? 0})</div>
              {data && data.confirmed.length > 0
                ? data.confirmed.map((r) => <Row key={r.id} r={r} />)
                : <div className="text-xs text-fg-faint py-2">{trg("none")}</div>}

              {data && data.waitlist.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-border">
                  <div className="text-xs font-semibold text-[#185FA5] mb-1 flex items-center gap-1">⏰ {trg("waitlist")} ({data.waitlist.length})</div>
                  {data.waitlist.map((r) => <Row key={r.id} r={r} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

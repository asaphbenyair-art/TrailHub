"use client";

import { useEffect, useState } from "react";
import { X, Users } from "lucide-react";

interface Registrant {
  id: string; name: string | null; image: string | null; gender: string | null;
  slogan: string | null; anonymous: boolean; participantCount: number; createdAt: string;
}

function genderIcon(gender: string | null) {
  if (gender === "male" || gender === "זכר" || gender === "m") return "♂";
  if (gender === "female" || gender === "נקבה" || gender === "f") return "♀";
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
  const g = genderIcon(r.gender);
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-gray-50 last:border-b-0">
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
        <div className="text-sm text-gray-900 flex items-center gap-1">
          <span className="truncate">{r.anonymous ? "משתתף אנונימי" : (r.name ?? "מטייל")}{r.participantCount > 1 ? ` +${r.participantCount - 1}` : ""}</span>
          {g && <span className={g === "♂" ? "text-[#185FA5]" : "text-[#B0324D]"}>{g}</span>}
        </div>
        {r.slogan && <div className="text-[11px] text-gray-400 truncate">{r.slogan}</div>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">
        {new Date(r.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
      </span>
    </div>
  );
}

export default function RegistrantsModal({
  tripId, tripTitle, onClose,
}: {
  tripId: string; tripTitle: string; onClose: () => void;
}) {
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
      <div className="relative w-full max-w-[440px] max-h-[82vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 order-first"><X size={20} /></button>
          <div className="flex-1 text-sm text-gray-900 truncate">
            <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-[#1A6B4A]" /> משתתפים</span>
            <span className="text-gray-400"> — {tripTitle}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-xs">טוען…</div>
          ) : !allowed ? (
            <div className="text-center py-8 text-gray-400 text-sm">רשימת המשתתפים זמינה לנרשמים ומתעניינים בטיול</div>
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-500 mb-1">רשומים ({data?.confirmed.length ?? 0})</div>
              {data && data.confirmed.length > 0
                ? data.confirmed.map((r) => <Row key={r.id} r={r} />)
                : <div className="text-xs text-gray-400 py-2">אין נרשמים עדיין</div>}

              {data && data.waitlist.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200">
                  <div className="text-xs font-semibold text-[#185FA5] mb-1 flex items-center gap-1">⏰ רשימת המתנה ({data.waitlist.length})</div>
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

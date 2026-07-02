"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, MapPin, ArrowLeftRight, Coins, MessageCircle, UserSearch, Plus, Check, Car, Phone } from "lucide-react";

interface Claim { id: string; userId: string; user: { id: string; name: string | null; phone: string | null } }
interface Offer {
  id: string; departureCity: string; spots: number; direction: "ROUND_TRIP" | "ONE_WAY";
  costSharing: boolean; note: string | null; posterId: string;
  poster: { id: string; name: string | null; image: string | null; phone: string | null };
  claims: Claim[];
}
interface Seeker { id: string; userId: string; name: string | null; image: string | null; area: string | null }

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

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ background: avatarColor(name) }}>{initials(name)}</div>
  );
}

export default function RideshareModal({
  tripId, tripTitle, tripDate, onClose,
}: {
  tripId: string; tripTitle: string; tripDate?: string | null; onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"offers" | "seekers">("offers");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [city, setCity] = useState("");
  const [spots, setSpots] = useState("1");
  const [direction, setDirection] = useState<"ROUND_TRIP" | "ONE_WAY">("ROUND_TRIP");
  const [costSharing, setCostSharing] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/trips/${tripId}/rideshare`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) { setAllowed(false); setLoading(false); return; }
    const d = await res.json();
    setOffers(d.offers ?? []); setSeekers(d.seekers ?? []); setMeId(d.meId ?? null); setLooking(!!d.looking);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tripId]);

  const dateLabel = tripDate ? new Date(tripDate).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "";

  async function toggleLooking() {
    setLooking((v) => !v);
    await fetch(`/api/trips/${tripId}/rideshare/request`, { method: looking ? "DELETE" : "POST" }).catch(() => {});
    load();
  }
  async function claim(offerId: string) {
    await fetch(`/api/trips/${tripId}/rideshare/${offerId}`, { method: "POST" }).catch(() => {});
    load();
  }
  async function leave(offerId: string) {
    await fetch(`/api/trips/${tripId}/rideshare/${offerId}`, { method: "DELETE" }).catch(() => {});
    load();
  }
  async function createOffer() {
    if (!city.trim()) return;
    setSaving(true);
    await fetch(`/api/trips/${tripId}/rideshare`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departureCity: city, spots, direction, costSharing, note }),
    }).catch(() => {});
    setCity(""); setSpots("1"); setDirection("ROUND_TRIP"); setCostSharing(false); setNote("");
    setShowForm(false); setSaving(false);
    load();
  }
  function openChat(userId: string) {
    router.push(`/trips/${tripId}/chat?with=${userId}`);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[460px] max-h-[86vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 order-first"><X size={20} /></button>
          <div className="flex-1 text-sm text-gray-900 truncate">
            <span className="inline-flex items-center gap-1.5"><Car size={15} className="text-[#1A6B4A]" /> לוח טרמפים</span>
            <span className="text-gray-400"> — {tripTitle}{dateLabel ? ` · ${dateLabel}` : ""}</span>
          </div>
        </div>

        {!allowed ? (
          <div className="p-8 text-center text-sm text-gray-400">לוח הטרמפים זמין לנרשמים ומתעניינים בטיול</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0">
              {([["offers", `טרמפים מוצעים (${offers.length})`], ["seekers", `מחפשים (${seekers.length})`]] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)}
                  className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    tab === key ? "border-[#1A6B4A] text-[#1A6B4A]" : "border-transparent text-gray-500"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3">
              {loading && <div className="text-center py-8 text-gray-400 text-xs">טוען…</div>}

              {/* Post-offer form (toggled from footer) */}
              {showForm && tab === "offers" && (
                <div className="border border-gray-200 rounded-xl p-3 mb-3 flex flex-col gap-2 bg-gray-50/60">
                  <div className="text-xs font-semibold text-gray-900">הצעת טרמפ חדשה</div>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="עיר / נקודת יציאה"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  <div className="flex gap-2">
                    <input type="number" min="1" value={spots} onChange={(e) => setSpots(e.target.value)} placeholder="מקומות" dir="ltr"
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                    <select value={direction} onChange={(e) => setDirection(e.target.value as "ROUND_TRIP" | "ONE_WAY")}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white">
                      <option value="ROUND_TRIP">הלוך ושוב</option>
                      <option value="ONE_WAY">כיוון אחד</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={costSharing} onChange={(e) => setCostSharing(e.target.checked)} /> השתתפות בהוצאות דלק
                  </label>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערה (אופציונלי)"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  <button type="button" onClick={createOffer} disabled={saving}
                    className="py-2 bg-[#1A6B4A] text-white rounded-full text-xs font-medium disabled:opacity-60">
                    {saving ? "מפרסם…" : "פרסם טרמפ"}
                  </button>
                </div>
              )}

              {/* Tab 1 — offered rides */}
              {!loading && tab === "offers" && (
                offers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">אין טרמפים מוצעים עדיין</div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {offers.map((o) => {
                      const left = Math.max(o.spots - o.claims.length, 0);
                      const isPoster = o.posterId === meId;
                      const iClaimed = o.claims.some((c) => c.userId === meId);
                      return (
                        <div key={o.id} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-start gap-2.5">
                            <Avatar name={o.poster.name} image={o.poster.image} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium text-gray-900 truncate">{o.poster.name ?? "משתתף"}</div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${left > 0 ? "bg-[#D6EDE3] text-[#0F5038]" : "bg-[#FADBD8] text-[#791F1F]"}`}>
                                  {left > 0 ? `${left} מקומות` : "מלא"}
                                </span>
                              </div>
                              {o.poster.phone && (
                                <a href={`tel:${o.poster.phone}`} className="text-[11px] text-[#185FA5] flex items-center gap-1 mt-0.5" dir="ltr">
                                  <Phone size={11} /> {o.poster.phone}
                                </a>
                              )}
                              {/* Details row */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 mt-1.5">
                                <span className="flex items-center gap-1"><MapPin size={12} /> {o.departureCity}</span>
                                <span className="flex items-center gap-1"><ArrowLeftRight size={12} /> {o.direction === "ONE_WAY" ? "כיוון אחד" : "הלוך ושוב"}</span>
                                {o.costSharing && <span className="flex items-center gap-1"><Coins size={12} /> השתתפות בדלק</span>}
                              </div>
                              {o.note && <div className="text-[11px] text-gray-400 mt-1">{o.note}</div>}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-2.5">
                            {isPoster ? (
                              <button type="button" onClick={() => leave(o.id)}
                                className="flex-1 py-1.5 rounded-full text-xs font-medium text-[#C0392B] border border-[#C0392B]/30 hover:bg-red-50">
                                בטל טרמפ
                              </button>
                            ) : iClaimed ? (
                              <button type="button" onClick={() => leave(o.id)}
                                className="py-1.5 px-3 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                                עזוב מקום
                              </button>
                            ) : (
                              <button type="button" onClick={() => claim(o.id)} disabled={left === 0}
                                className="flex-1 py-1.5 rounded-full text-xs font-semibold text-white bg-[#1A6B4A] hover:bg-[#155a3e] disabled:opacity-50">
                                תפוס מקום
                              </button>
                            )}
                            <button type="button" onClick={() => openChat(o.posterId)}
                              className="flex-1 py-1.5 rounded-full text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-1.5">
                              <MessageCircle size={13} /> פתח צ׳אט
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Tab 2 — seekers */}
              {!loading && tab === "seekers" && (
                seekers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">אין מחפשי טרמפ כרגע</div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {seekers.map((s) => (
                      <div key={s.id} className="border border-gray-100 rounded-xl p-3 flex items-center gap-2.5">
                        <Avatar name={s.name} image={s.image} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.name ?? "מטייל"}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                            <UserSearch size={11} /> מחפש/ת טרמפ{s.area ? ` · ${s.area}` : ""}
                          </div>
                        </div>
                        {s.userId !== meId && (
                          <button type="button" onClick={() => openChat(s.userId)}
                            className="py-1.5 px-3 rounded-full text-xs font-medium text-white bg-[#185FA5] hover:bg-[#134e73] flex items-center gap-1.5 shrink-0">
                            <MessageCircle size={13} /> פתח צ׳אט
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Footer — always visible */}
            <div className="flex gap-2 p-3 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => { setTab("offers"); setShowForm((v) => !v); }}
                className="flex-1 py-2.5 rounded-full text-xs font-semibold text-white bg-[#1A6B4A] hover:bg-[#155a3e] flex items-center justify-center gap-1.5">
                <Plus size={14} /> הצע טרמפ
              </button>
              <button type="button" onClick={toggleLooking}
                className={`flex-1 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                  looking ? "bg-[#EAF1F8] text-[#185FA5] border-[#185FA5]" : "text-white bg-[#185FA5] border-[#185FA5] hover:bg-[#134e73]"
                }`}>
                {looking ? <><Check size={14} /> מחפש/ת טרמפ</> : <><UserSearch size={14} /> אני מחפש טרמפ</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Claim { id: string; userId: string; user: { id: string; name: string | null; phone: string | null } }
interface Offer {
  id: string;
  departureCity: string;
  spots: number;
  direction: "ROUND_TRIP" | "ONE_WAY";
  costSharing: boolean;
  note: string | null;
  posterId: string;
  poster: { id: string; name: string | null; image: string | null; phone: string | null };
  claims: Claim[];
}

export default function RideshareBoard({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [looking, setLooking] = useState(false);

  // form
  const [city, setCity] = useState("");
  const [spots, setSpots] = useState("1");
  const [direction, setDirection] = useState<"ROUND_TRIP" | "ONE_WAY">("ROUND_TRIP");
  const [costSharing, setCostSharing] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/trips/${tripId}/rideshare`);
    if (res.status === 403 || res.status === 401) { setAllowed(false); setLoading(false); return; }
    const d = await res.json();
    setOffers(d.offers ?? []);
    setMeId(d.meId ?? null);
    setLooking(!!d.looking);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tripId]);

  async function toggleLooking() {
    await fetch(`/api/trips/${tripId}/rideshare/request`, { method: looking ? "DELETE" : "POST" });
    load();
  }

  async function createOffer() {
    if (!city.trim()) return;
    setSaving(true);
    await fetch(`/api/trips/${tripId}/rideshare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departureCity: city, spots, direction, costSharing, note }),
    });
    setCity(""); setSpots("1"); setDirection("ROUND_TRIP"); setCostSharing(false); setNote("");
    setShowForm(false); setSaving(false);
    load();
  }

  async function claim(offerId: string) {
    await fetch(`/api/trips/${tripId}/rideshare/${offerId}`, { method: "POST" });
    load();
  }
  async function leave(offerId: string) {
    await fetch(`/api/trips/${tripId}/rideshare/${offerId}`, { method: "DELETE" });
    load();
  }

  if (!allowed) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-4 text-center">
        <div className="text-sm font-medium text-fg mb-1">🚗 לוח טרמפים</div>
        <div className="text-xs text-fg-faint">זמין לנרשמים ומתעניינים בטיול</div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold text-fg">🚗 לוח טרמפים</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleLooking}
            className={`text-xs rounded-full px-3 py-1 border transition-colors ${
              looking
                ? "bg-[#D6EDE3] border-[#1A6B4A] text-[#0F5038]"
                : "text-fg-muted border-border hover:bg-surface-2"
            }`}>
            {looking ? "✓ מחפש טרמפ" : "🖐 מחפש טרמפ"}
          </button>
          <button type="button" onClick={() => setShowForm((v) => !v)}
            className="text-xs text-[#1A6B4A] border border-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#D6EDE3] transition-colors">
            {showForm ? "ביטול" : "+ פרסם טרמפ"}
          </button>
        </div>
      </div>
      <div className="text-[11px] text-fg-faint mb-3">
        סמן &quot;מחפש טרמפ&quot; ותקבל התראה כשמישהו יפרסם טרמפ חדש לטיול זה.
      </div>

      {showForm && (
        <div className="border border-border rounded-xl p-3 mb-3 flex flex-col gap-2">
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="עיר יציאה"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
          <div className="flex gap-2">
            <input type="number" min="1" value={spots} onChange={(e) => setSpots(e.target.value)} placeholder="מקומות"
              className="w-24 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" dir="ltr" />
            <select value={direction} onChange={(e) => setDirection(e.target.value as "ROUND_TRIP" | "ONE_WAY")}
              className="flex-1 border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-surface">
              <option value="ROUND_TRIP">הלוך ושוב</option>
              <option value="ONE_WAY">כיוון אחד</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input type="checkbox" checked={costSharing} onChange={(e) => setCostSharing(e.target.checked)} />
            השתתפות בהוצאות דלק
          </label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערה (אופציונלי)"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
          <button type="button" onClick={createOffer} disabled={saving}
            className="py-2 bg-[#1A6B4A] text-white rounded-full text-xs font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60">
            {saving ? "מפרסם..." : "פרסם"}
          </button>
        </div>
      )}

      {loading && <div className="text-center py-4 text-fg-faint text-xs">טוען...</div>}
      {!loading && offers.length === 0 && (
        <div className="text-center py-6 text-fg-faint text-xs">אין טרמפים עדיין — היה הראשון לפרסם</div>
      )}

      <div className="flex flex-col gap-2">
        {offers.map((o) => {
          const taken = o.claims.length;
          const left = Math.max(o.spots - taken, 0);
          const isPoster = o.posterId === meId;
          const iClaimed = o.claims.some((c) => c.userId === meId);
          return (
            <div key={o.id} className={`rounded-xl p-3 border ${isPoster ? "border-accent bg-accent/10" : "border-border bg-surface-2/50"}`}>
              {isPoster && <div className="mb-1.5"><span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>הטרמפ שלי</span></div>}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-fg">
                  📍 {o.departureCity} · {o.direction === "ONE_WAY" ? "כיוון אחד" : "הלוך ושוב"}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${left > 0 ? "bg-[#D6EDE3] text-[#0F5038]" : "bg-[#FADBD8] text-[#791F1F]"}`}>
                  {left > 0 ? `${left} מקומות פנויים` : "מלא"}
                </span>
              </div>
              <div className="text-[11px] text-fg-muted mt-1">
                {o.poster.name ?? "משתתף"}
                {o.poster.phone ? (
                  <> · 📞 <a href={`tel:${o.poster.phone}`} className="text-[#185FA5]">{o.poster.phone}</a></>
                ) : ""}
                {o.costSharing ? " · השתתפות בדלק" : ""}{o.note ? ` · ${o.note}` : ""}
              </div>
              {isPoster && taken > 0 && (
                <div className="text-[11px] text-[#0F5038] mt-1 flex flex-col gap-1">
                  {o.claims.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 flex-wrap">
                      <span>{c.user.name ?? "משתתף"}</span>
                      {c.user.phone && (
                        <a href={`tel:${c.user.phone}`} className="text-[#185FA5]">📞 {c.user.phone}</a>
                      )}
                      <button type="button" onClick={() => router.push(`/trips/${tripId}/chat?with=${c.userId}`)}
                        className="text-[#1A6B4A] hover:underline">💬 צ&apos;אט</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {isPoster ? (
                  <button type="button" onClick={() => leave(o.id)}
                    className="text-[11px] text-red-500 border border-red-200 rounded-full px-3 py-1 hover:bg-surface-2">בטל טרמפ</button>
                ) : iClaimed ? (
                  <>
                    <span className="text-[11px] text-[#0F5038]">✓ הצטרפת — תאם מול {o.poster.name ?? "המפרסם"}</span>
                    <button type="button" onClick={() => router.push(`/trips/${tripId}/chat?with=${o.posterId}`)}
                      className="text-[11px] text-white bg-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#155a3e]">💬 צ&apos;אט</button>
                    <button type="button" onClick={() => leave(o.id)}
                      className="text-[11px] text-fg-muted border border-border rounded-full px-3 py-1 hover:bg-surface-2">עזוב</button>
                  </>
                ) : left > 0 ? (
                  <button type="button" onClick={() => claim(o.id)}
                    className="text-[11px] text-white bg-[#1A6B4A] rounded-full px-3 py-1 hover:bg-[#155a3e]">הצטרף</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

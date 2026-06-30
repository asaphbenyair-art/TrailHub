"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const DIFF_LABEL: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };

interface GuideProfile {
  guide: {
    id: string;
    headline: string | null;
    bio: string | null;
    location: string | null;
    rating: number;
    reviewCount: number;
    selfGuidedRating: number;
    selfGuidedReviewCount: number;
    isVerified: boolean;
    yearsActive: number | null;
    specialtyRegions: string[];
    interests: string[];
    youtubeUrl: string | null;
    podcastUrl: string | null;
    trainingInstitution: string | null;
    user: { name: string | null; image: string | null; birthYear: number | null; createdAt: string };
  };
  upcomingTrips: Array<{
    id: string; title: string; region: string; difficulty: string; date: string;
    startTime: string; price: number; maxSpots: number; spotsBooked: number; images: string[];
  }>;
  reviews: Array<{ id: string; rating: number; comment: string | null; createdAt: string; user: { name: string | null }; trip: { title: string } }>;
  histogram: number[];
  stats: { tripCount: number; followerCount: number; totalHikers: number; cancelledCount: number };
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

export default function GuideProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<GuideProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"trips" | "reviews">("trips");
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    fetch(`/api/guides/${id}`).then((r) => r.json()).then((d) => {
      if (!d.error) setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/guides/${id}/follow`).then((r) => r.json()).then((d) => setFollowing(!!d.following)).catch(() => {});
  }, [session, id]);

  async function toggleFollow() {
    if (!session) { router.push("/auth/login"); return; }
    const next = !following;
    setFollowing(next);
    await fetch(`/api/guides/${id}/follow`, { method: next ? "POST" : "DELETE" }).catch(() => setFollowing(!next));
  }

  if (loading) return <div dir="rtl" className="min-h-screen flex items-center justify-center text-gray-400 text-sm">טוען...</div>;
  if (!data) return <div dir="rtl" className="min-h-screen flex items-center justify-center text-gray-500 text-sm">המדריך לא נמצא</div>;

  const { guide, upcomingTrips, reviews, histogram, stats } = data;
  const name = guide.user.name;
  const age = guide.user.birthYear ? new Date().getFullYear() - guide.user.birthYear : null;
  const memberSince = new Date(guide.user.createdAt).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
  const totalReviews = histogram.reduce((a, b) => a + b, 0);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-[480px] mx-auto px-3 py-3 pb-10">
        <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm mb-3">← חזרה</button>

        {/* Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
          <div className="flex items-center gap-4">
            {guide.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={guide.user.image} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#D6EDE3] flex items-center justify-center text-xl font-semibold text-[#1A6B4A]">{initials(name)}</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-gray-900">{name ?? "מדריך"}</span>
                {guide.isVerified && <span className="text-[#1A6B4A] text-sm" title="מאומת">✓</span>}
              </div>
              {guide.headline && <div className="text-xs text-gray-500 mt-0.5">{guide.headline}</div>}
            </div>
            <button type="button" onClick={toggleFollow}
              className={`text-xs rounded-full px-3 py-1.5 transition-colors ${following ? "bg-[#1A6B4A] text-white" : "border border-[#1A6B4A] text-[#1A6B4A] hover:bg-[#D6EDE3]"}`}>
              {following ? "🔔 עוקב" : "+ עקוב"}
            </button>
          </div>

          {guide.selfGuidedReviewCount > 0 && (
            <div className="mt-3 bg-[#EEF5FC] rounded-xl px-3 py-2 text-xs text-[#185FA5] flex items-center justify-between">
              <span>🎒 דירוג טיולים עצמאיים (נפרד)</span>
              <span className="font-semibold">★ {guide.selfGuidedRating.toFixed(1)} · {guide.selfGuidedReviewCount} ביקורות</span>
            </div>
          )}

          {/* Stat row (guided trips) */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { v: guide.rating > 0 ? `★ ${guide.rating.toFixed(1)}` : "—", l: "דירוג" },
              { v: guide.reviewCount, l: "ביקורות" },
              { v: stats.totalHikers, l: "מטיילים" },
              { v: stats.tripCount, l: "טיולים" },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <div className="text-sm font-semibold text-gray-900">{s.v}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bio + tags */}
        {(guide.bio || guide.specialtyRegions.length > 0 || guide.interests.length > 0 || guide.youtubeUrl || guide.podcastUrl) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3 flex flex-col gap-3">
            {guide.bio && <p className="text-sm text-gray-700 leading-relaxed">{guide.bio}</p>}
            {guide.specialtyRegions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {guide.specialtyRegions.map((r) => (
                  <span key={r} className="text-[11px] px-2 py-1 rounded-full bg-[#D6EDE3] text-[#0F5038]">📍 {r}</span>
                ))}
              </div>
            )}
            {guide.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {guide.interests.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600">{t}</span>
                ))}
              </div>
            )}
            {(guide.youtubeUrl || guide.podcastUrl) && (
              <div className="flex gap-2">
                {guide.youtubeUrl && <a href={guide.youtubeUrl} target="_blank" rel="noreferrer" className="text-xs text-[#C0392B] border border-[#C0392B]/30 rounded-full px-3 py-1">▶ יוטיוב</a>}
                {guide.podcastUrl && <a href={guide.podcastUrl} target="_blank" rel="noreferrer" className="text-xs text-[#6B3B87] border border-[#6B3B87]/30 rounded-full px-3 py-1">🎙 פודקאסט</a>}
              </div>
            )}
          </div>
        )}

        {/* Declared data (clearly marked) */}
        {(guide.yearsActive || guide.trainingInstitution || age) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
            <div className="text-xs font-medium text-gray-500 mb-2">פרטים שהמדריך הצהיר עליהם *</div>
            <div className="flex flex-col gap-1.5 text-sm text-gray-700">
              {guide.yearsActive ? <div>🥾 {guide.yearsActive} שנות ניסיון</div> : null}
              {guide.trainingInstitution && <div>🎓 הכשרה: {guide.trainingInstitution}</div>}
              {age && <div>👤 גיל {age}</div>}
            </div>
            <div className="text-[10px] text-gray-300 mt-2">* נתונים שהמדריך הצהיר עליהם</div>
          </div>
        )}

        {/* Platform data (computed) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
          <div className="text-xs font-medium text-gray-500 mb-2">נתוני פלטפורמה</div>
          <div className="flex flex-col gap-1.5 text-sm text-gray-700">
            <div>🧭 {stats.tripCount} טיולים דרך TrailHub</div>
            <div>❌ {stats.cancelledCount} ביטולים</div>
            <div>📅 חבר מאז {memberSince}</div>
          </div>
          <div className="text-[10px] text-gray-300 mt-2">נתונים מחושבים אוטומטית</div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {([["trips", `טיולים קרובים (${upcomingTrips.length})`], ["reviews", `ביקורות (${guide.reviewCount})`]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${tab === k ? "border-[#1A6B4A] text-[#1A6B4A]" : "border-transparent text-gray-400"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "trips" && (
              upcomingTrips.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">אין טיולים קרובים</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingTrips.map((t) => (
                    <button key={t.id} type="button" onClick={() => router.push(`/trips/${t.id}`)}
                      className="flex gap-3 border border-gray-100 rounded-xl p-2.5 text-right hover:bg-gray-50 transition-colors">
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                        {t.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : <div className="w-full h-full" style={{ background: "linear-gradient(160deg,#3d6b35,#1a3d16)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          📍 {t.region} · {DIFF_LABEL[t.difficulty]} · {new Date(t.date).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">₪{t.price} · {Math.max(t.maxSpots - t.spotsBooked, 0)} מקומות</div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}

            {tab === "reviews" && (
              <div className="flex flex-col gap-3">
                {/* Histogram */}
                {totalReviews > 0 && (
                  <div className="flex items-center gap-4 pb-3 border-b border-gray-50">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{guide.rating.toFixed(1)}</div>
                      <div className="text-amber-500 text-xs">{"★".repeat(Math.round(guide.rating))}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{guide.reviewCount} ביקורות</div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      {histogram.map((count, i) => {
                        const star = 5 - i;
                        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="w-3">{star}★</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-7 text-left">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">אין ביקורות עדיין</div>
                ) : reviews.map((r) => (
                  <div key={r.id} className="border-b border-gray-50 pb-2.5 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{r.user.name ?? "מטייל"}</span>
                      <span className="text-amber-500 text-xs">{"★".repeat(r.rating)}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mb-1">על: {r.trip.title}</div>
                    {r.comment && <p className="text-xs text-gray-600 leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

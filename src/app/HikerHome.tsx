"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDir } from "@/components/useLabels";
import { Bell, CalendarDays, SlidersHorizontal, Clock, Sparkles, Heart, ChevronLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import AvatarMenu from "@/components/AvatarMenu";
import Brand from "@/components/Brand";
import ModeIndicator from "@/components/ModeIndicator";
import { hikingPhoto } from "@/lib/tripImage";

interface HomeTrip {
  id: string;
  title: string;
  region: string;
  images: string[];
  date: string;
  price: number;
  distanceKm: number;
  durationMin: number;
  guide: { id: string; rating: number; user: { name: string | null; image: string | null } };
  _count?: { days: number };
}

type HeroCategory = "featured_trip" | "featured_guide" | "new_in_app" | "near_you";

interface Hero {
  category: HeroCategory;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string | null;
  cta: { label: string; href: string } | null;
}

const FALLBACK_IMG = "linear-gradient(150deg,#1c3a20,#0a0a0a)";

const INTENT_CARDS = [
  { key: "Date", Icon: CalendarDays, href: "/trips?intent=date" },
  { key: "Filter", Icon: SlidersHorizontal, href: "/trips?intent=filter" },
  { key: "Soon", Icon: Clock, href: "/trips?intent=soon" },
  { key: "Surprise", Icon: Sparkles, href: "/trips?intent=surprise" },
] as const;

export default function HikerHome() {
  const router = useRouter();
  const th = useTranslations("home");
  const dir = useDir();
  const [trips, setTrips] = useState<HomeTrip[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [visit, setVisit] = useState(1);
  const [unread, setUnread] = useState(0);
  const [liked, setLiked] = useState(false);

  // Rotate the hero by visit count (1→2→3→4→1…), persisted locally.
  useEffect(() => {
    let v = 1;
    try {
      v = (parseInt(localStorage.getItem("trailhub-home-visits") ?? "0", 10) || 0) + 1;
      localStorage.setItem("trailhub-home-visits", String(v));
    } catch {}
    setVisit(v);
  }, []);

  useEffect(() => {
    fetch("/api/trips?category=guided")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setTrips(d))
      .catch(() => {});
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p?.preferredRegions && setRegions(p.preferredRegions))
      .catch(() => {});
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((n) => Array.isArray(n) && setUnread(n.filter((x: { read: boolean }) => !x.read).length))
      .catch(() => {});
  }, []);

  const hero: Hero = useMemo(() => {
    const upcoming = trips.filter((t) => new Date(t.date) >= new Date());
    const pool = upcoming.length ? upcoming : trips;
    const category = (["featured_trip", "featured_guide", "new_in_app", "near_you"] as HeroCategory[])[(visit - 1) % 4];

    if (category === "featured_guide") {
      // Most active guide recently = most upcoming trips; tiebreak by rating.
      const byGuide = new Map<string, { g: HomeTrip["guide"]; n: number }>();
      for (const t of pool) {
        const e = byGuide.get(t.guide.id) ?? { g: t.guide, n: 0 };
        e.n += 1;
        byGuide.set(t.guide.id, e);
      }
      const top = [...byGuide.values()].sort((a, b) => b.n - a.n || (b.g.rating || 0) - (a.g.rating || 0))[0];
      if (top) {
        return {
          category, eyebrow: "מדריך מוביל",
          title: top.g.user.name ?? "מדריך",
          subtitle: `${top.n} טיולים קרובים${top.g.rating > 0 ? ` · דירוג ${top.g.rating.toFixed(1)}` : ""}`,
          image: top.g.user.image ?? hikingPhoto(top.g.id),
          cta: { label: th("viewGuide"), href: `/guides/${top.g.id}` },
        };
      }
    }

    if (category === "new_in_app") {
      // Phase 1: manually-curated announcement (admin-authored in later phase).
      return {
        category, eyebrow: "חדש באפליקציה",
        title: "טיולים עצמאיים הגיעו לבשבילי",
        subtitle: "חבילות תוכן מלאות לניווט עצמי — צאו מתי שמתחשק לכם, בקצב שלכם.",
        image: hikingPhoto("new-in-app"),
        cta: { label: "קרא עוד", href: "/trips?category=self_guided" },
      };
    }

    if (category === "near_you") {
      const near = pool.find((t) => regions.includes(t.region));
      if (near) {
        return {
          category, eyebrow: "קרוב אליך",
          title: near.title,
          subtitle: `${near.region} · ₪${near.price.toLocaleString("he-IL")}`,
          image: hikingPhoto(near.id, 0, { region: near.region, title: near.title }),
          cta: { label: th("viewTrip"), href: `/trips/${near.id}` },
        };
      }
    }

    // Default / featured_trip: highest-rated upcoming trip.
    const featured = [...pool].sort((a, b) => (b.guide.rating || 0) - (a.guide.rating || 0))[0];
    if (featured) {
      const parts = [
        featured.distanceKm > 0 ? `${featured.distanceKm} ק״מ` : null,
        featured.durationMin > 0 ? `${Math.round(featured.durationMin / 60)} שע׳` : null,
        featured.guide.user.name,
        featured.guide.rating > 0 ? `★ ${featured.guide.rating.toFixed(1)}` : null,
      ].filter(Boolean);
      return {
        category: "featured_trip", eyebrow: "הטיול המומלץ",
        title: featured.title,
        subtitle: parts.join(" · "),
        image: hikingPhoto(featured.id, 0, { region: featured.region, title: featured.title }),
        cta: { label: th("viewTrip"), href: `/trips/${featured.id}` },
      };
    }

    return {
      category: "featured_trip", eyebrow: "ברוכים הבאים",
      title: "מצא את הטיול הבא שלך",
      subtitle: "עשרות טיולים מודרכים ברחבי הארץ",
      image: null,
      cta: { label: "גלה טיולים", href: "/trips" },
    };
  }, [trips, regions, visit]);

  function likeSignal() {
    // Phase 1: collect the preference signal locally; no personalization yet.
    setLiked(true);
    try {
      const key = "trailhub-like-signals";
      const arr = JSON.parse(localStorage.getItem(key) ?? "[]");
      arr.push({ category: hero.category, title: hero.title, at: Date.now() });
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  }

  return (
    <div dir={dir} className="min-h-screen bg-bg pb-24">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <Brand href={null} />
          <div className="flex items-center gap-2">
            <ModeIndicator mode="hiker" />
            <ThemeToggle />
            <LanguageToggle />
            <Link href="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-full border border-border" style={{ color: "var(--fg-muted)" }}>
              <Bell size={17} strokeWidth={1.8} />
              {unread > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <AvatarMenu />
          </div>
        </div>
      </header>

      <div className="max-w-[480px] mx-auto">
        {/* ── Hero (~70vh) ── */}
        <section className="relative w-full overflow-hidden" style={{ height: "70vh", minHeight: 460 }}>
          {hero.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: FALLBACK_IMG }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 8%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.35))" }} />

          <div className="absolute inset-x-0 bottom-0 p-6 pb-8">
            <div className="text-amber text-[11px] font-semibold tracking-[0.2em] uppercase mb-3">
              {hero.eyebrow}
            </div>
            <h1 className="font-display text-white text-[34px] leading-[1.1] mb-2">{hero.title}</h1>
            <p className="text-white/80 text-sm leading-relaxed mb-5 max-w-[85%]">{hero.subtitle}</p>

            <div className="flex flex-col gap-2.5">
              {hero.cta && (
                <button type="button" onClick={() => router.push(hero.cta!.href)}
                  className="w-full py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-1.5"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
                  {hero.cta.label} <ChevronLeft size={16} />
                </button>
              )}
              <button type="button" onClick={likeSignal} disabled={liked}
                className="w-full py-3 rounded-full text-sm font-medium flex items-center justify-center gap-1.5 border border-white/30 text-white backdrop-blur-sm bg-surface/5 disabled:opacity-70">
                <Heart size={15} fill={liked ? "#fff" : "none"} />
                {liked ? "נשמר — נראה לך עוד כאלה" : "אהבתי — הראה לי עוד כאלה"}
              </button>
            </div>
          </div>
        </section>

        {/* ── Intent question ── */}
        <section className="px-4 pt-7 pb-6">
          <h2 className="font-display text-2xl text-fg mb-4">{th("whatToday")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {INTENT_CARDS.map(({ key, Icon, href }) => (
              <Link key={key} href={href}
                className="rounded-2xl p-4 border border-border bg-surface flex flex-col gap-6 active:scale-[0.98] transition-transform overflow-hidden relative"
                style={{ minHeight: 130, borderTop: "3px solid var(--accent)" }}>
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                  <Icon size={19} style={{ color: "var(--accent)" }} strokeWidth={1.9} />
                </span>
                <span className="mt-auto">
                  <span className="block text-sm font-semibold text-fg leading-snug">{th(`intent${key}`)}</span>
                  <span className="block text-[11px] text-fg-faint mt-0.5">{th(`intent${key}Sub`)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

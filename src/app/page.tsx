import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import HikerHome from "./HikerHome";

export default async function Home() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  // Role-based default landing (honouring the last active mode when set):
  //  - מנהל טיול (TRIP_MANAGER) → the trip-manager dashboard
  //  - guide → guide dashboard by default (unless they last switched to hiker)
  //  - מטייל → hiker home
  if (session?.user) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: { activeMode: true, guide: { select: { id: true } } },
    });
    if (role === "TRIP_MANAGER") {
      redirect("/manager");
    }
    const isGuide = !!me?.guide || role === "GUIDE" || role === "ADMIN";
    const mode = me?.activeMode ?? (isGuide ? "guide" : "hiker");
    if (mode === "guide" && isGuide) {
      redirect("/guide/dashboard");
    }
  }

  // Logged-in hiker → the finalized homepage (hero + intent question)
  if (session?.user) {
    return <HikerHome />;
  }

  // Logged-out → splash: full-bleed hand-drawn trail image + overlay
  return (
    <main dir="rtl" className="relative min-h-screen flex flex-col justify-end overflow-hidden" style={{ background: "#0d1a0f" }}>
      {/* Portrait sketch cropped to fill the screen (don't rotate). */}
      {/* Optimised WebP (~300KB), eager + high priority so it paints fast. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/splash-trail.webp"
        alt=""
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center" }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />

      <div className="relative max-w-[480px] mx-auto w-full px-6 pb-14 pt-24">
        {/* Slogan — right-aligned; בשבילי + עפר bold green */}
        <div dir="rtl" className="font-display text-white text-right leading-snug mb-8" style={{ fontWeight: 300, fontSize: "clamp(20px, 6vw, 30px)", textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}>
          <span style={{ color: "#3d8f5f", fontWeight: 700 }}>בשבילי</span> נברא העולם — אנוכי{" "}
          <span style={{ color: "#3d8f5f", fontWeight: 700 }}>עפר</span> ואפר
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/auth/login"
            className="w-full text-center rounded-full py-4 text-base font-semibold shadow-lg"
            style={{ background: "#3d8f5f", color: "#fff" }}>
            כניסה / הרשמה
          </Link>
          <Link href="/trips" className="w-full text-center py-2 text-sm text-white/80">
            גלה טיולים ללא הרשמה →
          </Link>
        </div>
      </div>
    </main>
  );
}

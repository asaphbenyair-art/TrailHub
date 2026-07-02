import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import HikerHome from "./HikerHome";
import { BrandSlogan, BrandTrail } from "@/components/Brand";

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

  // Logged-out → editorial marketing landing
  return (
    <main dir="rtl" className="relative min-h-screen flex flex-col justify-end overflow-hidden">
      <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#1c3a20,#0a0a0a)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 70% 0%, rgba(61,143,95,0.25), transparent 60%)" }} />

      <div className="relative max-w-[480px] mx-auto w-full px-6 pb-14 pt-24">
        <div className="mb-10">
          <BrandSlogan className="font-display text-lg sm:text-xl leading-snug block mb-3" />
          <BrandTrail className="max-w-[300px]" />
        </div>
        <h1 className="font-display text-white text-[42px] leading-[1.08] mb-4">
          הטיול הבא שלך<br />מתחיל כאן.
        </h1>
        <p className="text-white/75 text-base leading-relaxed mb-10 max-w-[88%]">
          שוק דו-צדדי המחבר מדריכי טיולים למטיילים — טיולים מודרכים, מסעות רב-יומיים וטיולים עצמאיים ברחבי הארץ.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/auth/register"
            className="w-full text-center rounded-full py-4 text-sm font-semibold"
            style={{ background: "#3d8f5f", color: "#fff" }}>
            הרשמה
          </Link>
          <Link href="/auth/login"
            className="w-full text-center rounded-full py-4 text-sm font-medium border border-white/25 text-white bg-surface/5 backdrop-blur-sm">
            כניסה
          </Link>
          <Link href="/trips" className="w-full text-center py-2 text-sm text-white/70">
            גלה טיולים ללא הרשמה →
          </Link>
        </div>
      </div>
    </main>
  );
}

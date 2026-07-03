import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Derive specialty tags from a guide's headline + bio for the directory filter.
const SPECIALTY_MAP: [RegExp, string][] = [
  [/גיאולוג/, "גיאולוגיה"],
  [/ארכיאולוג/, "ארכיאולוגיה"],
  [/צפר|ציפור/, "צפרות"],
  [/תנ|מקרא/, "תנ״ך"],
  [/מדבר|נגב|ים המלח|ערבה|מכתש/, "מדבר"],
  [/אתגר|שביל ישראל|שטח/, "טיולי אתגר"],
  [/מוסיק/, "מוסיקה"],
  [/עתיקות|היסטורי|אפרסמון|בשמים/, "היסטוריה"],
  [/טבע/, "טבע"],
];

function specialtiesFor(text: string): string[] {
  const out = new Set<string>();
  for (const [re, label] of SPECIALTY_MAP) if (re.test(text)) out.add(label);
  return [...out];
}

export async function GET() {
  const now = new Date();
  const guides = await prisma.guide.findMany({
    where: { bio: { not: null }, user: { role: { in: ["GUIDE", "ADMIN"] } } },
    include: {
      user: { select: { name: true, image: true } },
      _count: {
        select: {
          trips: { where: { date: { gte: now }, status: { in: ["OPEN", "FULL"] }, visibility: "PUBLIC" } },
        },
      },
    },
  });

  // Which of these guides does the logged-in user follow?
  const session = await auth();
  let followed = new Set<string>();
  if (session?.user) {
    const follows = await prisma.guideFollow.findMany({
      where: { userId: session.user.id!, guideId: { in: guides.map((g) => g.id) } },
      select: { guideId: true },
    });
    followed = new Set(follows.map((f) => f.guideId));
  }

  const list = guides.map((g) => ({
    id: g.id,
    name: g.user.name,
    image: g.user.image,
    headline: g.headline,
    bio: g.bio,
    specialtyRegions: g.specialtyRegions,
    rating: g.rating,
    reviewCount: g.reviewCount,
    upcomingTrips: g._count.trips,
    specialties: specialtiesFor(`${g.headline ?? ""} ${g.bio ?? ""}`),
    following: followed.has(g.id),
  }));

  // Most active / highest rated first
  list.sort((a, b) => b.upcomingTrips - a.upcomingTrips || b.rating - a.rating);

  return NextResponse.json(list);
}

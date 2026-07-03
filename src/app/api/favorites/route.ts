import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → the current user's favorited trip ids (or full trip cards with ?full=1)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ids: [], trips: [] });
  const favs = await prisma.favoriteTrip.findMany({
    where: { userId: session.user.id! },
    select: { tripId: true },
    orderBy: { createdAt: "desc" },
  });
  const ids = favs.map((f) => f.tripId);

  const full = new URL(req.url).searchParams.get("full") === "1";
  if (!full) return NextResponse.json({ ids });

  const trips = await prisma.trip.findMany({
    where: { id: { in: ids } },
    include: {
      guide: { include: { user: { select: { name: true } } } },
      _count: { select: { days: true } },
    },
  });
  // Preserve the favorite order (most-recently added first).
  const order = new Map(ids.map((id, i) => [id, i]));
  trips.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const cards = trips.map((t) => ({
    id: t.id, title: t.title, region: t.region, difficulty: t.difficulty, status: t.status,
    date: t.date, startTime: t.startTime, durationMin: t.durationMin, distanceKm: t.distanceKm,
    price: t.price, maxSpots: t.maxSpots, spotsBooked: t.spotsBooked, images: t.images,
    tripType: t.tripType, dayCount: t._count.days, accessWindowDays: t.accessWindowDays,
    guideName: t.guide?.user?.name ?? null, guideRating: t.guide?.rating ?? 0,
  }));
  return NextResponse.json({ ids, trips: cards });
}

// POST { tripId } → toggle favorite. Returns { favorited }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { tripId } = await req.json();
  if (!tripId) return NextResponse.json({ error: "חסר tripId" }, { status: 400 });

  const existing = await prisma.favoriteTrip.findUnique({
    where: { userId_tripId: { userId: session.user.id!, tripId } },
  });
  if (existing) {
    await prisma.favoriteTrip.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favoriteTrip.create({ data: { userId: session.user.id!, tripId } });
  return NextResponse.json({ favorited: true });
}

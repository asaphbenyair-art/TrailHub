import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const registrations = await prisma.registration.findMany({
    where: { userId: session.user.id! },
    include: {
      trip: {
        include: {
          guide: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { trip: { date: "asc" } },
  });

  // Public Q&A counts per trip, for the card Q&A indicator.
  const tripIds = [...new Set(registrations.map((r) => r.tripId))];
  const [qaAll, qaOpen] = await Promise.all([
    prisma.tripQuestion.groupBy({ by: ["tripId"], where: { tripId: { in: tripIds }, isPrivate: false }, _count: { _all: true } }),
    prisma.tripQuestion.groupBy({ by: ["tripId"], where: { tripId: { in: tripIds }, isPrivate: false, answer: null }, _count: { _all: true } }),
  ]);
  const qaCountByTrip: Record<string, number> = {};
  for (const g of qaAll) qaCountByTrip[g.tripId] = g._count._all;
  const qaOpenByTrip: Record<string, number> = {};
  for (const g of qaOpen) qaOpenByTrip[g.tripId] = g._count._all;

  const withQa = registrations.map((r) => ({
    ...r,
    trip: { ...r.trip, qaCount: qaCountByTrip[r.tripId] ?? 0, qaOpen: qaOpenByTrip[r.tripId] ?? 0 },
  }));

  return NextResponse.json(withQa);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET → public guide profile: declared info + platform stats + upcoming trips + reviews
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guide = await prisma.guide.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, image: true, birthYear: true, createdAt: true } },
      _count: { select: { trips: true, followers: true } },
    },
  });
  if (!guide) return NextResponse.json({ error: "מדריך לא נמצא" }, { status: 404 });

  const now = new Date();
  const upcomingTrips = await prisma.trip.findMany({
    where: { guideId: id, visibility: "PUBLIC", status: { in: ["OPEN", "FULL"] }, date: { gte: now } },
    orderBy: { date: "asc" },
    take: 10,
    select: {
      id: true, title: true, region: true, difficulty: true, date: true, startTime: true,
      price: true, maxSpots: true, spotsBooked: true, images: true, tripType: true,
    },
  });

  // Reviews across all of this guide's trips
  const reviews = await prisma.review.findMany({
    where: { trip: { guideId: id } },
    include: { user: { select: { name: true } }, trip: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Rating histogram (5★ → 1★)
  const histogram = [0, 0, 0, 0, 0];
  reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) histogram[5 - r.rating]++; });

  // Distinct hikers who confirmed on this guide's trips
  const confirmed = await prisma.registration.findMany({
    where: { trip: { guideId: id }, status: "CONFIRMED" },
    select: { userId: true },
    distinct: ["userId"],
  });

  // Cancelled-trip count (platform data)
  const cancelledCount = await prisma.trip.count({ where: { guideId: id, status: "CANCELLED" } });

  return NextResponse.json({
    guide,
    upcomingTrips,
    reviews,
    histogram,
    stats: {
      tripCount: guide._count.trips,
      followerCount: guide._count.followers,
      totalHikers: confirmed.length,
      cancelledCount,
    },
  });
}

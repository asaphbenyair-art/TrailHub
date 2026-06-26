import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const guide = await prisma.guide.findUnique({
    where: { userId: session.user.id! },
    include: {
      trips: { orderBy: { date: "asc" }, take: 20 },
    },
  });
  if (!guide) return NextResponse.json({ error: "מדריך לא נמצא" }, { status: 404 });

  return NextResponse.json({ guide, trips: guide.trips });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "GUIDE" && role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const guide = await prisma.guide.findUnique({
    where: { userId: session.user.id },
  });
  if (!guide) return NextResponse.json({ error: "פרופיל מדריך לא נמצא" }, { status: 404 });

  const body = await req.json();

  const {
    title, description, region, date, startTime,
    meetingPoint, waypoints, difficulty, maxSpots, price,
    distanceKm, durationMin, whatToBring,
    cancellationPolicy, status, images,
  } = body;

  if (!title || !region || !date || !startTime || !price) {
    return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
  }

  const trip = await prisma.trip.create({
    data: {
      title,
      description: description || null,
      region,
      date: new Date(date),
      startTime,
      meetingPoint: meetingPoint || null,
      waypoints: waypoints || null,
      difficulty: difficulty || "MEDIUM",
      maxSpots: parseInt(maxSpots) || 20,
      price: parseFloat(price),
      distanceKm: parseFloat(distanceKm) || 0,
      durationMin: parseInt(durationMin) || 0,
      whatToBring: whatToBring || null,
      cancellationPolicy: cancellationPolicy || null,
      status: status || "DRAFT",
      images: Array.isArray(images) ? images : [],
      guideId: guide.id,
    },
  });

  return NextResponse.json(trip, { status: 201 });
}

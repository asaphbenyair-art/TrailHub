import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getGuideAndTrip(userId: string, tripId: string) {
  const guide = await prisma.guide.findUnique({ where: { userId } });
  if (!guide) return { error: "פרופיל מדריך לא נמצא", status: 404 };

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { error: "טיול לא נמצא", status: 404 };
  if (trip.guideId !== guide.id) return { error: "אין הרשאה", status: 403 };

  return { guide, trip };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "GUIDE" && role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const result = await getGuideAndTrip(session.user.id!, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json();
  const {
    title, description, region, date, startTime,
    meetingPoint, waypoints, difficulty, maxSpots, price,
    distanceKm, durationMin, whatToBring,
    cancellationPolicy, status, images,
  } = body;

  const prevStatus = result.trip.status;
  const newStatus = status || "DRAFT";

  const updated = await prisma.trip.update({
    where: { id },
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
      status: newStatus,
      images: Array.isArray(images) ? images : [],
    },
  });

  // Notify all active registrants about the update
  const isCancellation = newStatus === "CANCELLED" && prevStatus !== "CANCELLED";
  const notifType = isCancellation ? "TRIP_CANCELLED" : "TRIP_UPDATED";
  const notifTitle = isCancellation ? "טיול בוטל" : "עדכון בטיול";
  const notifBody = isCancellation
    ? `הטיול "${title}" בוטל על ידי המדריך.`
    : `פרטי הטיול "${title}" עודכנו. בדוק שהכל מסודר.`;

  const registrants = await prisma.registration.findMany({
    where: {
      tripId: id,
      status: { in: ["CONFIRMED", "PENDING", "WAITLIST"] },
    },
    select: { userId: true },
  });

  if (registrants.length > 0) {
    await prisma.notification.createMany({
      data: registrants.map((r) => ({
        userId: r.userId,
        tripId: id,
        type: notifType,
        title: notifTitle,
        body: notifBody,
      })),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "GUIDE" && role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const result = await getGuideAndTrip(session.user.id!, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  await prisma.trip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

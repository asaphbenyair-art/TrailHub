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
    title, description, region, date, endDate, startTime,
    meetingPoint, waypoints, difficulty, maxSpots, price,
    distanceKm, durationMin, whatToBring,
    cancellationPolicy, status, images,
    tripType, priceTiers, tripDays, coupons,
  } = body;

  if (!title || !region || !date || !startTime || !price) {
    return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
  }

  try {
    const trip = await prisma.trip.create({
      data: {
        title,
        description: description || null,
        region,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
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
        tripType: tripType || "DAY_HIKE",
        priceTiers: priceTiers ?? undefined,
      },
    });

    // Create TripDay records
    if (Array.isArray(tripDays) && tripDays.length > 0) {
      await prisma.tripDay.createMany({
        data: tripDays.map((d: { dayNumber: number; title?: string; description?: string; distanceKm?: string; durationHours?: string; startPoint?: string; endPoint?: string }) => ({
          tripId: trip.id,
          dayNumber: d.dayNumber,
          title: d.title || null,
          description: d.description || null,
          distanceKm: d.distanceKm ? parseFloat(d.distanceKm) : null,
          durationMin: d.durationHours ? Math.round(parseFloat(d.durationHours) * 60) : null,
          startPoint: d.startPoint || null,
          endPoint: d.endPoint || null,
        })),
      });
    }

    // Create Coupon records
    if (Array.isArray(coupons) && coupons.length > 0) {
      for (const c of coupons as { code: string; discountPct: string; maxUses?: string; expiresAt?: string }[]) {
        if (!c.code) continue;
        try {
          await prisma.coupon.create({
            data: {
              code: c.code.toUpperCase(),
              discountPct: parseInt(c.discountPct) || 10,
              maxUses: c.maxUses ? parseInt(c.maxUses) : null,
              expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
              guideId: guide.id,
              tripId: trip.id,
            },
          });
        } catch {
          // Skip duplicate coupon codes silently
        }
      }
    }

    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    console.error("[guide/trips POST]", err);
    return NextResponse.json({ error: "שגיאת שרת ביצירת הטיול" }, { status: 500 });
  }
}

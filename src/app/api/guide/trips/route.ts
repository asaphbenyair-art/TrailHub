import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncTripTeam } from "@/lib/tripAccess";
import { mapTripDay } from "@/lib/tripDay";

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

  // Also surface trips this user co-manages or co-guides (secondary)
  const shared = await prisma.trip.findMany({
    where: {
      guideId: { not: guide.id },
      OR: [
        { managers: { some: { userId: session.user.id! } } },
        { guides: { some: { guide: { userId: session.user.id! } } } },
      ],
    },
    orderBy: { date: "asc" },
    take: 20,
  });

  const byId = new Map<string, (typeof guide.trips)[number]>();
  for (const t of [...guide.trips, ...shared]) byId.set(t.id, t);

  return NextResponse.json({ guide, trips: Array.from(byId.values()) });
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
    distanceKm, durationMin, whatToBring, healthDeclarationUrl,
    cancellationPolicy, status, images,
    tripType, priceTiers, tripDays, coupons,
    visibility, registrationFields, routeType,
    minAge, maxAge, fitnessLevel, minSpots, registrationMode,
    secondGuideEmail, secondGuideRole, managerEmails,
    routeGpx, waypointsJson, individualDayPrice,
    unlimitedCapacity, accessWindowDays, attributeTags,
    sourceMaterials, sourceMaterialsVisibility, multiPersonMode,
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
        healthDeclarationUrl: healthDeclarationUrl || null,
        cancellationPolicy: cancellationPolicy || null,
        status: status || "DRAFT",
        visibility: visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        registrationMode: registrationMode || "FULL_ONLY",
        registrationFields: Array.isArray(registrationFields) && registrationFields.length > 0 ? registrationFields : undefined,
        routeType: routeType || null,
        minAge: minAge ? parseInt(minAge) : null,
        maxAge: maxAge ? parseInt(maxAge) : null,
        fitnessLevel: fitnessLevel || null,
        minSpots: minSpots ? parseInt(minSpots) : null,
        routeGpx: routeGpx || null,
        waypointsJson: waypointsJson ?? undefined,
        individualDayPrice: individualDayPrice ? parseFloat(individualDayPrice) : null,
        unlimitedCapacity: !!unlimitedCapacity,
        accessWindowDays: accessWindowDays ? parseInt(accessWindowDays) : null,
        attributeTags: Array.isArray(attributeTags) ? attributeTags : [],
        sourceMaterials: sourceMaterials ?? undefined,
        sourceMaterialsVisibility: sourceMaterialsVisibility || null,
        multiPersonMode: multiPersonMode || null,
        images: Array.isArray(images) ? images : [],
        guideId: guide.id,
        tripType: tripType || "DAY_HIKE",
        priceTiers: priceTiers ?? undefined,
      },
    });

    // Create TripDay records
    if (Array.isArray(tripDays) && tripDays.length > 0) {
      await prisma.tripDay.createMany({ data: tripDays.map(mapTripDay(trip.id)) });
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

    // Sync guides team (owner primary + optional secondary) and co-managers
    await syncTripTeam({
      tripId: trip.id,
      ownerGuideId: guide.id,
      secondGuideEmail,
      secondGuideRole,
      managerEmails,
    });

    // Notify followers when a brand-new public trip is published
    if (trip.status === "OPEN" && trip.visibility === "PUBLIC") {
      const followers = await prisma.guideFollow.findMany({
        where: { guideId: guide.id },
        select: { userId: true },
      });
      if (followers.length > 0) {
        await prisma.notification.createMany({
          data: followers.map((f) => ({
            userId: f.userId,
            tripId: trip.id,
            type: "NEW_TRIP_FROM_GUIDE" as const,
            title: "טיול חדש ממדריך שאתה עוקב אחריו",
            body: `טיול חדש: "${trip.title}"`,
            link: `/trips/${trip.id}`,
          })),
        });
      }
    }

    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    console.error("[guide/trips POST]", err);
    return NextResponse.json({ error: "שגיאת שרת ביצירת הטיול" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip, syncTripTeam } from "@/lib/tripAccess";
import { mapTripDay } from "@/lib/tripDay";

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
  const trip = await prisma.trip.findUnique({ where: { id }, include: { guide: true } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });
  const allowed = await canManageTrip(id, session.user.id!, role);
  if (!allowed) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const result = { trip, guide: trip.guide };

  const body = await req.json();
  const {
    title, description, region, date, endDate, startTime,
    meetingPoint, waypoints, difficulty, maxSpots, price, estimatedEndTime,
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

  const prevStatus = result.trip.status;
  const newStatus = status || "DRAFT";

  let updated;
  try {
    updated = await prisma.trip.update({
      where: { id },
      data: {
        title,
        description: description || null,
        region,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        startTime,
        estimatedEndTime: estimatedEndTime || null,
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
        status: newStatus,
        visibility: visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        ...(registrationMode && { registrationMode }),
        registrationFields: Array.isArray(registrationFields) ? registrationFields : undefined,
        routeType: routeType || null,
        minAge: minAge ? parseInt(minAge) : null,
        maxAge: maxAge ? parseInt(maxAge) : null,
        fitnessLevel: fitnessLevel || null,
        minSpots: minSpots ? parseInt(minSpots) : null,
        routeGpx: routeGpx || null,
        waypointsJson: waypointsJson ?? undefined,
        individualDayPrice: individualDayPrice ? parseFloat(individualDayPrice) : null,
        ...(unlimitedCapacity !== undefined && { unlimitedCapacity: !!unlimitedCapacity }),
        ...(accessWindowDays !== undefined && { accessWindowDays: accessWindowDays ? parseInt(accessWindowDays) : null }),
        ...(attributeTags !== undefined && { attributeTags: Array.isArray(attributeTags) ? attributeTags : [] }),
        ...(sourceMaterials !== undefined && { sourceMaterials: sourceMaterials ?? undefined }),
        ...(sourceMaterialsVisibility !== undefined && { sourceMaterialsVisibility: sourceMaterialsVisibility || null }),
        ...(multiPersonMode !== undefined && { multiPersonMode: multiPersonMode || null }),
        images: Array.isArray(images) ? images : [],
        tripType: tripType || "DAY_HIKE",
        priceTiers: priceTiers ?? undefined,
      },
    });
  } catch (err) {
    console.error("[guide/trips PUT]", err);
    return NextResponse.json({ error: "שגיאת שרת בעדכון הטיול" }, { status: 500 });
  }

  // Sync TripDay records
  if (Array.isArray(tripDays)) {
    await prisma.tripDay.deleteMany({ where: { tripId: id } });
    if (tripDays.length > 0) {
      await prisma.tripDay.createMany({ data: tripDays.map(mapTripDay(id)) });
    }
  }

  // Sync guides team + co-managers (only when the fields were provided)
  if (secondGuideEmail !== undefined || managerEmails !== undefined) {
    await syncTripTeam({
      tripId: id,
      ownerGuideId: result.guide.id,
      secondGuideEmail,
      secondGuideRole,
      managerEmails,
    });
  }

  // Create new coupons (don't delete existing ones)
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
            guideId: result.guide.id,
            tripId: id,
          },
        });
      } catch {
        // Skip duplicate codes
      }
    }
  }

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
        link: `/trips/${id}`,
      })),
    });
  }

  // Route (GPX) changed on a trip that already has registrants → auto-broadcast a
  // route-update notice so everyone re-checks the updated route (spec: GPX edit).
  const gpxChanged = (routeGpx || null) !== (result.trip.routeGpx || null);
  if (gpxChanged && registrants.length > 0) {
    const routeMsg = `המדריך עדכן את מסלול הטיול — ${title ?? result.trip.title}. מומלץ לבדוק את המסלול המעודכן.`;
    await prisma.broadcast.create({ data: { tripId: id, senderId: session.user.id!, body: routeMsg } });
    await prisma.notification.createMany({
      data: registrants.map((r) => ({
        userId: r.userId,
        tripId: id,
        type: "TRIP_UPDATED" as const,
        title: `עדכון מסלול · ${title ?? result.trip.title}`,
        body: routeMsg,
        link: `/trips/${id}`,
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

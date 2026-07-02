import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip } from "@/lib/tripAccess";

// POST → postpone a trip (new state between active and cancelled). Registrants notified.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageTrip(id, session.user.id!, (session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { category, reason } = await req.json();
  if (!category) return NextResponse.json({ error: "נא לבחור סיבה" }, { status: 400 });

  const trip = await prisma.trip.update({
    where: { id },
    data: { status: "POSTPONED", postponeCategory: category, postponeReason: reason || null },
    select: { title: true },
  });

  const registrants = await prisma.registration.findMany({
    where: { tripId: id, status: { in: ["CONFIRMED", "PENDING", "WAITLIST"] } },
    select: { userId: true },
  });
  if (registrants.length > 0) {
    await prisma.notification.createMany({
      data: registrants.map((r) => ({
        userId: r.userId, tripId: id, type: "TRIP_UPDATED" as const,
        title: "הטיול נדחה", body: `הטיול "${trip.title}" נדחה. תוכל להישאר ולהמתין לתאריך חדש, או לבטל ולקבל החזר מלא.`,
        link: `/trips/${id}`,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}

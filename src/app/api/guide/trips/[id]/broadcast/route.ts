import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip } from "@/lib/tripAccess";

// POST → broadcast a message to all active registrants of a trip (guide/co-manager)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;

  const allowed = await canManageTrip(id, session.user.id!, (session.user as { role?: string }).role);
  if (!allowed) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { message, isCancellation } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "הודעה ריקה" }, { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id }, select: { title: true } });

  // Persist the broadcast to history.
  await prisma.broadcast.create({
    data: { tripId: id, senderId: session.user.id!, body: message.trim(), isCancellation: !!isCancellation },
  });

  const registrants = await prisma.registration.findMany({
    where: { tripId: id, status: { in: ["CONFIRMED", "PENDING", "WAITLIST", "CONDITIONAL", "INTERESTED"] } },
    select: { userId: true },
  });

  if (registrants.length > 0) {
    await prisma.notification.createMany({
      data: registrants.map((r) => ({
        userId: r.userId,
        tripId: id,
        type: "TRIP_UPDATED" as const,
        title: isCancellation ? `⚠ ביטול טיול · ${trip?.title ?? "טיול"}` : `הודעה מהמדריך · ${trip?.title ?? "טיול"}`,
        body: message.trim(),
        link: `/trips/${id}#announcements`,
      })),
    });
  }

  return NextResponse.json({ ok: true, sent: registrants.length });
}

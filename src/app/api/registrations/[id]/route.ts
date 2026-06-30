import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withinNoRefundWindow } from "@/lib/payment";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;
  const reg = await prisma.registration.findUnique({ where: { id }, include: { trip: true } });
  if (!reg) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (reg.userId !== session.user.id) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const wasConfirmed = reg.status === "CONFIRMED";

  // Inside the no-refund window the card was (or will be) captured — no refund.
  // Before the window we release the authorization → full refund.
  const inWindow = withinNoRefundWindow(reg.trip.date, reg.trip.cancellationPolicy);
  const newPaymentStatus = reg.paymentStatus === "PAID" || inWindow ? "PAID" : "REFUNDED";

  await prisma.registration.update({
    where: { id },
    data: {
      status: "CANCELLED",
      paymentStatus: newPaymentStatus,
      ...(newPaymentStatus === "REFUNDED" && { refundedAt: new Date() }),
    },
  });

  if (wasConfirmed && !reg.trip.unlimitedCapacity) {
    await prisma.trip.update({
      where: { id: reg.tripId },
      data: { spotsBooked: { decrement: Math.max(1, reg.participantCount) } },
    });
  }

  return NextResponse.json({ ok: true, refunded: newPaymentStatus === "REFUNDED" });
}

// PATCH → partial cancellation of a multi-person registration (reduce by N)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const { reduceBy } = await req.json();
  const n = Math.max(1, Number(reduceBy) || 1);

  const reg = await prisma.registration.findUnique({ where: { id }, include: { trip: true } });
  if (!reg) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (reg.userId !== session.user.id) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  if (n >= reg.participantCount) return NextResponse.json({ error: "לביטול מלא השתמש בביטול ההרשמה" }, { status: 400 });

  const remaining = reg.participantCount - n;
  const perPerson = reg.participantCount > 0 ? reg.totalPrice / reg.participantCount : 0;
  await prisma.registration.update({
    where: { id },
    data: { participantCount: remaining, totalPrice: perPerson * remaining },
  });
  if (reg.status === "CONFIRMED" && !reg.trip.unlimitedCapacity) {
    await prisma.trip.update({ where: { id: reg.tripId }, data: { spotsBooked: { decrement: n } } });
  }
  // Refund for the cancelled portion is processed per the cancellation policy (simulated).
  return NextResponse.json({ ok: true, participantCount: remaining });
}

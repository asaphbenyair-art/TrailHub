import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (reg.userId !== session.user.id) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const wasConfirmed = reg.status === "CONFIRMED";

  await prisma.registration.update({
    where: { id },
    data: { status: "CANCELLED", paymentStatus: "REFUNDED" },
  });

  if (wasConfirmed) {
    await prisma.trip.update({
      where: { id: reg.tripId },
      data: { spotsBooked: { decrement: 1 } },
    });
  }

  return NextResponse.json({ ok: true });
}

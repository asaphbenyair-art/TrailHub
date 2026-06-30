import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST → admin removes a trip from search/publication (the only urgent action in Phase 1)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const { reason } = await req.json().catch(() => ({ reason: "" }));

  const trip = await prisma.trip.findUnique({ where: { id }, select: { title: true, tripType: true } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  await prisma.trip.update({
    where: { id },
    data: { status: "CANCELLED", visibility: "PRIVATE", approvalNote: `הוסר ע"י מנהל: ${reason || "תוכן בעייתי"}` },
  });

  if (trip.tripType === "SELF_GUIDED") {
    // Existing buyers lose access immediately + get notified
    const purchases = await prisma.selfGuidedPurchase.findMany({ where: { tripId: id, revoked: false }, select: { userId: true } });
    await prisma.selfGuidedPurchase.updateMany({ where: { tripId: id }, data: { revoked: true } });
    if (purchases.length > 0) {
      await prisma.notification.createMany({
        data: purchases.map((p) => ({
          userId: p.userId, tripId: id, type: "TRIP_CANCELLED" as const,
          title: "תוכן הוסר", body: `הטיול העצמאי "${trip.title}" נמצא בעייתי והוסר. הגישה לתוכן בוטלה.`,
        })),
      });
    }
  } else {
    const regs = await prisma.registration.findMany({ where: { tripId: id, status: { in: ["CONFIRMED", "PENDING", "WAITLIST"] } }, select: { userId: true } });
    if (regs.length > 0) {
      await prisma.notification.createMany({
        data: regs.map((r) => ({
          userId: r.userId, tripId: id, type: "TRIP_CANCELLED" as const,
          title: "טיול הוסר", body: `הטיול "${trip.title}" הוסר מהפלטפורמה ע"י מנהל.`,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}

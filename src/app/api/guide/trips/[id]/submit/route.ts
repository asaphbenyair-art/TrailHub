import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "GUIDE" && role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;

  const guide = await prisma.guide.findUnique({ where: { userId: session.user.id! } });
  if (!guide) return NextResponse.json({ error: "פרופיל מדריך לא נמצא" }, { status: 404 });

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });
  if (trip.guideId !== guide.id) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  if (trip.status !== "DRAFT" && trip.status !== "REJECTED") {
    return NextResponse.json({ error: "ניתן לשלוח לאישור רק טיוטות או טיולים שנדחו" }, { status: 400 });
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: { status: "PENDING_REVIEW", approvalNote: null },
  });

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        tripId: id,
        type: "TRIP_UPDATED" as const,
        title: "טיול ממתין לאישור",
        body: `"${trip.title}" של ${guide.id} נשלח לבדיקה.`,
      })),
    });
  }

  return NextResponse.json(updated);
}

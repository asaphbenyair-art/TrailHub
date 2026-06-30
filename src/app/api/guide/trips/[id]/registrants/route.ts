import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → registrants for a trip (guide or co-manager only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { guide: { select: { userId: true } }, managers: { select: { userId: true } } },
  });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const uid = session.user.id!;
  const role = (session.user as { role?: string }).role;
  const allowed = trip.guide.userId === uid || trip.managers.some((m) => m.userId === uid) || role === "ADMIN";
  if (!allowed) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const registrations = await prisma.registration.findMany({
    where: { tripId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    registrationFields: trip.registrationFields ?? [],
    registrations,
  });
}

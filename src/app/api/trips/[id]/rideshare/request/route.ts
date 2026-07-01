import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Access: registrants/interested of the trip, the guide, or co-managers
async function canAccess(tripId: string, userId: string, role?: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { guide: { select: { userId: true } }, managers: { select: { userId: true } } },
  });
  if (!trip) return { ok: false as const, status: 404, error: "טיול לא נמצא" };
  if (trip.guide.userId === userId || trip.managers.some((m) => m.userId === userId) || role === "ADMIN") {
    return { ok: true as const, trip };
  }
  const reg = await prisma.registration.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });
  if (reg && reg.status !== "CANCELLED") return { ok: true as const, trip };
  return { ok: false as const, status: 403, error: "רק נרשמים ומתעניינים יכולים לראות טרמפים" };
}

// POST → mark the current user as looking for a ride on this trip
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const access = await canAccess(id, userId, (session.user as { role?: string }).role);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.rideshareRequest.upsert({
    where: { tripId_userId: { tripId: id, userId } },
    create: { tripId: id, userId },
    update: {},
  });

  return NextResponse.json({ ok: true, looking: true });
}

// DELETE → stop looking for a ride on this trip
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const access = await canAccess(id, userId, (session.user as { role?: string }).role);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.rideshareRequest.deleteMany({ where: { tripId: id, userId } });

  return NextResponse.json({ ok: true, looking: false });
}

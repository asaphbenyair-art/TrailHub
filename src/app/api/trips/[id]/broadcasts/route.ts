import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → broadcast/announcement history for a trip.
// Visible to the trip's registrants/interested users, the guide, co-managers, and admin.
async function canAccess(tripId: string, userId: string, role?: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { guide: { select: { userId: true } }, managers: { select: { userId: true } } },
  });
  if (!trip) return false;
  if (trip.guide.userId === userId || trip.managers.some((m) => m.userId === userId) || role === "ADMIN") return true;
  const reg = await prisma.registration.findUnique({ where: { tripId_userId: { tripId, userId } } });
  return !!(reg && reg.status !== "CANCELLED");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  if (!(await canAccess(id, session.user.id!, (session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const broadcasts = await prisma.broadcast.findMany({
    where: { tripId: id },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(broadcasts);
}

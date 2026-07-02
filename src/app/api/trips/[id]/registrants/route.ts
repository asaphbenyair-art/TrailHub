import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Access: registrants/interested of the trip, the guide, co-managers, or admin.
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

// GET → the trip's registrants, visible to fellow registrants/interested users.
// Respects each registrant's anonymity choice; waitlist shown separately.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  if (!(await canAccess(id, session.user.id!, (session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "רק נרשמים ומתעניינים יכולים לראות את רשימת המשתתפים" }, { status: 403 });
  }

  const regs = await prisma.registration.findMany({
    where: { tripId: id, status: { in: ["CONFIRMED", "WAITLIST"] } },
    include: { user: { select: { name: true, image: true, gender: true, slogan: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Privacy: hide phone/email always; hide identifying details for anonymous.
  const shape = (r: (typeof regs)[number]) => ({
    id: r.id,
    name: r.anonymous ? null : r.user.name,
    image: r.anonymous ? null : r.user.image,
    gender: r.anonymous ? null : r.user.gender,
    slogan: r.anonymous ? null : r.user.slogan,
    anonymous: r.anonymous,
    participantCount: r.participantCount,
    createdAt: r.createdAt,
  });

  return NextResponse.json({
    confirmed: regs.filter((r) => r.status === "CONFIRMED").map(shape),
    waitlist: regs.filter((r) => r.status === "WAITLIST").map(shape),
  });
}

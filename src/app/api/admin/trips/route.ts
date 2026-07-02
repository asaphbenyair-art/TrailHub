import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "ADMIN")) return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING_REVIEW";

  const trips = await prisma.trip.findMany({
    where: { status: status as never },
    include: {
      guide: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(trips);
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { tripId, action, note } = await req.json();
  if (!tripId || !action) return NextResponse.json({ error: "חסר tripId / action" }, { status: 400 });

  const newStatus = action === "approve" ? "OPEN" : "REJECTED";

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: newStatus as never,
      approvalNote: note ?? null,
    },
  });

  // Notify guide
  const fullTrip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { guide: { select: { userId: true } } },
  });
  if (fullTrip) {
    await prisma.notification.create({
      data: {
        userId: fullTrip.guide.userId,
        tripId,
        type: action === "approve" ? "TRIP_UPDATED" : "TRIP_CANCELLED",
        title: action === "approve" ? "הטיול אושר לפרסום ✓" : "הטיול נדחה",
        body: action === "approve"
          ? `הטיול "${trip.title}" אושר ועלה לאוויר.`
          : `הטיול "${trip.title}" נדחה. ${note ? `סיבה: ${note}` : ""}`,
        link: action === "approve" ? `/trips/${tripId}` : `/guide/dashboard`,
      },
    });
  }

  return NextResponse.json(trip);
}

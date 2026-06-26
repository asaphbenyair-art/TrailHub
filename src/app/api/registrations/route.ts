import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const body = await req.json();
  const { tripId, type, notes } = body as {
    tripId: string;
    type: "REGISTER" | "INTEREST" | "WAITLIST";
    notes?: string;
  };

  if (!tripId) return NextResponse.json({ error: "חסר tripId" }, { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const userId = session.user.id!;

  const existing = await prisma.registration.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });

  let status: "CONFIRMED" | "PENDING" | "WAITLIST";
  let paymentStatus: "PAID" | "PENDING";

  if (type === "INTEREST") {
    status = "PENDING";
    paymentStatus = "PENDING";
  } else if (type === "WAITLIST") {
    status = "WAITLIST";
    paymentStatus = "PENDING";
  } else {
    const spotsLeft = trip.maxSpots - trip.spotsBooked;
    if (spotsLeft <= 0) return NextResponse.json({ error: "הטיול מלא" }, { status: 409 });
    status = "CONFIRMED";
    paymentStatus = "PAID";
  }

  if (existing && existing.status !== "CANCELLED") {
    const reg = await prisma.registration.update({
      where: { id: existing.id },
      data: { status, paymentStatus, notes: notes || null, totalPrice: trip.price },
    });
    if (type === "REGISTER" && existing.status !== "CONFIRMED") {
      await prisma.trip.update({ where: { id: tripId }, data: { spotsBooked: { increment: 1 } } });
    }
    return NextResponse.json(reg);
  }

  const reg = await prisma.registration.create({
    data: {
      tripId,
      userId,
      status,
      paymentStatus,
      totalPrice: trip.price,
      notes: notes || null,
    },
  });

  if (type === "REGISTER") {
    await prisma.trip.update({ where: { id: tripId }, data: { spotsBooked: { increment: 1 } } });
  }

  return NextResponse.json(reg, { status: 201 });
}

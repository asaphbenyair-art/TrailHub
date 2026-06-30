import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withinNoRefundWindow, simIntentId } from "@/lib/payment";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const body = await req.json();
  const { tripId, type, notes, fieldAnswers, signedPolicy, alertThresholdHours, interestThreshold, conditions, autoRegister, compCode } = body as {
    tripId: string;
    type: "REGISTER" | "INTEREST" | "WAITLIST";
    notes?: string;
    fieldAnswers?: Record<string, string>;
    signedPolicy?: boolean;
    alertThresholdHours?: number;
    interestThreshold?: number;
    conditions?: string[];
    autoRegister?: boolean;
    compCode?: string;
  };

  if (!tripId) return NextResponse.json({ error: "חסר tripId" }, { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const userId = session.user.id!;

  // Comp code (free volunteer invite) — register free, outside capacity
  if (type === "REGISTER" && compCode?.trim()) {
    const coupon = await prisma.coupon.findUnique({ where: { code: compCode.trim().toUpperCase() } });
    if (!coupon || !coupon.isComp || !coupon.isActive || coupon.tripId !== tripId) {
      return NextResponse.json({ error: "קוד מתנדב לא תקין" }, { status: 400 });
    }
    const reg = await prisma.registration.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId, status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 0, isComp: true, signedPolicy: !!signedPolicy, ...(fieldAnswers && { fieldAnswers }) },
      update: { status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 0, isComp: true },
    });
    await prisma.coupon.update({ where: { code: coupon.code }, data: { usedCount: { increment: 1 } } });
    // Comp registrations do NOT count against capacity — no spotsBooked change.
    return NextResponse.json(reg, { status: 201 });
  }

  const existing = await prisma.registration.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });

  let status: "CONFIRMED" | "PENDING" | "WAITLIST";
  let paymentStatus: "PAID" | "PENDING" | "AUTHORIZED";
  // Payment timestamps (Stripe-shaped: authorize now, capture at no-refund window)
  let payTimestamps: { authorizedAt?: Date; capturedAt?: Date; paymentIntentId?: string } = {};

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
    const now = new Date();
    const inWindow = withinNoRefundWindow(trip.date, trip.cancellationPolicy, now);
    // Authorize the card now; capture immediately only if already inside the no-refund window
    paymentStatus = inWindow ? "PAID" : "AUTHORIZED";
    payTimestamps = {
      authorizedAt: now,
      paymentIntentId: simIntentId(),
      ...(inWindow && { capturedAt: now }),
    };
  }

  const cleanConditions = Array.isArray(conditions) ? conditions.filter((c) => c && c.trim()) : [];
  const extraData = {
    ...(fieldAnswers && Object.keys(fieldAnswers).length > 0 && { fieldAnswers }),
    ...(signedPolicy !== undefined && { signedPolicy: !!signedPolicy }),
    ...(alertThresholdHours !== undefined && { alertThresholdHours: Number(alertThresholdHours) || null }),
    ...(interestThreshold !== undefined && { interestThreshold: Number(interestThreshold) || null }),
    ...(cleanConditions.length > 0 && { conditions: cleanConditions }),
    ...(autoRegister !== undefined && { autoRegister: !!autoRegister }),
    ...payTimestamps,
  };

  if (existing && existing.status !== "CANCELLED") {
    const reg = await prisma.registration.update({
      where: { id: existing.id },
      data: { status, paymentStatus, notes: notes || null, totalPrice: trip.price, ...extraData },
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
      ...extraData,
    },
  });

  if (type === "REGISTER") {
    await prisma.trip.update({ where: { id: tripId }, data: { spotsBooked: { increment: 1 } } });
  }

  return NextResponse.json(reg, { status: 201 });
}

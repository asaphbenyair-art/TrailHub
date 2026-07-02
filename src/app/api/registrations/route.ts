import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withinNoRefundWindow, simIntentId } from "@/lib/payment";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const body = await req.json();
  const { tripId, type, notes, fieldAnswers, signedPolicy, healthDeclaration, alertThresholdHours, interestThreshold, conditions, autoRegister, compCode, participantCount, participantsDetail, anonymous } = body as {
    tripId: string;
    type: "REGISTER" | "INTEREST" | "WAITLIST";
    notes?: string;
    fieldAnswers?: Record<string, string>;
    signedPolicy?: boolean;
    healthDeclaration?: string;
    alertThresholdHours?: number;
    interestThreshold?: number;
    conditions?: string[];
    autoRegister?: boolean;
    compCode?: string;
    participantCount?: number;
    participantsDetail?: { name?: string; tier?: string; age?: string; gender?: string; fitness?: string; special?: string; userEmail?: string }[];
    anonymous?: boolean;
  };
  const count = Math.max(1, Number(participantCount) || 1);

  if (!tripId) return NextResponse.json({ error: "חסר tripId" }, { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  // Health declaration is mandatory to register when the guide attached one.
  if (type === "REGISTER" && trip.healthDeclarationUrl && !healthDeclaration?.trim()) {
    return NextResponse.json({ error: "נא לחתום על הצהרת הבריאות" }, { status: 400 });
  }

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
    if (!trip.unlimitedCapacity && spotsLeft < count) {
      return NextResponse.json({ error: spotsLeft <= 0 ? "הטיול מלא" : `נותרו ${spotsLeft} מקומות בלבד` }, { status: 409 });
    }
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
  // Total: sum of each participant's chosen price category when tiers exist; else flat.
  const tiers = Array.isArray(trip.priceTiers) ? (trip.priceTiers as { label: string; price: number | string }[]) : [];
  const totalPrice = (Array.isArray(participantsDetail) && participantsDetail.length > 0 && tiers.length > 0)
    ? participantsDetail.reduce((sum, p) => {
        const t = p.tier ? tiers.find((x) => x.label === p.tier) : null;
        return sum + (t ? Number(t.price) || 0 : trip.price);
      }, 0)
    : trip.price * count;
  const extraData = {
    participantCount: count,
    ...(Array.isArray(participantsDetail) && participantsDetail.length > 0 && { participantsDetail }),
    ...(fieldAnswers && Object.keys(fieldAnswers).length > 0 && { fieldAnswers }),
    ...(signedPolicy !== undefined && { signedPolicy: !!signedPolicy }),
    ...(healthDeclaration !== undefined && { healthDeclaration: healthDeclaration || null }),
    ...(alertThresholdHours !== undefined && { alertThresholdHours: Number(alertThresholdHours) || null }),
    ...(interestThreshold !== undefined && { interestThreshold: Number(interestThreshold) || null }),
    ...(cleanConditions.length > 0 && { conditions: cleanConditions }),
    ...(autoRegister !== undefined && { autoRegister: !!autoRegister }),
    ...(anonymous !== undefined && { anonymous: !!anonymous }),
    ...payTimestamps,
  };

  if (existing && existing.status !== "CANCELLED") {
    const reg = await prisma.registration.update({
      where: { id: existing.id },
      data: { status, paymentStatus, notes: notes || null, totalPrice, ...extraData },
    });
    if (type === "REGISTER" && existing.status !== "CONFIRMED" && !trip.unlimitedCapacity) {
      await prisma.trip.update({ where: { id: tripId }, data: { spotsBooked: { increment: count } } });
    }
    return NextResponse.json(reg);
  }

  const reg = await prisma.registration.create({
    data: {
      tripId,
      userId,
      status,
      paymentStatus,
      totalPrice,
      notes: notes || null,
      ...extraData,
    },
  });

  if (type === "REGISTER" && !trip.unlimitedCapacity) {
    await prisma.trip.update({ where: { id: tripId }, data: { spotsBooked: { increment: count } } });
  }

  return NextResponse.json(reg, { status: 201 });
}

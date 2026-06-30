import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip } from "@/lib/tripAccess";
import { randomBytes } from "crypto";

// GET → list comp codes for a trip
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageTrip(id, session.user.id!, (session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const codes = await prisma.coupon.findMany({
    where: { tripId: id, isComp: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(codes);
}

// POST → generate a comp code (100% off, outside capacity). Co-manager allowed.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageTrip(id, session.user.id!, (session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const trip = await prisma.trip.findUnique({ where: { id }, select: { guideId: true } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const code = "COMP-" + randomBytes(3).toString("hex").toUpperCase();
  const coupon = await prisma.coupon.create({
    data: { code, discountPct: 100, isComp: true, guideId: trip.guideId, tripId: id },
  });
  return NextResponse.json(coupon, { status: 201 });
}

// DELETE → revoke an unused comp code (?code=...)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageTrip(id, session.user.id!, (session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "חסר קוד" }, { status: 400 });
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || coupon.tripId !== id) return NextResponse.json({ error: "קוד לא נמצא" }, { status: 404 });
  if (coupon.usedCount > 0) return NextResponse.json({ error: "קוד שכבר נוצל לא ניתן לביטול" }, { status: 400 });
  await prisma.coupon.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}

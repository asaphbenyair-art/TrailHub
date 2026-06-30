import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { simIntentId } from "@/lib/payment";

// GET → has the current user purchased this self-guided trip? (+ access status)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ purchased: false });
  const { id } = await params;
  const p = await prisma.selfGuidedPurchase.findUnique({
    where: { tripId_userId: { tripId: id, userId: session.user.id! } },
  });
  if (!p || p.revoked) return NextResponse.json({ purchased: false });
  const expired = p.accessExpiresAt ? new Date(p.accessExpiresAt) < new Date() : false;
  return NextResponse.json({ purchased: true, expired, accessExpiresAt: p.accessExpiresAt, sharedWith: p.sharedWith });
}

// POST → purchase a self-guided trip (immediate final payment, simulated)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });
  if (trip.tripType !== "SELF_GUIDED") return NextResponse.json({ error: "לא טיול עצמאי" }, { status: 400 });

  const accessExpiresAt = trip.accessWindowDays
    ? new Date(Date.now() + trip.accessWindowDays * 86400000)
    : null;

  const purchase = await prisma.selfGuidedPurchase.upsert({
    where: { tripId_userId: { tripId: id, userId: session.user.id! } },
    create: { tripId: id, userId: session.user.id!, price: trip.price, accessExpiresAt, revoked: false },
    update: { accessExpiresAt, revoked: false, purchasedAt: new Date() },
  });

  // Final payment is immediate (no auth/capture). simIntentId stands in for the Stripe charge.
  void simIntentId();

  return NextResponse.json({ ok: true, purchase }, { status: 201 });
}

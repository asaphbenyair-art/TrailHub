import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { simIntentId } from "@/lib/payment";
import { canManageTrip } from "@/lib/tripAccess";

// GET → does the current user have access (own purchase OR shared with them)?
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ purchased: false });
  const { id } = await params;

  // The trip's own guide / co-managers / admin can always preview the content
  // (no purchase needed) — otherwise they'd be locked out of their own trip.
  const role = (session.user as { role?: string }).role;
  if (await canManageTrip(id, session.user.id!, role)) {
    return NextResponse.json({ purchased: true, owner: false, expired: false, canManage: true });
  }

  const p = await prisma.selfGuidedPurchase.findUnique({
    where: { tripId_userId: { tripId: id, userId: session.user.id! } },
  });
  if (p && !p.revoked) {
    const expired = p.accessExpiresAt ? new Date(p.accessExpiresAt) < new Date() : false;
    return NextResponse.json({ purchased: true, owner: true, expired, accessExpiresAt: p.accessExpiresAt, sharedWith: p.sharedWith });
  }

  // Shared access: someone shared this trip with the user's email
  const email = session.user.email?.toLowerCase();
  if (email) {
    const shared = await prisma.selfGuidedPurchase.findFirst({
      where: { tripId: id, revoked: false, sharedWith: { has: email } },
    });
    if (shared) {
      const expired = shared.accessExpiresAt ? new Date(shared.accessExpiresAt) < new Date() : false;
      return NextResponse.json({ purchased: true, owner: false, expired });
    }
  }

  return NextResponse.json({ purchased: false });
}

// PATCH → owner shares access with up to 3 emails
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const { sharedWith } = await req.json();
  const emails = Array.isArray(sharedWith)
    ? [...new Set(sharedWith.map((e: string) => e.trim().toLowerCase()).filter(Boolean))].slice(0, 3)
    : [];

  const p = await prisma.selfGuidedPurchase.findUnique({
    where: { tripId_userId: { tripId: id, userId: session.user.id! } },
  });
  if (!p || p.revoked) return NextResponse.json({ error: "אין רכישה לשיתוף" }, { status: 403 });

  const updated = await prisma.selfGuidedPurchase.update({
    where: { id: p.id }, data: { sharedWith: emails },
  });
  return NextResponse.json({ ok: true, sharedWith: updated.sharedWith });
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

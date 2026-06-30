import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalcGuideRating } from "@/lib/rating";

// POST → create/update a review (participants of guided trips, buyers of self-guided)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;

  const { rating, comment } = await req.json();
  const r = Number(rating);
  if (!(r >= 1 && r <= 5)) return NextResponse.json({ error: "דירוג 1-5" }, { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id }, select: { tripType: true, guideId: true } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  // Eligibility: self-guided → must have purchased; guided → must have a registration (any status)
  let eligible = false;
  if (trip.tripType === "SELF_GUIDED") {
    const p = await prisma.selfGuidedPurchase.findUnique({ where: { tripId_userId: { tripId: id, userId } } });
    eligible = !!p && !p.revoked;
  } else {
    const reg = await prisma.registration.findUnique({ where: { tripId_userId: { tripId: id, userId } } });
    eligible = !!reg;
  }
  if (!eligible) return NextResponse.json({ error: "רק משתתפים יכולים לכתוב ביקורת" }, { status: 403 });

  await prisma.review.upsert({
    where: { tripId_userId: { tripId: id, userId } },
    create: { tripId: id, userId, rating: r, comment: comment?.trim() || null },
    update: { rating: r, comment: comment?.trim() || null },
  });

  await recalcGuideRating(trip.guideId);
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE → remove own review (rating auto-updates)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id }, select: { guideId: true } });
  await prisma.review.deleteMany({ where: { tripId: id, userId: session.user.id! } });
  if (trip) await recalcGuideRating(trip.guideId);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST → claim a spot on this ride
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id: tripId, offerId } = await params;
  const userId = session.user.id!;

  const offer = await prisma.rideshareOffer.findUnique({
    where: { id: offerId },
    include: { claims: true, trip: { select: { title: true } } },
  });
  if (!offer || offer.isCancelled || offer.tripId !== tripId) {
    return NextResponse.json({ error: "הטרמפ לא נמצא" }, { status: 404 });
  }
  if (offer.posterId === userId) return NextResponse.json({ error: "זה הטרמפ שלך" }, { status: 400 });
  if (offer.claims.some((c) => c.userId === userId)) return NextResponse.json({ error: "כבר הצטרפת" }, { status: 409 });
  if (offer.claims.length >= offer.spots) return NextResponse.json({ error: "הטרמפ מלא" }, { status: 409 });

  await prisma.rideshareClaim.create({ data: { offerId, userId } });

  // Open coordination: notify the ride poster
  await prisma.notification.create({
    data: {
      userId: offer.posterId,
      tripId,
      type: "RIDESHARE_UPDATE",
      title: "מישהו הצטרף לטרמפ שלך",
      body: `${session.user.name ?? "משתתף"} הצטרף לטרמפ מ${offer.departureCity} לטיול "${offer.trip.title}".`,
      link: `/trips/${tripId}?modal=rideshare`,
    },
  });

  // Auto-open a private chat thread between the claimer and the poster
  const existing = await prisma.chatMessage.findFirst({
    where: {
      tripId,
      OR: [
        { fromUserId: userId, toUserId: offer.posterId },
        { fromUserId: offer.posterId, toUserId: userId },
      ],
    },
  });
  if (!existing) {
    await prisma.chatMessage.create({
      data: {
        tripId,
        fromUserId: userId,
        toUserId: offer.posterId,
        body: `היי! הצטרפתי לטרמפ שלך מ${offer.departureCity}. בוא נתאם 🙂`,
      },
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE → leave the ride (claimer) OR cancel it (poster)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id: tripId, offerId } = await params;
  const userId = session.user.id!;

  const offer = await prisma.rideshareOffer.findUnique({
    where: { id: offerId },
    include: { claims: true, trip: { select: { title: true } } },
  });
  if (!offer || offer.tripId !== tripId) return NextResponse.json({ error: "הטרמפ לא נמצא" }, { status: 404 });

  if (offer.posterId === userId) {
    // Poster cancels → notify all claimers
    await prisma.rideshareOffer.update({ where: { id: offerId }, data: { isCancelled: true } });
    if (offer.claims.length > 0) {
      await prisma.notification.createMany({
        data: offer.claims.map((c) => ({
          userId: c.userId,
          tripId,
          type: "RIDESHARE_UPDATE" as const,
          title: "טרמפ בוטל",
          body: `הטרמפ מ${offer.departureCity} לטיול "${offer.trip.title}" בוטל. מצא חלופה.`,
          link: `/trips/${tripId}?modal=rideshare`,
        })),
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Claimer leaves → spot reopens
  await prisma.rideshareClaim.deleteMany({ where: { offerId, userId } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Access: registrants/interested of the trip, the guide, or co-managers
async function canAccess(tripId: string, userId: string, role?: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { guide: { select: { userId: true } }, managers: { select: { userId: true } } },
  });
  if (!trip) return { ok: false as const, status: 404, error: "טיול לא נמצא" };
  if (trip.guide.userId === userId || trip.managers.some((m) => m.userId === userId) || role === "ADMIN") {
    return { ok: true as const, trip };
  }
  const reg = await prisma.registration.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });
  if (reg && reg.status !== "CANCELLED") return { ok: true as const, trip };
  return { ok: false as const, status: 403, error: "רק נרשמים ומתעניינים יכולים לראות טרמפים" };
}

// GET → list ride offers for the trip
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const access = await canAccess(id, session.user.id!, (session.user as { role?: string }).role);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const offers = await prisma.rideshareOffer.findMany({
    where: { tripId: id, isCancelled: false },
    include: {
      poster: { select: { id: true, name: true, image: true, phone: true } },
      claims: { include: { user: { select: { id: true, name: true, phone: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Ride seekers ("אני מחפש טרמפ") — with a general area from their preferences.
  const requests = await prisma.rideshareRequest.findMany({
    where: { tripId: id },
    include: { user: { select: { id: true, name: true, image: true, preferredRegions: true } } },
    orderBy: { createdAt: "desc" },
  });
  const seekers = requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.user.name,
    image: r.user.image,
    area: r.user.preferredRegions?.[0] ?? null,
  }));
  const looking = seekers.some((s) => s.userId === session.user!.id);

  return NextResponse.json({ offers, seekers, meId: session.user.id, looking });
}

// POST → create a ride offer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const access = await canAccess(id, session.user.id!, (session.user as { role?: string }).role);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { departureCity, spots, direction, costSharing, note } = await req.json();
  if (!departureCity?.trim()) return NextResponse.json({ error: "נא להזין עיר יציאה" }, { status: 400 });

  const posterId = session.user.id!;
  const cleanCity = departureCity.trim();

  const offer = await prisma.rideshareOffer.create({
    data: {
      tripId: id,
      posterId,
      departureCity: cleanCity,
      spots: Math.max(1, parseInt(spots) || 1),
      direction: direction === "ONE_WAY" ? "ONE_WAY" : "ROUND_TRIP",
      costSharing: !!costSharing,
      note: note?.trim() || null,
    },
    include: {
      poster: { select: { id: true, name: true, image: true, phone: true } },
      claims: { include: { user: { select: { id: true, name: true, phone: true } } } },
    },
  });

  // Notify users who marked themselves as "looking for a ride" on this trip
  const seekers = await prisma.rideshareRequest.findMany({
    where: { tripId: id, userId: { not: posterId } },
  });
  if (seekers.length > 0) {
    await prisma.notification.createMany({
      data: seekers.map((s) => ({
        userId: s.userId,
        tripId: id,
        type: "RIDESHARE_UPDATE" as const,
        title: "טרמפ חדש פורסם",
        body: `טרמפ חדש מ${cleanCity} פורסם לטיול שסימנת שאתה מחפש אליו טרמפ.`,
      })),
    });
  }

  return NextResponse.json(offer, { status: 201 });
}

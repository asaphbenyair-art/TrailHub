import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST → a hiker files a complaint about a trip (esp. self-guided content defect).
// Goes to admins AND the guide who created the content.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { tripId, category, body } = await req.json();
  if (!tripId || !body?.trim()) return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { guide: { select: { userId: true } } },
  });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  await prisma.complaint.create({
    data: { tripId, userId: session.user.id!, category: category || "content", body: body.trim() },
  });

  // Notify the guide (admins see it in the admin panel)
  await prisma.notification.create({
    data: {
      userId: trip.guide.userId, tripId,
      type: "TRIP_UPDATED", title: "תלונה על הטיול",
      body: `התקבלה תלונה על "${trip.title}". המנהלים יבדקו.`,
      link: `/trips/${tripId}`,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

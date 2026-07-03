import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip } from "@/lib/tripAccess";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const meId = session?.user?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isManager = meId ? await canManageTrip(id, meId, role) : false;

  const questions = await prisma.tripQuestion.findMany({
    where: { tripId: id },
    include: {
      user: { select: { name: true, image: true } },
      replies: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Private questions are visible only to the guide/manager and the asker.
  const visible = questions.filter((q) => !q.isPrivate || isManager || q.userId === meId);
  return NextResponse.json(visible);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;
  const { body, isPrivate } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "שאלה ריקה" }, { status: 400 });

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { guide: { select: { userId: true } } },
  });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const question = await prisma.tripQuestion.create({
    data: { tripId: id, userId: session.user.id!, body: body.trim(), isPrivate: !!isPrivate },
    include: { user: { select: { name: true, image: true } } },
  });

  // Notify the guide of the new question (don't notify if the guide asks on their own trip)
  if (trip.guide.userId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId: trip.guide.userId,
        tripId: id,
        type: "NEW_MESSAGE",
        title: "שאלה חדשה על הטיול",
        body: `בטיול "${trip.title}": ${body.trim().slice(0, 60)}`,
        link: `/guide/trips/${id}/qa`,
      },
    });
  }

  return NextResponse.json(question, { status: 201 });
}

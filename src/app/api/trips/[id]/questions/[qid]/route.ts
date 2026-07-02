import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id: tripId, qid } = await params;
  const { answer } = await req.json();
  if (!answer?.trim()) return NextResponse.json({ error: "תשובה ריקה" }, { status: 400 });

  // Verify caller is the guide of this trip
  const guide = await prisma.guide.findUnique({ where: { userId: session.user.id! } });
  if (!guide) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.guideId !== guide.id) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const question = await prisma.tripQuestion.findUnique({ where: { id: qid } });
  if (!question || question.tripId !== tripId) {
    return NextResponse.json({ error: "שאלה לא נמצאה" }, { status: 404 });
  }

  const updated = await prisma.tripQuestion.update({
    where: { id: qid },
    data: { answer: answer.trim(), answeredAt: new Date() },
    include: { user: { select: { name: true, image: true } } },
  });

  // Notify the question asker
  await prisma.notification.create({
    data: {
      userId: question.userId,
      tripId,
      type: "QUESTION_ANSWERED",
      title: "המדריך ענה לשאלתך",
      body: `בטיול "${trip.title}": ${answer.trim().slice(0, 80)}`,
      link: `/trips/${tripId}#qa-${qid}`,
    },
  });

  return NextResponse.json(updated);
}

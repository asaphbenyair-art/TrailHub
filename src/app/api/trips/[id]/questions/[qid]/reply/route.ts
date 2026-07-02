import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip } from "@/lib/tripAccess";

// POST → add a threaded follow-up reply to a Q&A question.
// Allowed: the original asker, or anyone who manages the trip (guide/co-manager/admin).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id: tripId, qid } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "תגובה ריקה" }, { status: 400 });

  const question = await prisma.tripQuestion.findUnique({
    where: { id: qid },
    include: { trip: { select: { title: true, guide: { select: { userId: true } } } } },
  });
  if (!question || question.tripId !== tripId) {
    return NextResponse.json({ error: "שאלה לא נמצאה" }, { status: 404 });
  }

  const userId = session.user.id!;
  const role = (session.user as { role?: string }).role;
  const isManager = await canManageTrip(tripId, userId, role);
  const isAsker = question.userId === userId;
  if (!isManager && !isAsker) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const reply = await prisma.tripQuestionReply.create({
    data: { questionId: qid, userId, body: body.trim() },
    include: { user: { select: { name: true, image: true } } },
  });

  // Notify the other side of the thread.
  const guideUserId = question.trip.guide.userId;
  const notifyUserId = isManager ? question.userId : guideUserId;
  if (notifyUserId && notifyUserId !== userId) {
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        tripId,
        type: isManager ? "QUESTION_ANSWERED" : "NEW_MESSAGE",
        title: isManager ? "המדריך הגיב בשרשור השאלה" : "תגובה חדשה בשרשור השאלה",
        body: `בטיול "${question.trip.title}": ${body.trim().slice(0, 80)}`,
        link: isManager ? `/trips/${tripId}?scroll=qa-${qid}` : `/guide/trips/${tripId}/qa`,
      },
    });
  }

  return NextResponse.json(reply, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const questions = await prisma.tripQuestion.findMany({
    where: { tripId: id },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(questions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "שאלה ריקה" }, { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const question = await prisma.tripQuestion.create({
    data: { tripId: id, userId: session.user.id!, body: body.trim() },
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json(question, { status: 201 });
}

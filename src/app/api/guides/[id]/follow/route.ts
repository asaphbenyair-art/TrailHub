import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → { following: boolean }
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ following: false });
  const { id: guideId } = await params;
  const existing = await prisma.guideFollow.findUnique({
    where: { userId_guideId: { userId: session.user.id!, guideId } },
  });
  return NextResponse.json({ following: !!existing });
}

// POST → follow
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id: guideId } = await params;

  const guide = await prisma.guide.findUnique({ where: { id: guideId } });
  if (!guide) return NextResponse.json({ error: "מדריך לא נמצא" }, { status: 404 });

  await prisma.guideFollow.upsert({
    where: { userId_guideId: { userId: session.user.id!, guideId } },
    create: { userId: session.user.id!, guideId },
    update: {},
  });
  return NextResponse.json({ following: true });
}

// DELETE → unfollow
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id: guideId } = await params;

  await prisma.guideFollow.deleteMany({
    where: { userId: session.user.id!, guideId },
  });
  return NextResponse.json({ following: false });
}

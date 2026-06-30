import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → the current user's favorited trip ids
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ids: [] });
  const favs = await prisma.favoriteTrip.findMany({
    where: { userId: session.user.id! },
    select: { tripId: true },
  });
  return NextResponse.json({ ids: favs.map((f) => f.tripId) });
}

// POST { tripId } → toggle favorite. Returns { favorited }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { tripId } = await req.json();
  if (!tripId) return NextResponse.json({ error: "חסר tripId" }, { status: 400 });

  const existing = await prisma.favoriteTrip.findUnique({
    where: { userId_tripId: { userId: session.user.id!, tripId } },
  });
  if (existing) {
    await prisma.favoriteTrip.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favoriteTrip.create({ data: { userId: session.user.id!, tripId } });
  return NextResponse.json({ favorited: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → current active mode + whether the user is a guide
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ mode: "hiker", isGuide: false });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { activeMode: true, guide: { select: { id: true } } },
  });
  return NextResponse.json({ mode: user?.activeMode ?? "hiker", isGuide: !!user?.guide });
}

// POST → persist the active mode (guide | hiker)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { mode } = await req.json();
  const value = mode === "guide" ? "guide" : "hiker";
  await prisma.user.update({ where: { id: session.user.id! }, data: { activeMode: value } });
  return NextResponse.json({ ok: true, mode: value });
}

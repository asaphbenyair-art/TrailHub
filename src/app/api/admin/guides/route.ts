import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "ADMIN")) return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const onlyUnverified = searchParams.get("unverified") === "1";

  const guides = await prisma.guide.findMany({
    where: onlyUnverified ? { isVerified: false } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      _count: { select: { trips: true } },
    },
    orderBy: { user: { createdAt: "desc" } },
  });

  return NextResponse.json(guides);
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { guideId, isVerified } = await req.json();
  if (!guideId) return NextResponse.json({ error: "חסר guideId" }, { status: 400 });

  const guide = await prisma.guide.update({
    where: { id: guideId },
    data: { isVerified: Boolean(isVerified) },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(guide);
}

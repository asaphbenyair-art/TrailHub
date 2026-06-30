import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET ?q= → search existing platform users by name or email (for team pickers).
// Auth required; min 2 chars; capped results.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id! },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, image: true, guide: { select: { id: true } } },
    take: 8,
  });

  return NextResponse.json(users.map((u) => ({
    id: u.id, name: u.name, email: u.email, image: u.image, isGuide: !!u.guide,
  })));
}

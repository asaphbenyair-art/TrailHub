import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      _count: { select: { registrations: true, complaints: true } },
      guide: { select: { id: true, _count: { select: { trips: true } } } },
    },
  });
  return NextResponse.json(users);
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const registrations = await prisma.registration.findMany({
    where: { userId: session.user.id! },
    include: {
      trip: {
        include: {
          guide: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { trip: { date: "asc" } },
  });

  return NextResponse.json(registrations);
}

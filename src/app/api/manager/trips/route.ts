import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → trips the current user manages (as מנהל טיול / TripManager). Read-only.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const managed = await prisma.tripManager.findMany({
    where: { userId: session.user.id! },
    include: {
      trip: {
        include: {
          guide: { include: { user: { select: { name: true, image: true } } } },
          _count: { select: { registrations: true } },
        },
      },
    },
    orderBy: { trip: { date: "asc" } },
  });

  return NextResponse.json(managed.map((m) => m.trip));
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      guide: { include: { user: { select: { name: true, image: true, email: true } } } },
      guides: { include: { guide: { include: { user: { select: { name: true, image: true, email: true } } } } } },
      managers: { include: { user: { select: { name: true, email: true } } } },
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      days: { orderBy: { dayNumber: "asc" } },
    },
  });
  if (!trip) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(trip);
}

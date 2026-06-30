import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → all complaints with per-trip aggregate count (defect-pattern signal)
export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      trip: { select: { id: true, title: true, tripType: true, status: true } },
    },
  });

  // Aggregate open complaints per trip → flag patterns (≥3 = likely content defect)
  const perTrip = new Map<string, number>();
  for (const c of complaints) {
    if (c.status !== "DISMISSED") perTrip.set(c.tripId, (perTrip.get(c.tripId) ?? 0) + 1);
  }
  const withFlags = complaints.map((c) => ({ ...c, tripComplaintCount: perTrip.get(c.tripId) ?? 0 }));

  return NextResponse.json(withFlags);
}

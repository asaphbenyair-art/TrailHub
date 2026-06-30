import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withinNoRefundWindow } from "@/lib/payment";

// POST → capture all of the caller's authorized registrations whose no-refund
// window has opened. Simulated Stripe capture (AUTHORIZED → PAID).
// In production this would be a scheduled job; here it runs lazily on demand.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const authorized = await prisma.registration.findMany({
    where: { userId: session.user.id!, paymentStatus: "AUTHORIZED", status: "CONFIRMED" },
    include: { trip: { select: { date: true, cancellationPolicy: true } } },
  });

  const now = new Date();
  const toCapture = authorized.filter((r) => withinNoRefundWindow(r.trip.date, r.trip.cancellationPolicy, now));

  for (const r of toCapture) {
    await prisma.registration.update({
      where: { id: r.id },
      data: { paymentStatus: "PAID", capturedAt: now },
    });
  }

  return NextResponse.json({ captured: toCapture.length });
}

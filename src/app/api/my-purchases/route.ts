import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const purchases = await prisma.selfGuidedPurchase.findMany({
    where: { userId: session.user.id!, revoked: false },
    orderBy: { purchasedAt: "desc" },
    include: {
      trip: { select: { id: true, title: true, region: true, images: true, accessWindowDays: true, price: true, durationMin: true } },
    },
  });
  return NextResponse.json(purchases);
}

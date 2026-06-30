import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET → the guide's self-guided trips with purchase/revenue/review stats
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const guide = await prisma.guide.findUnique({ where: { userId: session.user.id! }, select: { id: true } });
  if (!guide) return NextResponse.json({ error: "מדריך לא נמצא" }, { status: 404 });

  const trips = await prisma.trip.findMany({
    where: { guideId: guide.id, tripType: "SELF_GUIDED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, region: true, images: true, price: true, status: true, accessWindowDays: true,
      _count: { select: { purchases: true, reviews: true } },
      purchases: { where: { revoked: false }, select: { price: true } },
    },
  });

  const result = trips.map((t) => ({
    id: t.id, title: t.title, region: t.region, images: t.images, price: t.price, status: t.status,
    accessWindowDays: t.accessWindowDays,
    purchaseCount: t.purchases.length,
    revenue: t.purchases.reduce((s, p) => s + p.price, 0),
    reviewCount: t._count.reviews,
  }));

  return NextResponse.json(result);
}

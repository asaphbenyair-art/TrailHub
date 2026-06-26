import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/coupons — validate a coupon code { code, tripId? }
export async function POST(req: NextRequest) {
  try {
    const { code, tripId } = await req.json();
    if (!code) return NextResponse.json({ error: "קוד חסר" }, { status: 400 });

    const coupon = await prisma.coupon.findUnique({
      where: { code: String(code).toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: "קוד קופון לא תקף" }, { status: 404 });
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "תוקף הקופון פג" }, { status: 400 });
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "הקופון נוצל במלואו" }, { status: 400 });
    }
    if (tripId && coupon.tripId && coupon.tripId !== tripId) {
      return NextResponse.json({ error: "קוד זה אינו תקף לטיול זה" }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      discountPct: coupon.discountPct,
      code: coupon.code,
    });
  } catch (err) {
    console.error("[coupons POST]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

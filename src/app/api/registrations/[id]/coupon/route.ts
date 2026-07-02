import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST → apply a discount coupon to an already-completed registration.
// Issues a (simulated) partial refund of discountPct% and lowers the total.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "נא להזין קוד" }, { status: 400 });

  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg || reg.userId !== session.user.id) return NextResponse.json({ error: "הרשמה לא נמצאה" }, { status: 404 });
  if (reg.status !== "CONFIRMED") return NextResponse.json({ error: "ניתן להחיל קוד רק על הרשמה פעילה" }, { status: 400 });
  if (/\[coupon:/.test(reg.notes ?? "")) return NextResponse.json({ error: "כבר הופעל קוד הנחה על הרשמה זו" }, { status: 400 });

  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.isActive || coupon.isComp) return NextResponse.json({ error: "קוד לא תקין" }, { status: 400 });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ error: "הקוד פג תוקף" }, { status: 400 });
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return NextResponse.json({ error: "הקוד מוצה" }, { status: 400 });
  if (coupon.tripId && coupon.tripId !== reg.tripId) return NextResponse.json({ error: "הקוד אינו תקף לטיול זה" }, { status: 400 });

  const refund = Math.round((reg.totalPrice * coupon.discountPct) / 100);
  const newTotal = Math.max(reg.totalPrice - refund, 0);

  await prisma.$transaction([
    prisma.registration.update({
      where: { id },
      data: {
        totalPrice: newTotal,
        refundedAt: new Date(),
        notes: `${reg.notes ?? ""} [coupon:${coupon.code} -₪${refund}]`.trim(),
      },
    }),
    prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ ok: true, refund, discountPct: coupon.discountPct, code: coupon.code, newTotal });
}

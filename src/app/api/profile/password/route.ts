import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "סיסמה חדשה חייבת להיות לפחות 6 תווים" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: { password: true },
    });
    if (!user) return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });

    // If user has a password, verify current password
    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json({ error: "נא להזין סיסמה נוכחית" }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ error: "סיסמה נוכחית שגויה" }, { status: 400 });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id! },
      data: { password: hashed },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile/password POST]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

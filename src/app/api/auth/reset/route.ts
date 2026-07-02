import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, token, password } = await req.json();
    if (!email || !token || !password) {
      return NextResponse.json({ error: "שדות חסרים" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים" }, { status: 400 });
    }

    const identifier = `password-reset:${email}`;
    const record = await prisma.verificationToken.findFirst({ where: { identifier, token } });

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "הקישור אינו תקף או שפג תוקפו" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email }, data: { password: hashed } });
    await prisma.verificationToken.deleteMany({ where: { identifier } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "נא להזין אימייל" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Only send when the account exists — but always return success so the
    // endpoint doesn't reveal which emails are registered.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const identifier = `password-reset:${email}`;
      // Invalidate any previous reset tokens for this address.
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      await prisma.verificationToken.create({
        data: { identifier, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
      });

      const base = process.env.AUTH_URL ?? new URL(req.url).origin;
      const resetUrl = `${base}/auth/reset?email=${encodeURIComponent(email)}&token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

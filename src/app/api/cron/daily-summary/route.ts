import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET → daily stats summary email. Triggered by Vercel Cron at ~08:00 Israel time.
// Protected by CRON_SECRET: Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`
// when the env var is set. A ?token=<secret> query param is also accepted for manual runs.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization");
  const token = new URL(req.url).searchParams.get("token");
  if (auth !== `Bearer ${secret}` && token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [newUsers, logins, totalUsers, tripsViewed, newTripRegs] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { name: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
    prisma.user.count(),
    prisma.tripView.count({ where: { createdAt: { gte: since } } }),
    prisma.registration.count({ where: { createdAt: { gte: since }, status: "CONFIRMED" } }),
  ]);

  const today = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const rows = newUsers.length
    ? newUsers.map((u) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${u.name ?? "—"}</td><td style="padding:4px 8px;border-bottom:1px solid #eee" dir="ltr">${u.email}</td></tr>`).join("")
    : `<tr><td colspan="2" style="padding:8px;color:#888">אין הרשמות חדשות ב-24 השעות האחרונות</td></tr>`;

  const stat = (label: string, value: number | string) =>
    `<div style="display:inline-block;min-width:150px;margin:6px 10px 6px 0;padding:12px 16px;background:#F0FAF5;border:1px solid #1A6B4A22;border-radius:12px">
       <div style="font-size:24px;font-weight:700;color:#1A6B4A">${value}</div>
       <div style="font-size:12px;color:#555">${label}</div>
     </div>`;

  const html = `
    <div dir="rtl" style="font-family:system-ui,Arial,sans-serif;max-width:640px;margin:auto;color:#1a1a1a">
      <h2 style="color:#1A6B4A;margin-bottom:2px">סיכום יומי — בשבילי</h2>
      <div style="color:#888;font-size:13px;margin-bottom:16px">${today}</div>
      <div>
        ${stat("משתמשים חדשים (24ש')", newUsers.length)}
        ${stat("התחברויות ייחודיות (24ש')", logins)}
        ${stat('סה"כ משתמשים רשומים', totalUsers)}
        ${stat("צפיות בטיולים (24ש')", tripsViewed)}
        ${stat("הרשמות חדשות לטיולים (24ש')", newTripRegs)}
      </div>
      <h3 style="color:#1A6B4A;margin-top:24px;margin-bottom:6px">משתמשים חדשים (24 שעות)</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr style="background:#F0FAF5"><th style="padding:6px 8px;text-align:right">שם</th><th style="padding:6px 8px;text-align:right">אימייל</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="color:#aaa;font-size:12px;margin-top:20px">דוח אוטומטי · בשבילי</div>
    </div>`;

  const to = process.env.DAILY_SUMMARY_EMAIL ?? process.env.ADMIN_EMAIL ?? "asaphbenyair@gmail.com";
  const result = await sendEmail(to, `סיכום יומי — בשבילי · ${today}`, html);

  return NextResponse.json({
    ok: true,
    emailed: result.sent,
    to,
    stats: { newUsers: newUsers.length, logins, totalUsers, tripsViewed, newTripRegs },
  });
}

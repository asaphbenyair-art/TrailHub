// Minimal pluggable email sender. Uses Resend's REST API when RESEND_API_KEY is
// set; otherwise logs to the server console (dev fallback) so flows are testable
// without an email provider configured.

/** Generic send via Resend. Returns {sent} — no-op (logs) when RESEND_API_KEY is unset. */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "בשבילי <onboarding@resend.dev>";
  if (!key) {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] would send to ${to}: ${subject}`);
    return { sent: false, dev: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return { sent: res.ok, dev: false };
  } catch {
    return { sent: false, dev: false };
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "בשבילי <onboarding@resend.dev>";
  const subject = "איפוס סיסמה — בשבילי";
  const html = `
    <div dir="rtl" style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#1A6B4A">איפוס סיסמה</h2>
      <p>קיבלנו בקשה לאיפוס הסיסמה שלך באפליקציית בשבילי. לחץ על הכפתור כדי לבחור סיסמה חדשה:</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="background:#1A6B4A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;display:inline-block">אפס סיסמה</a>
      </p>
      <p style="color:#888;font-size:13px">הקישור תקף לשעה אחת. אם לא ביקשת זאת, אפשר להתעלם מהמייל.</p>
    </div>`;

  if (!key) {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] Password-reset link for ${to}:\n${resetUrl}`);
    return { sent: false, dev: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return { sent: res.ok, dev: false };
  } catch {
    return { sent: false, dev: false };
  }
}

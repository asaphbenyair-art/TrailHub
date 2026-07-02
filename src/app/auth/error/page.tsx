"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "כתובת האימייל הזו כבר רשומה בשיטת התחברות אחרת. התחבר עם אימייל וסיסמה, או פנה לתמיכה.",
  AccessDenied: "הגישה נדחתה. נסה שוב או השתמש בחשבון אחר.",
  Configuration: "יש בעיה בהגדרות ההתחברות. נסה שוב מאוחר יותר.",
  Verification: "קישור האימות פג תוקף או כבר נוצל.",
};

function ErrorInner() {
  const params = useSearchParams();
  const code = params.get("error") ?? "";
  const msg = MESSAGES[code] ?? "אירעה שגיאה בתהליך ההתחברות.";
  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-[420px] bg-surface rounded-2xl border border-border shadow-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-2 text-red-500 flex items-center justify-center mx-auto mb-3 text-2xl">!</div>
        <h1 className="text-lg font-semibold text-fg mb-1">שגיאת התחברות</h1>
        <p className="text-sm text-fg-muted leading-relaxed mb-5">{msg}</p>
        <Link href="/auth/login" className="inline-block bg-[#1A6B4A] text-white rounded-full px-6 py-2.5 text-sm font-medium hover:bg-[#155a3e] transition-colors">
          חזרה להתחברות
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorInner />
    </Suspense>
  );
}

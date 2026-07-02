"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#1A6B4A] mb-1">TrailHub</h1>
          <p className="text-gray-500 text-sm">איפוס סיסמה</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#D6EDE3] text-[#1A6B4A] flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                אם הכתובת רשומה במערכת, שלחנו אליה קישור לאיפוס הסיסמה. בדוק את תיבת הדואר (וגם ספאם).
              </p>
              <Link href="/auth/login" className="text-sm text-[#1A6B4A] font-medium hover:underline">
                חזרה להתחברות
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-gray-500 leading-relaxed">
                הזן את כתובת האימייל שלך ונשלח לך קישור לבחירת סיסמה חדשה.
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1A6B4A] text-white rounded-full py-3 text-sm font-medium disabled:opacity-60 hover:bg-[#155a3e] transition-colors"
              >
                {loading ? "שולח..." : "שלח קישור לאיפוס"}
              </button>
              <div className="text-center">
                <Link href="/auth/login" className="text-xs text-gray-400 hover:text-gray-600">
                  חזרה להתחברות
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

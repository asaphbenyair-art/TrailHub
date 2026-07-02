"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !email || !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("הסיסמה חייבת להכיל לפחות 6 תווים"); return; }
    if (password !== confirm) { setError("הסיסמאות אינן תואמות"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 1800);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "שגיאה באיפוס הסיסמה");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#1A6B4A] mb-1">TrailHub</h1>
          <p className="text-gray-500 text-sm">בחירת סיסמה חדשה</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {invalidLink ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">הקישור אינו תקין. בקש קישור חדש לאיפוס.</p>
              <Link href="/auth/forgot" className="text-sm text-[#1A6B4A] font-medium hover:underline">לאיפוס סיסמה</Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#D6EDE3] text-[#1A6B4A] flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
              <p className="text-sm text-gray-600 mb-2">הסיסמה עודכנה בהצלחה!</p>
              <p className="text-xs text-gray-400">מעביר אותך להתחברות...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">סיסמה חדשה</label>
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  placeholder="לפחות 6 תווים"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">אימות סיסמה</label>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  placeholder="חזור על הסיסמה"
                  dir="ltr"
                />
              </div>
              <button type="button" onClick={() => setShow((v) => !v)} className="text-xs text-gray-400 text-right hover:text-gray-600">
                {show ? "הסתר סיסמה" : "הצג סיסמה"}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1A6B4A] text-white rounded-full py-3 text-sm font-medium disabled:opacity-60 hover:bg-[#155a3e] transition-colors"
              >
                {loading ? "מעדכן..." : "עדכן סיסמה"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

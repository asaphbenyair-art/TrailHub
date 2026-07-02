"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [remembered, setRemembered] = useState<{ name?: string | null; image?: string | null } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("trailhub_last_user");
      if (raw) setRemembered(JSON.parse(raw));
    } catch { /* noop */ }
    // Only offer Google if the provider is actually configured on the server.
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setGoogleAvailable(!!p?.google))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      setError("כתובת אימייל או סיסמה שגויים");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8 flex flex-col items-center">
          {remembered && (remembered.image || remembered.name) && (
            remembered.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={remembered.image} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-[#1A6B4A]/20 mb-2" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#D6EDE3] flex items-center justify-center text-2xl text-[#1A6B4A] mb-2">
                {(remembered.name ?? "?")[0]}
              </div>
            )
          )}
          <h1 className="text-2xl font-semibold text-[#1A6B4A] mb-1">TrailHub</h1>
          <p className="text-gray-500 text-sm">{remembered?.name ? `ברוך שובך, ${remembered.name}` : "ברוך הבא בחזרה"}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Google — only when configured on the server */}
          {googleAvailable && (
            <div className="p-6 pb-0">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-full py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <GoogleIcon />
                {googleLoading ? "מתחבר..." : "כניסה עם Google"}
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">או</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </div>
          )}

          {/* Credentials */}
          <form onSubmit={handleSubmit} className="px-6 pb-4 flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

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

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">סיסמה</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] pl-10"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div className="-mt-1 text-left">
              <Link href="/auth/forgot" className="text-xs text-[#1A6B4A] hover:underline">
                שכחת סיסמה?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A6B4A] text-white rounded-full py-3 text-sm font-medium mt-1 disabled:opacity-60 hover:bg-[#155a3e] transition-colors"
            >
              {loading ? "מתחבר..." : "כניסה"}
            </button>
          </form>

          <div className="px-6 pb-6 text-center text-sm text-gray-500">
            אין לך חשבון?{" "}
            <Link href="/auth/register" className="text-[#1A6B4A] font-medium hover:underline">
              הרשמה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

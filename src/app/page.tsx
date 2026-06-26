import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

export default async function Home() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-semibold text-[#1A6B4A] mb-2">TrailHub</h1>
        <p className="text-gray-500">טיולים מודרכים בישראל</p>
      </div>

      {session?.user ? (
        <div className="text-center flex flex-col items-center gap-4">
          <p className="text-gray-600">שלום, {session.user.name} 👋</p>
          <p className="text-xs text-gray-400">{session.user.email} · {role}</p>
          <div className="flex gap-3">
            <Link
              href="/trips"
              className="bg-[#1A6B4A] text-white rounded-full px-6 py-2.5 text-sm font-medium hover:bg-[#155a3e] transition-colors"
            >
              גלה טיולים
            </Link>
            {(role === "GUIDE" || role === "ADMIN") && (
              <Link
                href="/guide/dashboard"
                className="border border-[#1A6B4A] text-[#1A6B4A] rounded-full px-6 py-2.5 text-sm font-medium hover:bg-[#D6EDE3] transition-colors"
              >
                דשבורד מדריך
              </Link>
            )}
          </div>
          <SignOutButton />
        </div>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/auth/login"
            className="border border-gray-200 text-gray-600 rounded-full px-6 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            כניסה
          </Link>
          <Link
            href="/auth/register"
            className="bg-[#1A6B4A] text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-[#155a3e] transition-colors"
          >
            הרשמה
          </Link>
        </div>
      )}
    </main>
  );
}

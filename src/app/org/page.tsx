"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OrgIndexPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status !== "authenticated") return;

    const role = (session?.user as { role?: string })?.role;
    if (role === "ADMIN") { router.push("/admin"); return; }

    // Fetch user's org membership and redirect to their org
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((orgs: Array<{ id: string }>) => {
        if (Array.isArray(orgs) && orgs.length > 0) {
          router.push(`/org/${orgs[0].id}`);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"));
  }, [status, session, router]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5] flex items-center justify-center text-sm text-gray-400">
      טוען...
    </div>
  );
}

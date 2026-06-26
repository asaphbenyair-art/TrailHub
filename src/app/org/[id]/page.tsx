"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const AVATAR_COLORS = ["#854F0B", "#3B6D11", "#185FA5", "#6B3B87", "#1A6B4A"];
function avatarColor(name: string | null) {
  if (!name) return "#999";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

interface Guide {
  id: string;
  isVerified: boolean;
  user: { id: string; name: string | null; email: string };
}

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; role: string };
}

export default function OrgPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  const [guides, setGuides] = useState<Guide[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("MEMBER");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([
      fetch(`/api/organizations/${orgId}/members`).then((r) => r.json()),
      fetch("/api/organizations").then((r) => r.json()),
    ]).then(([data, orgsList]) => {
      if (data.guides) setGuides(data.guides);
      if (data.memberships) setMembers(data.memberships);
      const org = Array.isArray(orgsList) ? orgsList.find((o: { id: string; name: string }) => o.id === orgId) : null;
      if (org) setOrgName(org.name);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, orgId]);

  async function addMember() {
    if (!addEmail.trim()) return;
    setAdding(true);
    setAddError("");

    // Find user by email
    const searchRes = await fetch(`/api/admin/guides`);
    const allGuides: Guide[] = await searchRes.json();
    const found = allGuides.find((g) => g.user.email === addEmail.trim());

    if (!found) {
      setAddError("משתמש לא נמצא");
      setAdding(false);
      return;
    }

    const res = await fetch(`/api/organizations/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: found.user.id, memberRole: addRole }),
    });

    if (res.ok) {
      // Refresh
      const data = await fetch(`/api/organizations/${orgId}/members`).then((r) => r.json());
      if (data.guides) setGuides(data.guides);
      if (data.memberships) setMembers(data.memberships);
      setAddEmail("");
    } else {
      setAddError("שגיאה בהוספה");
    }
    setAdding(false);
  }

  async function removeMember(userId: string) {
    setRemovingId(userId);
    await fetch(`/api/organizations/${orgId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    setGuides((prev) => prev.filter((g) => g.user.id !== userId));
    setRemovingId(null);
  }

  if (loading) {
    return <div dir="rtl" className="min-h-screen bg-[#f5f5f5] flex items-center justify-center text-sm text-gray-400">טוען...</div>;
  }

  const isAdmin = userRole === "ADMIN";
  const myMembership = members.find((m) => m.user.id === (session?.user as { id?: string })?.id);
  const canManage = isAdmin || myMembership?.role === "ADMIN";

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div>
          <div className="text-sm font-semibold text-gray-900">{orgName || "ארגון"}</div>
          <div className="text-xs text-gray-400">ניהול Pool מדריכים</div>
        </div>
        {isAdmin && (
          <Link href="/admin" className="mr-auto text-xs text-[#1A6B4A] border border-[#1A6B4A]/30 px-3 py-1 rounded-full">
            ← אדמין
          </Link>
        )}
      </div>

      <div className="max-w-xl mx-auto p-4 flex flex-col gap-4">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1A6B4A]">{guides.length}</div>
            <div className="text-xs text-gray-500 mt-1">מדריכים בpool</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-[#185FA5]">{members.length}</div>
            <div className="text-xs text-gray-500 mt-1">חברי ארגון</div>
          </div>
        </div>

        {/* Add member form */}
        {canManage && (
          <div className="bg-white rounded-2xl p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">הוסף מדריך לארגון</div>
            <div className="flex gap-2 mb-2">
              <input
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="אימייל המדריך"
                type="email"
                dir="ltr"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
              />
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
              >
                <option value="MEMBER">מדריך</option>
                <option value="ADMIN">מנהל</option>
              </select>
            </div>
            {addError && <p className="text-xs text-red-500 mb-2">{addError}</p>}
            <button
              type="button"
              onClick={addMember}
              disabled={!addEmail.trim() || adding}
              className="w-full py-2 bg-[#1A6B4A] text-white text-sm rounded-full disabled:opacity-50"
            >
              {adding ? "מוסיף..." : "הוסף"}
            </button>
          </div>
        )}

        {/* Guide pool */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Pool מדריכים ({guides.length})
          </div>
          {guides.length === 0 && (
            <div className="bg-white rounded-2xl py-10 text-center text-sm text-gray-400">
              אין מדריכים בארגון עדיין
            </div>
          )}
          {guides.map((g) => {
            const membership = members.find((m) => m.user.id === g.user.id);
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-2 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                  style={{ background: avatarColor(g.user.name) }}
                >
                  {initials(g.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{g.user.name ?? "—"}</div>
                  <div className="text-[11px] text-gray-500">{g.user.email}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {g.isVerified && (
                      <span className="text-[10px] text-[#1A6B4A] font-semibold">✓ מאושר</span>
                    )}
                    {membership?.role === "ADMIN" && (
                      <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded-full font-semibold">מנהל ארגון</span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => removeMember(g.user.id)}
                    disabled={removingId === g.user.id}
                    className="text-[11px] text-red-500 border border-red-200 px-2.5 py-1 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {removingId === g.user.id ? "..." : "הסר"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

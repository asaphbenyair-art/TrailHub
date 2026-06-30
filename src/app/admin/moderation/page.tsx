"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface AdminUser {
  id: string; name: string | null; email: string; role: string; createdAt: string;
  _count: { registrations: number; complaints: number };
  guide: { id: string; _count: { trips: number } } | null;
}
interface Complaint {
  id: string; category: string; body: string; status: string; createdAt: string;
  tripComplaintCount: number;
  user: { name: string | null; email: string };
  trip: { id: string; title: string; tripType: string; status: string };
}

export default function AdminModerationPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<"complaints" | "users">("complaints");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/auth/login"); return; }
    if ((session.user as { role?: string }).role !== "ADMIN") { setForbidden(true); setLoading(false); return; }
    Promise.all([
      fetch("/api/admin/complaints").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([c, u]) => {
      setComplaints(Array.isArray(c) ? c : []);
      setUsers(Array.isArray(u) ? u : []);
    }).finally(() => setLoading(false));
  }, [session, status, router]);

  async function setComplaintStatus(id: string, newStatus: string) {
    await fetch(`/api/admin/complaints/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
  }

  async function removeTrip(tripId: string) {
    const reason = window.prompt("סיבת הסרת הטיול:");
    if (reason === null) return;
    const res = await fetch(`/api/admin/trips/${tripId}/remove`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) window.alert("הטיול הוסר מהפרסום");
  }

  if (forbidden) return <div dir="rtl" className="min-h-screen flex items-center justify-center text-gray-500 text-sm">אין לך הרשאת מנהל</div>;
  if (loading) return <div dir="rtl" className="min-h-screen flex items-center justify-center text-gray-400 text-sm">טוען...</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5] py-4 px-3">
      <div className="max-w-[640px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← אישורים</Link>
          <h1 className="text-base font-semibold text-gray-900">ניהול פלטפורמה</h1>
        </div>

        <div className="bg-white rounded-xl overflow-hidden flex shadow-sm mb-3">
          {([["complaints", `תלונות (${complaints.filter((c) => c.status === "OPEN").length})`], ["users", `משתמשים (${users.length})`]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === k ? "border-[#1A6B4A] text-[#1A6B4A]" : "border-transparent text-gray-400"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "complaints" && (
          <div className="flex flex-col gap-2">
            {complaints.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">אין תלונות</div>}
            {complaints.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/trips/${c.trip.id}`} className="text-sm font-medium text-gray-900 hover:underline">{c.trip.title}</Link>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    c.status === "OPEN" ? "bg-[#FEF3C7] text-[#92400E]" : c.status === "RESOLVED" ? "bg-[#D6EDE3] text-[#0F5038]" : "bg-gray-100 text-gray-500"}`}>
                    {c.status === "OPEN" ? "פתוח" : c.status === "RESOLVED" ? "טופל" : "נדחה"}
                  </span>
                </div>
                {c.tripComplaintCount >= 3 && (
                  <div className="text-[11px] text-[#C0392B] bg-[#FADBD8] rounded-lg px-2 py-1 mb-2">
                    ⚠ {c.tripComplaintCount} תלונות על אותו טיול — ייתכן פגם בתוכן
                  </div>
                )}
                <div className="text-xs text-gray-600 mb-1">{c.body}</div>
                <div className="text-[10px] text-gray-400 mb-2">{c.user.name ?? c.user.email} · {c.category}</div>
                <div className="flex gap-2 flex-wrap">
                  {c.status === "OPEN" && (
                    <>
                      <button type="button" onClick={() => setComplaintStatus(c.id, "RESOLVED")}
                        className="text-[11px] text-[#0F5038] border border-[#1A6B4A]/30 rounded-full px-3 py-1 hover:bg-[#D6EDE3]">סמן כטופל</button>
                      <button type="button" onClick={() => setComplaintStatus(c.id, "DISMISSED")}
                        className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">דחה</button>
                    </>
                  )}
                  <button type="button" onClick={() => removeTrip(c.trip.id)}
                    className="text-[11px] text-[#C0392B] border border-[#C0392B]/30 rounded-full px-3 py-1 hover:bg-[#FADBD8]">הסר טיול מפרסום</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{u.name ?? "—"} <span className="text-[10px] text-gray-400">{u.role}</span></div>
                  <div className="text-[11px] text-gray-400">{u.email}</div>
                </div>
                <div className="text-[10px] text-gray-400 text-left">
                  {u.guide ? `${u.guide._count.trips} טיולים · ` : ""}{u._count.registrations} הרשמות
                  {u._count.complaints > 0 ? ` · ${u._count.complaints} תלונות` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

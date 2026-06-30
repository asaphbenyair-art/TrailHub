import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip } from "@/lib/tripAccess";

// POST → move a draft to published, choosing Public or Private
// (replaces the old institutional submit-for-approval flow)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageTrip(id, session.user.id!, (session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { visibility } = await req.json();
  const vis = visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC";

  await prisma.trip.update({
    where: { id },
    data: { status: "OPEN", visibility: vis },
  });
  return NextResponse.json({ ok: true, visibility: vis });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST → log a trip view (fire-and-forget, for the daily summary "trips viewed" metric).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    await prisma.tripView.create({ data: { tripId: id, userId: session?.user?.id ?? null } });
  } catch {
    // best-effort; never block the page
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id! },
    include: { trip: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.user.id!, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function canManage(orgId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role === "ADMIN") return session;

  const membership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: session.user.id! } },
  });
  if (membership?.role === "ADMIN") return session;
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await canManage(id);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const guides = await prisma.guide.findMany({
    where: { organizationId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId: id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json({ guides, memberships });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgId } = await params;
  const session = await canManage(orgId);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { userId, memberRole } = await req.json();
  if (!userId) return NextResponse.json({ error: "חסר userId" }, { status: 400 });

  // Add as org membership
  const membership = await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    create: { organizationId: orgId, userId, role: memberRole ?? "MEMBER" },
    update: { role: memberRole ?? "MEMBER" },
  });

  // If user is a guide, link them to the org
  await prisma.guide.updateMany({
    where: { userId },
    data: { organizationId: orgId },
  });

  return NextResponse.json(membership, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgId } = await params;
  const session = await canManage(orgId);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "חסר userId" }, { status: 400 });

  await prisma.organizationMembership.deleteMany({
    where: { organizationId: orgId, userId },
  });

  // Unlink guide from org
  await prisma.guide.updateMany({
    where: { userId, organizationId: orgId },
    data: { organizationId: null },
  });

  return NextResponse.json({ ok: true });
}
